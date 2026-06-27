/* Cloud connectors: Google Drive (GIS token flow + Picker) and OneDrive (MSAL SPA + Graph).
   Pure browser, no backend. Loads each vendor SDK on demand. Exposes window.Cloud. */
'use strict';
(function(){
const C = window.MD_CONFIG || {};
const load = src => new Promise((ok,err)=>{ const s=document.createElement("script"); s.src=src; s.async=true; s.onload=ok; s.onerror=()=>err(new Error("load "+src)); document.head.appendChild(s); });

/* ============ GOOGLE DRIVE ============ */
let gToken=null, gReady=false, gTokenClient=null, gTokenExp=0;
const G_TOKEN_KEY="mdpwa_gtoken", G_CONSENT_KEY="mdpwa_gconsented";
// Bump when the requested OAuth scope changes. A token cached under an older
// scope version is discarded so a fresh consent fires for the new scope.
const G_SCOPE_VER="3-drive-rw";
// Restore a persisted token across cold starts. GIS access tokens last ~1 hr and
// there is no refresh token without a backend, so we cache the token + its expiry
// and reuse it silently until it lapses. This is why sign-in stops happening on
// every launch. Renewal after expiry is silent (prompt:"") once consent is on file.
try{
  const saved=JSON.parse(localStorage.getItem(G_TOKEN_KEY)||"null");
  if(saved && saved.token && saved.exp && saved.exp > Date.now()+60000 && saved.scope===G_SCOPE_VER){ gToken=saved.token; gTokenExp=saved.exp; }
  else if(saved && saved.scope!==G_SCOPE_VER){ try{ localStorage.removeItem(G_TOKEN_KEY); localStorage.removeItem(G_CONSENT_KEY); }catch(e){} }
}catch(e){}
function gClearToken(){ gToken=null; gTokenExp=0; try{ localStorage.removeItem(G_TOKEN_KEY); }catch(e){} }
async function gInit(){
  if(gReady){ if(gToken) try{ gapi.client.setToken({access_token:gToken}); }catch(e){} return; }
  if(!C.GOOGLE_CLIENT_ID) throw new Error("Google not configured");
  await load("https://accounts.google.com/gsi/client");          // GIS
  await load("https://apis.google.com/js/api.js");                // gapi (picker + drive)
  await new Promise(r=>gapi.load("client:picker", r));
  await gapi.client.init({ apiKey:C.GOOGLE_API_KEY, discoveryDocs:["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"] });
  if(gToken) gapi.client.setToken({access_token:gToken});         // hand the restored token to gapi
  gTokenClient = google.accounts.oauth2.initTokenClient({
    // Full drive scope: browse, open, AND save back to ANY file in the user's
    // Drive (edit in place). drive.file alone could only write app-created files,
    // so editing a browsed file failed with 403 ("Cloud save failed"). This is the
    // permission "edit my Drive files" actually requires.
    client_id:C.GOOGLE_CLIENT_ID,
    scope:"https://www.googleapis.com/auth/drive",
    callback:()=>{}   // set per-request
  });
  gReady=true;
}
// opts.interactive=true (manual Save / user tap): NO timeout — user may take a while to sign in.
// opts.interactive=false (background auto-save): short timeout so it can't hang the indicator.
function gAuth(opts){
  opts=opts||{};
  // Reuse the cached token only while it is still valid (60s safety margin).
  if(gToken && gTokenExp > Date.now()+60000 && !opts.force) return Promise.resolve(gToken);
  const stale = gToken;                          // an expired token still implies prior consent
  if(stale) gClearToken();
  return new Promise((resolve,reject)=>{
    let done=false, timer=null;
    const finish=fn=>(...a)=>{ if(done) return; done=true; if(timer) clearTimeout(timer); fn(...a); };
    const ok=finish(resolve), bad=finish(reject);
    gTokenClient.callback=(resp)=>{
      if(resp.error) return bad(new Error(resp.error));
      gToken=resp.access_token;
      // expires_in is seconds; persist token + absolute expiry so a cold start can reuse it
      const ttl=(parseInt(resp.expires_in,10)||3600)*1000;
      gTokenExp=Date.now()+ttl;
      gapi.client.setToken({access_token:gToken});
      try{ localStorage.setItem(G_TOKEN_KEY, JSON.stringify({token:gToken, exp:gTokenExp, scope:G_SCOPE_VER})); localStorage.setItem(G_CONSENT_KEY,"1"); }catch(e){}
      ok(gToken);
    };
    gTokenClient.error_callback=(err)=>bad(new Error((err&&err.type)||"auth_failed"));
    // only background (non-interactive) calls get a timeout; interactive sign-in waits for the user
    if(!opts.interactive) timer=setTimeout(()=>bad(new Error("auth_timeout")), 12000);
    // Silent renewal (prompt:"") once consent is on file or we are just refreshing an expired token.
    // Full consent screen only on the very first sign-in.
    let consented=stale; try{ consented = consented || localStorage.getItem(G_CONSENT_KEY)==="1"; }catch(e){}
    gTokenClient.requestAccessToken({prompt: consented?"":"consent"});
  });
}
// open: show Google Picker, return {id,name,content}
async function gOpen(){
  await gInit(); await gAuth({interactive:true});
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
// list: browse a Drive FOLDER (default root). Returns folders + markdown files,
// folders first, each marked isFolder. No Picker, no iframe, no third-party
// cookies, so it works on iOS. drive.readonly scope sees the whole Drive.
// folderId defaults to "root".
async function gList(folderId){
  await gInit(); await gAuth({interactive:true});
  const parent = folderId || "root";
  const q = `'${parent}' in parents and trashed=false and (`+
    `mimeType='application/vnd.google-apps.folder' or `+
    `mimeType='text/markdown' or mimeType='text/plain' or name contains '.md')`;
  const run=()=>gapi.client.request({ path:"/drive/v3/files", method:"GET", params:{
    q, orderBy:"folder,name", pageSize:200,
    fields:"files(id,name,modifiedTime,mimeType,parents)", spaces:"drive" } });
  let res;
  try{ res=await run(); }
  catch(e){ const code=e&&(e.status||(e.result&&e.result.error&&e.result.error.code));
    if(code===401){ gClearToken(); await gAuth({interactive:true,force:true}); res=await run(); } else throw e; }
  return (res.result.files||[]).map(f=>({
    id:f.id, name:f.name, modified:f.modifiedTime,
    isFolder:f.mimeType==="application/vnd.google-apps.folder"
  }));
}
// resolve a folder's parent id (for the "Up" navigation). Returns "root" at top.
async function gParent(folderId){
  if(!folderId || folderId==="root") return null;
  await gInit(); await gAuth({interactive:true});
  try{ const m=await gapi.client.request({path:`/drive/v3/files/${folderId}`,params:{fields:"parents"}});
    const p=m.result.parents; return (p&&p.length)?p[0]:"root"; }
  catch(e){ return "root"; }
}
// get: download one file's content by id (token auth, no cookies)
async function gGet(id){
  await gInit(); await gAuth({interactive:true});
  const r=await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`,
    {headers:{Authorization:"Bearer "+gToken}});
  if(!r.ok) throw new Error("Drive download HTTP "+r.status);
  const text=await r.text();
  // fetch the name separately (files.list already had it, but get-by-id is safe)
  let name="Untitled.md";
  try{ const m=await gapi.client.request({path:`/drive/v3/files/${id}`,params:{fields:"name"}}); name=m.result.name||name; }catch(e){}
  return {provider:"gdrive", id, name, content:text};
}
// save: update existing file (by id) or create new in Drive
async function gSave(name, content, fileId, interactive){
  await gInit(); await gAuth({interactive:!!interactive});
  const meta={name}; const boundary="-------mdpwa"+Math.abs(name.length*997).toString(36);
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n`+
    `--${boundary}\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n--${boundary}--`;
  const path = fileId ? `/upload/drive/v3/files/${fileId}` : `/upload/drive/v3/files`;
  const method = fileId ? "PATCH" : "POST";
  const doReq = ()=>gapi.client.request({ path, method, params:{uploadType:"multipart"},
    headers:{"Content-Type":`multipart/related; boundary=${boundary}`}, body });
  let res;
  try{ res = await doReq(); }
  catch(e){
    // A persisted token can be revoked or invalid server-side (401). Clear it and
    // re-auth once, so a dead cached token never silently breaks saving.
    const code = e && (e.status || (e.result&&e.result.error&&e.result.error.code));
    if(code===401){ gClearToken(); await gAuth({interactive:!!interactive, force:true}); res = await doReq(); }
    else throw e;
  }
  return { id:res.result.id, name:res.result.name||name };
}
// Force a clean re-auth (revokes the cached token). Exposed for a manual "sign out".
function gSignOut(){
  try{ if(gToken && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(gToken,()=>{}); }catch(e){}
  gClearToken(); try{ localStorage.removeItem(G_CONSENT_KEY); }catch(e){}
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
  google:{ configured:()=>!!C.GOOGLE_CLIENT_ID, list:gList, parent:gParent, get:gGet, open:gOpen, save:gSave, signOut:gSignOut, signedIn:()=>!!(gToken && gTokenExp>Date.now()) },
  onedrive:{ configured:()=>!!C.MS_CLIENT_ID, list:msList, get:msGet, save:msSave }
};
})();
