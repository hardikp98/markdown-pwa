/* Cloud connectors: Google Drive (GIS token flow + Picker) and OneDrive (MSAL SPA + Graph).
   Pure browser, no backend. Loads each vendor SDK on demand. Exposes window.Cloud. */
'use strict';
(function(){
const C = window.MD_CONFIG || {};
const load = src => new Promise((ok,err)=>{ const s=document.createElement("script"); s.src=src; s.async=true; s.onload=ok; s.onerror=()=>err(new Error("load "+src)); document.head.appendChild(s); });

/* ============ GOOGLE DRIVE ============ */
let gToken=null, gReady=false, gTokenClient=null;
async function gInit(){
  if(gReady) return;
  if(!C.GOOGLE_CLIENT_ID) throw new Error("Google not configured");
  await load("https://accounts.google.com/gsi/client");          // GIS
  await load("https://apis.google.com/js/api.js");                // gapi (picker + drive)
  await new Promise(r=>gapi.load("client:picker", r));
  await gapi.client.init({ apiKey:C.GOOGLE_API_KEY, discoveryDocs:["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] });
  gTokenClient = google.accounts.oauth2.initTokenClient({
    client_id:C.GOOGLE_CLIENT_ID, scope:"https://www.googleapis.com/auth/drive.file",
    callback:()=>{}   // set per-request
  });
  gReady=true;
}
function gAuth(opts){
  // if we already hold a token, reuse it silently (no popup, can't hang from a timer)
  if(gToken && !(opts&&opts.force)) return Promise.resolve(gToken);
  return new Promise((resolve,reject)=>{
    let done=false;
    const finish=fn=>(...a)=>{ if(done) return; done=true; fn(...a); };
    const ok=finish(resolve), bad=finish(reject);
    gTokenClient.callback=(resp)=>{ if(resp.error) return bad(new Error(resp.error)); gToken=resp.access_token; gapi.client.setToken({access_token:gToken}); ok(gToken); };
    gTokenClient.error_callback=(err)=>bad(new Error((err&&err.type)||"auth_failed"));
    // safety net: if neither callback fires (popup blocked from timer), don't hang forever
    setTimeout(()=>bad(new Error("auth_timeout")), 12000);
    gTokenClient.requestAccessToken({prompt: gToken?"":"consent"});
  });
}
// open: show Google Picker, return {id,name,content}
async function gOpen(){
  await gInit(); await gAuth();
  return new Promise((resolve,reject)=>{
    const view=new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMode(google.picker.DocsViewMode.LIST)
      .setMimeTypes("text/plain,text/markdown,text/x-markdown,application/octet-stream")
      .setSelectFolderEnabled(false);
    const builder=new google.picker.PickerBuilder()
      .setOAuthToken(gToken).setDeveloperKey(C.GOOGLE_API_KEY).addView(view)
      .setCallback(data=>{
        const action=data[google.picker.Response.ACTION] || data.action;
        if(action===google.picker.Action.PICKED){
          const docs=data[google.picker.Response.DOCUMENTS] || data.docs;
          const f=docs[0];
          // resolve the file id across possible response shapes
          const fid = f.id || f[google.picker.Document.ID] || f.docid || f.fileId;
          const fname = f.name || f[google.picker.Document.NAME] || "Untitled.md";
          if(!fid){ reject(new Error("Picker returned no file id. Keys: "+Object.keys(f).join(","))); return; }
          fetch(`https://www.googleapis.com/drive/v3/files/${fid}?alt=media&supportsAllDrives=true`,{headers:{Authorization:"Bearer "+gToken}})
            .then(r=>{ if(!r.ok) throw new Error("Drive download HTTP "+r.status+" (id="+fid+")"); return r.text(); })
            .then(text=>resolve({provider:"gdrive", id:fid, name:fname, content:text}))
            .catch(reject);
        } else if(action===google.picker.Action.CANCEL){ resolve(null); }
      });
    // CRITICAL for drive.file scope: app id (= project number) makes a Picker selection
    // grant this app access to the chosen file; without it, downloads 404.
    if(C.GOOGLE_APP_ID) builder.setAppId(C.GOOGLE_APP_ID);
    const picker=builder.build();
    picker.setVisible(true);
  });
}
// save: update existing file (by id) or create new in Drive
async function gSave(name, content, fileId){
  await gInit(); await gAuth();
  const meta={name}; const boundary="-------mdpwa"+Math.abs(name.length*997).toString(36);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`+
    `--${boundary}\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n--${boundary}--`;
  const path = fileId ? `/upload/drive/v3/files/${fileId}` : `/upload/drive/v3/files`;
  const method = fileId ? "PATCH" : "POST";
  const res = await gapi.client.request({ path, method, params:{uploadType:"multipart"},
    headers:{"Content-Type":`multipart/related; boundary=${boundary}`}, body });
  return { id:res.result.id, name:res.result.name||name };
}

/* ============ ONEDRIVE ============ */
let msApp=null, msAccount=null;
async function msInit(){
  if(msApp) return;
  if(!C.MS_CLIENT_ID) throw new Error("OneDrive not configured");
  await load("https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js");
  // the MSAL library defines a global `msal` namespace
  msApp = new window.msal.PublicClientApplication({
    auth:{ clientId:C.MS_CLIENT_ID, authority:C.MS_AUTHORITY, redirectUri:location.origin+location.pathname },
    cache:{ cacheLocation:"localStorage" }
  });
  await msApp.initialize();
  const resp=await msApp.handleRedirectPromise();
  if(resp&&resp.account) msAccount=resp.account;
  else { const a=msApp.getAllAccounts(); if(a.length) msAccount=a[0]; }
}
async function msTok(){
  const req={scopes:["Files.ReadWrite","User.Read"]};
  if(msAccount){ try{ const r=await msApp.acquireTokenSilent({...req,account:msAccount}); return r.accessToken; }catch{} }
  // popup is more reliable than redirect inside a standalone PWA
  const r=await msApp.acquireTokenPopup(req); msAccount=r.account; return r.accessToken;
}
async function graph(path, token, opts={}){
  const r=await fetch("https://graph.microsoft.com/v1.0"+path,{...opts,headers:{Authorization:"Bearer "+token,...(opts.headers||{})}});
  if(!r.ok) throw new Error("Graph "+r.status+" "+(await r.text()).slice(0,200));
  return r;
}
// open: list .md files in OneDrive root recent, let user pick via a simple list
async function msList(){
  await msInit(); const t=await msTok();
  const r=await graph("/me/drive/root/search(q='.md')?$top=50&$select=id,name,lastModifiedDateTime,file",t);
  const d=await r.json();
  return (d.value||[]).filter(x=>x.file).map(x=>({id:x.id,name:x.name,modified:x.lastModifiedDateTime}));
}
async function msGet(id){
  await msInit(); const t=await msTok();
  const r=await graph(`/me/drive/items/${id}/content`,t);
  const content=await r.text();
  const meta=await (await graph(`/me/drive/items/${id}?$select=name`,t)).json();
  return {provider:"onedrive", id, name:meta.name, content};
}
async function msSave(name, content, itemId){
  await msInit(); const t=await msTok();
  const path = itemId ? `/me/drive/items/${itemId}/content`
                      : `/me/drive/root:/${encodeURIComponent(name)}:/content`;
  const r=await graph(path, t, {method:"PUT", headers:{"Content-Type":"text/markdown"}, body:content});
  const d=await r.json();
  return { id:d.id, name:d.name||name };
}

window.Cloud = {
  google:{ configured:()=>!!C.GOOGLE_CLIENT_ID, open:gOpen, save:gSave },
  onedrive:{ configured:()=>!!C.MS_CLIENT_ID, list:msList, get:msGet, save:msSave }
};
})();
