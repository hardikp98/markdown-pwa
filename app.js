/* Markdown PWA — fully client-side. Docs live in localStorage; import/export via the iOS Files app
   (which exposes Google Drive, OneDrive, iCloud). No server. */
'use strict';
const $ = s => document.querySelector(s);
const SVG = p => `<svg viewBox="0 0 24 24">${p}</svg>`;
const ic = {
  menu:SVG('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  docs:SVG('<path d="M4 4h9l2 2h5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/>'),
  save:SVG('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
  undo:SVG('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>'),
  redo:SVG('<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h1"/>'),
  h1:SVG('<path d="M4 6v12M12 6v12M4 12h8"/><path d="M17 10l3-2v10"/>'),
  h2:SVG('<path d="M4 6v12M11 6v12M4 12h7"/><path d="M16 9a2 2 0 1 1 4 0c0 1.5-1.5 2.5-4 5h4"/>'),
  bold:SVG('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>'),
  italic:SVG('<path d="M19 5h-6M14 19H8M15 5L9 19"/>'),
  strike:SVG('<path d="M5 12h14"/><path d="M16 7a4 3 0 0 0-4-2c-2.5 0-4 1.3-4 3 0 1.2.8 2 2 2.5M8 17a4 3 0 0 0 4 2c2.5 0 4-1.3 4-3"/>'),
  highlight:SVG('<path d="M9 11l-4 4v3h3l4-4"/><path d="M14 6l4 4-7 7-4-4z"/><path d="M16 4l4 4"/>'),
  code:SVG('<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>'),
  ul:SVG('<path d="M8 6h13M8 12h13M8 18h13"/><circle class="fillc" cx="3.5" cy="6" r="1.3"/><circle class="fillc" cx="3.5" cy="12" r="1.3"/><circle class="fillc" cx="3.5" cy="18" r="1.3"/>'),
  ol:SVG('<path d="M10 6h11M10 12h11M10 18h11"/><path d="M4 4v4M3 8h2M3 12h2l-2 3h2"/>'),
  task:SVG('<rect x="3" y="4" width="7" height="7" rx="1.5"/><path d="M5 7.5l1.3 1.3L9 6"/><path d="M14 6h7M14 12h7M3 14h7v6H3z"/><path d="M14 18h7"/>'),
  quote:SVG('<path class="fillc" d="M7 7c-2 0-3 1.6-3 3.5 0 1.7 1.2 3 2.8 3 .3 0 .5 0 .7-.1-.3 1.2-1.3 2-2.5 2.2l.3 1.3c2.1-.4 3.7-2.2 3.7-4.9C9 9 8.2 7 7 7z"/>'),
  link:SVG('<path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1"/>'),
  table:SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>'),
  codeblk:SVG('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 9l-2 3 2 3M15 9l2 3-2 3"/>'),
  trash:SVG('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>'),
  plus:SVG('<path d="M12 5v14M5 12h14"/>'),
  download:SVG('<path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/>'),
  share:SVG('<path d="M12 3v13"/><path d="M8 7l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/>'),
  theme:SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  gdrive:SVG('<path class="fillc" d="M8.3 4l-5.1 8.9 2.6 4.6h10.3l-2.6-4.6H10.9L8.3 4z" opacity=".0"/><path d="M8.3 4l-5.1 8.9h5.1L13.4 4z"/><path d="M3.2 12.9l2.6 4.6h10.3l-2.6-4.6z"/><path d="M21 12.9L15.9 4h-5.1l5.1 8.9z"/>'),
  onedrive:SVG('<path d="M7 18h10a3 3 0 0 0 .5-5.96A4.5 4.5 0 0 0 8.6 9.2 3.4 3.4 0 0 0 7 18z"/>')
};

/* ---------- storage ---------- */
const KEY="mdpwa.docs", AKEY="mdpwa.active";
function loadDocs(){ try{ return JSON.parse(localStorage.getItem(KEY)||"[]"); }catch{ return []; } }
function saveDocs(d){ localStorage.setItem(KEY, JSON.stringify(d)); }
let docs = loadDocs();
let activeId = localStorage.getItem(AKEY) || null;
function uid(){ return "d"+Math.abs(Date.now()^(performance.now()*1000|0)).toString(36); }
function active(){ return docs.find(d=>d.id===activeId); }

const src=$("#src"), pv=$("#pv"), docname=$("#docname");

/* ---------- markdown render ---------- */
marked.setOptions({gfm:true,breaks:false,
  highlight:(code,lang)=>{ try{ return (lang&&hljs.getLanguage(lang))?hljs.highlight(code,{language:lang}).value:hljs.highlightAuto(code).value; }catch{ return code; } }});
marked.use({extensions:[{name:"mark",level:"inline",
  start(s){return s.indexOf("==");},
  tokenizer(s){const m=/^==(?=\S)([\s\S]*?\S)==/.exec(s); if(m) return {type:"mark",raw:m[0],text:m[1]};},
  renderer(t){return `<mark>${this.parser.parseInline(this.lexer.inlineTokens(t.text))}</mark>`;}}]});
function render(){ pv.innerHTML = DOMPurify.sanitize(marked.parse(src.value||"")); }

/* ---------- doc lifecycle ---------- */
function setActive(id){
  activeId=id; localStorage.setItem(AKEY,id);
  const d=active(); if(!d) return;
  src.value=d.content; render();
  docname.textContent=d.name||"Untitled";
}
function newDoc(name,content,provider,cloudId){
  const d={id:uid(),name:name||"Untitled.md",content:content||"",updated:Date.now(),
           provider:provider||"local", cloudId:cloudId||null};
  docs.unshift(d); saveDocs(docs); setActive(d.id); return d;
}
// if a cloud file with same id already imported, reuse it; else create
function adoptCloudDoc(provider, cloudId, name, content){
  let d=docs.find(x=>x.provider===provider && x.cloudId===cloudId);
  if(d){ d.content=content; d.updated=Date.now(); saveDocs(docs); setActive(d.id); }
  else d=newDoc(name,content,provider,cloudId);
  return d;
}
function persistActive(){ const d=active(); if(d){ d.content=src.value; d.updated=Date.now(); saveDocs(docs); } }

let saveTimer=null;
src.addEventListener("input",()=>{
  render();
  clearTimeout(saveTimer); saveTimer=setTimeout(persistActive,400);  // autosave to localStorage
});

/* ---------- status toast ---------- */
let toastTimer=null;
function toast(msg){ const s=$("#status"); s.textContent=msg; s.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>s.classList.remove("show"),1600); }

/* ---------- edit/preview toggle ---------- */
$("#segEdit").onclick=()=>{ document.body.classList.remove("view-preview"); $("#segEdit").classList.add("active"); $("#segView").classList.remove("active"); };
$("#segView").onclick=()=>{ render(); document.body.classList.add("view-preview"); $("#segView").classList.add("active"); $("#segEdit").classList.remove("active"); };

/* ---------- formatting toolbar ---------- */
function getSel(){ return {s:src.selectionStart,e:src.selectionEnd,val:src.value}; }
function setSel(a,b){ src.focus(); src.selectionStart=a; src.selectionEnd=(b===undefined?a:b); }
function fireInput(){ src.dispatchEvent(new Event("input")); }
function wrap(b,a){ const{s,e,val}=getSel(); const sel=val.slice(s,e);
  src.value=val.slice(0,s)+b+sel+a+val.slice(e); setSel(s+b.length,e+b.length); fireInput(); }
function linePrefix(p,num){ const{s,e,val}=getSel();
  const ls=val.lastIndexOf("\n",s-1)+1; let le=val.indexOf("\n",e); if(le<0)le=val.length;
  const out=val.slice(ls,le).split("\n").map((l,i)=>(num?`${i+1}. `:p)+l).join("\n");
  src.value=val.slice(0,ls)+out+val.slice(le); setSel(ls,ls+out.length); fireInput(); }
function insert(t,back){ const{s,val}=getSel(); src.value=val.slice(0,s)+t+val.slice(src.selectionEnd);
  setSel(s+t.length-(back||0)); fireInput(); }
const ACT={
  undo:()=>{src.focus();document.execCommand("undo");fireInput();},
  redo:()=>{src.focus();document.execCommand("redo");fireInput();},
  h1:()=>linePrefix("# "),h2:()=>linePrefix("## "),
  bold:()=>wrap("**","**"),italic:()=>wrap("_","_"),strike:()=>wrap("~~","~~"),
  highlight:()=>wrap("==","=="),code:()=>wrap("`","`"),
  ul:()=>linePrefix("- "),ol:()=>linePrefix("",true),task:()=>linePrefix("- [ ] "),quote:()=>linePrefix("> "),
  link:()=>{const{s,e,val}=getSel();const sel=val.slice(s,e)||"text";insert(`[${sel}](url)`,4);},
  table:()=>insert("\n| A | B |\n| --- | --- |\n| 1 | 2 |\n"),
  codeblk:()=>insert("\n```\n\n```\n",5)
};
const TOOLS=[["undo"],["redo"],["sep"],["h1"],["h2"],["bold"],["italic"],["strike"],["highlight"],["code"],["sep"],["ul"],["ol"],["task"],["quote"],["sep"],["link"],["table"],["codeblk"]];
$("#tools").innerHTML = TOOLS.map(t=> t[0]==="sep" ? '<span class="sep"></span>' : `<button data-act="${t[0]}">${ic[t[0]]}</button>`).join("");
$("#tools").addEventListener("click",e=>{ const b=e.target.closest("[data-act]"); if(b&&ACT[b.dataset.act]) ACT[b.dataset.act](); });

/* ---------- top bar icons ---------- */
$("#menuBtn").innerHTML=ic.menu; $("#docsBtn").innerHTML=ic.docs; $("#saveBtn").innerHTML=ic.save;

/* ---------- sheets ---------- */
const scrim=$("#scrim");
function openSheet(el){ persistActive(); scrim.classList.add("open"); el.classList.add("open"); if(el.id==="docsSheet") renderDocList(); }
function closeSheets(){ scrim.classList.remove("open"); document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("open")); }
scrim.onclick=closeSheets;
$("#docsBtn").onclick=()=>openSheet($("#docsSheet"));
$("#menuBtn").onclick=()=>openSheet($("#menuSheet"));

function renderDocList(){
  const list=$("#docList");
  const fmt=ts=>{ const d=new Date(ts); return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+" "+d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}); };
  let html=`<div class="docItem" id="newDocBtn">${ic.plus}<span>New document</span></div>`;
  if(window.Cloud && Cloud.google.configured())
    html+=`<div class="docItem" id="gOpenBtn">${ic.gdrive}<span>Open from Google Drive…</span></div>`;
  if(window.Cloud && Cloud.onedrive.configured())
    html+=`<div class="docItem" id="msOpenBtn">${ic.onedrive}<span>Open from OneDrive…</span></div>`;
  html+=`<div class="docItem" id="importBtn">${ic.download}<span>Import from Files…</span><span class="meta">iCloud · any</span></div>`;
  docs.forEach(d=>{
    const tag = d.provider==="gdrive"?" · Drive" : d.provider==="onedrive"?" · OneDrive" : "";
    html+=`<div class="docItem" data-id="${d.id}"><span>${(d.name||"Untitled")}</span><span class="meta">${fmt(d.updated)}${tag}</span><span class="dx" data-del="${d.id}">${ic.trash}</span></div>`;
  });
  list.innerHTML=html;
  $("#newDocBtn").onclick=()=>{ const n=prompt("Name:","Untitled.md"); if(n!==null){ newDoc(n||"Untitled.md",""); closeSheets(); $("#segEdit").click(); src.focus(); } };
  $("#importBtn").onclick=()=>$("#fileInput").click();
  const gb=$("#gOpenBtn"); if(gb) gb.onclick=openFromGoogle;
  const mb=$("#msOpenBtn"); if(mb) mb.onclick=openFromOneDrive;
  list.querySelectorAll("[data-id]").forEach(el=>el.onclick=(e)=>{
    if(e.target.closest("[data-del]")) return;
    setActive(el.dataset.id); closeSheets();
  });
  list.querySelectorAll("[data-del]").forEach(el=>el.onclick=(e)=>{
    e.stopPropagation(); const id=el.dataset.del;
    if(!confirm("Delete this document?")) return;
    docs=docs.filter(d=>d.id!==id); saveDocs(docs);
    if(activeId===id){ if(docs.length) setActive(docs[0].id); else newDoc("Untitled.md",""); }
    renderDocList();
  });
}

/* ---------- import (from Files app: Drive/OneDrive/iCloud) ---------- */
$("#fileInput").addEventListener("change",e=>{
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=()=>{ newDoc(f.name,r.result); closeSheets(); toast("Imported "+f.name); };
  r.readAsText(f); e.target.value="";
});

/* ---------- open from clouds ---------- */
async function openFromGoogle(){
  try{ toast("Opening Google Drive…"); const f=await Cloud.google.open();
    if(f){ adoptCloudDoc("gdrive",f.id,f.name,f.content); closeSheets(); $("#segEdit").click(); toast("Opened "+f.name); } }
  catch(e){ alert("Google Drive error:\n"+(e.message||e)); }
}
async function openFromOneDrive(){
  try{ toast("Loading OneDrive…"); const files=await Cloud.onedrive.list();
    if(!files.length){ alert("No .md files found in your OneDrive."); return; }
    // simple picker into the docs sheet
    const list=$("#docList");
    list.innerHTML=`<div class="docItem" id="odBack">${ic.docs}<span>← Back</span></div>`+
      files.map(f=>`<div class="docItem" data-od="${f.id}"><span>${f.name}</span></div>`).join("");
    $("#odBack").onclick=renderDocList;
    list.querySelectorAll("[data-od]").forEach(el=>el.onclick=async()=>{
      try{ toast("Downloading…"); const f=await Cloud.onedrive.get(el.dataset.od);
        adoptCloudDoc("onedrive",f.id,f.name,f.content); closeSheets(); $("#segEdit").click(); toast("Opened "+f.name); }
      catch(e){ alert("OneDrive error:\n"+(e.message||e)); }
    });
  } catch(e){ alert("OneDrive error:\n"+(e.message||e)); }
}

/* ---------- save: to origin cloud if cloud-backed, else share sheet ---------- */
async function saveDoc(){
  persistActive(); const d=active(); if(!d) return;
  try{
    if(d.provider==="gdrive"){ toast("Saving to Drive…"); const r=await Cloud.google.save(d.name,src.value,d.cloudId); d.cloudId=r.id; saveDocs(docs); toast("Saved to Drive"); return; }
    if(d.provider==="onedrive"){ toast("Saving to OneDrive…"); const r=await Cloud.onedrive.save(d.name,src.value,d.cloudId); d.cloudId=r.id; saveDocs(docs); toast("Saved to OneDrive"); return; }
  }catch(e){ alert("Cloud save failed:\n"+(e.message||e)); return; }
  // local doc → share sheet (Save to Files / Drive / OneDrive apps)
  const file=new File([new Blob([src.value],{type:"text/markdown"})], d.name||"document.md", {type:"text/markdown"});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file],title:d.name}); toast("Shared"); return; }catch{ return; }
  }
  const url=URL.createObjectURL(file); const a=document.createElement("a"); a.href=url; a.download=d.name||"document.md"; a.click(); URL.revokeObjectURL(url); toast("Exported");
}
$("#saveBtn").onclick=saveDoc;

/* ---------- menu sheet ---------- */
const THEMES=[["","🟣 LinkDown"],["light","☀️ Light"],["matrix","🟩 Matrix"]];
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); $("#hljsTheme").href=(t==="light")?"hljs-light.css":"hljs-theme.css"; localStorage.setItem("mdpwa.theme",t); render(); }
function renderMenu(){
  const m=$("#menuList");
  m.innerHTML =
    `<div class="mRow" data-m="export">${ic.share}<span>Save / Share current doc</span></div>`+
    `<div class="mRow" data-m="import">${ic.download}<span>Import from Files</span></div>`+
    `<div class="mRow" data-m="theme">${ic.theme}<span>Theme: cycle</span></div>`;
  m.querySelectorAll("[data-m]").forEach(el=>el.onclick=()=>{
    const a=el.dataset.m; closeSheets();
    if(a==="export") saveDoc();
    else if(a==="import") $("#fileInput").click();
    else if(a==="theme"){ const cur=localStorage.getItem("mdpwa.theme")||""; const i=THEMES.findIndex(t=>t[0]===cur); applyTheme(THEMES[(i+1)%THEMES.length][0]); toast("Theme changed"); }
  });
}
renderMenu();

/* ---------- boot ---------- */
applyTheme(localStorage.getItem("mdpwa.theme")||"");
if(!docs.length){
  newDoc("Welcome.md", "# Welcome to Markdown\n\nA fast, **offline** markdown editor for your phone.\n\n## How it works\n\n- Tap **Edit / View** to switch panes\n- The toolbar formats your text\n- Everything autosaves on your device\n- **Import** opens files from Google Drive, OneDrive, or iCloud (via the Files app)\n- **Save** (↑ icon) shares the file back out — to Files, Drive, OneDrive, or anywhere\n\n## Try it\n\n1. Open the **documents** menu (top-left folder)\n2. Import a `.md` from your Drive\n3. Edit, then tap Save to push it back\n\n> Tip: add this app to your Home Screen for full-screen, app-like use.\n");
} else {
  setActive(activeId && active() ? activeId : docs[0].id);
}

/* ---------- service worker (offline) ---------- */
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
