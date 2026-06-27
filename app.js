/* Markdown PWA — fully client-side. Docs live in localStorage; import/export via the iOS Files app
   (which exposes Google Drive, OneDrive, iCloud). No server. */
'use strict';
const $ = s => document.querySelector(s);
// Visible error reporter (phones have no console). Shows the real error on-screen
// so a silent failure becomes a readable message instead of "doesn't work".
window.addEventListener("error", e=>{
  try{ const s=document.querySelector("#status"); if(s){ s.textContent="ERR: "+(e.message||e.error||"unknown"); s.classList.add("show"); s.style.color="#f48771"; } }catch(_){}
});
window.addEventListener("unhandledrejection", e=>{
  try{ const s=document.querySelector("#status"); if(s){ s.textContent="ERR: "+((e.reason&&(e.reason.message||e.reason))||"promise"); s.classList.add("show"); s.style.color="#f48771"; } }catch(_){}
});
const SVG = p => `<svg viewBox="0 0 24 24">${p}</svg>`;
const ic = {
  menu:SVG('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  navBack:SVG('<path d="M15 18l-6-6 6-6"/>'),
  navFwd:SVG('<path d="M9 6l6 6-6 6"/>'),
  navUp:SVG('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  navHome:SVG('<path d="M4 11l8-7 8 7M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"/>'),
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
  symbols:SVG('<circle cx="7" cy="7" r="3"/><rect x="14" y="4" width="6" height="6" rx="1"/><path d="M7 14l2.5 5h-5z"/><path d="M14 14h6v6h-6z"/>'),
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
function render(){
  pv.innerHTML = DOMPurify.sanitize(marked.parse(src.value||""));
  wireTaskCheckboxes();
}
// make rendered "- [ ]" checkboxes tappable: toggling one rewrites the Nth checkbox in the source
function wireTaskCheckboxes(){
  const boxes=pv.querySelectorAll('input[type="checkbox"]');
  boxes.forEach((box,idx)=>{
    box.disabled=false; box.style.cursor="pointer"; box.style.width="20px"; box.style.height="20px";
    box.onclick=(e)=>{
      e.preventDefault();                 // we drive state from the source text, not the DOM
      toggleTask(idx);
    };
  });
}
// flip the idx-th task marker in src.value between [ ] and [x]
function toggleTask(idx){
  const re=/^(\s*[-*+]\s+)\[([ xX])\]/gm;
  let n=0, out=src.value, m, replaced=false;
  out=src.value.replace(re,(full,pre,mark)=>{
    if(n++===idx){ replaced=true; const on=mark.toLowerCase()==="x"; return pre+(on?"[ ]":"[x]"); }
    return full;
  });
  if(replaced){
    src.value=out;
    const t=active(); if(t){ t.content=out; }
    render();                              // re-render to reflect new state
    clearTimeout(saveTimer); saveTimer=setTimeout(persistActive,400);
    if(t && (t.provider==="gdrive"||t.provider==="onedrive")){ cloudDirty=true; clearTimeout(cloudTimer); cloudTimer=setTimeout(cloudAutoSave,2500); }
  }
}

/* ---------- theme ---------- */
const THEMES=[["","🟣 LinkDown"],["light","☀️ Light"],["matrix","🟩 Matrix"]];
function applyTheme(t){ document.documentElement.setAttribute("data-theme",t); $("#hljsTheme").href=(t==="light")?"hljs-light.css":"hljs-theme.css"; localStorage.setItem("mdpwa.theme",t); render(); }

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

let saveTimer=null, cloudTimer=null, cloudSaving=false, cloudDirty=false;
src.addEventListener("input",()=>{
  try{ render(); }catch(_){}
  try{ pushHistorySoon(); }catch(_){}   // undo history must never block autosave
  // autosave to phone — this is critical, keep it outside any try that could skip it
  clearTimeout(saveTimer); saveTimer=setTimeout(persistActive,400);
  const d=active();
  if(d && (d.provider==="gdrive"||d.provider==="onedrive")){           // autosave to cloud
    cloudDirty=true;
    clearTimeout(cloudTimer); cloudTimer=setTimeout(cloudAutoSave, 2500);
  }
});

// debounced background save to the doc's origin cloud. Silent, non-blocking, retries on next edit.
async function cloudAutoSave(){
  const d=active(); if(!d || cloudSaving) return;
  if(d.provider!=="gdrive" && d.provider!=="onedrive") return;
  cloudSaving=true; cloudDirty=false;
  const content=src.value;
  // hard timeout so the indicator can never stick on "saving…" forever
  const withTimeout=(p,ms)=>Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error("save_timeout")),ms))]);
  try{
    setSync("saving");
    if(d.provider==="gdrive"){ const r=await withTimeout(Cloud.google.save(d.name,content,d.cloudId),15000); d.cloudId=r.id; }
    else { const r=await withTimeout(Cloud.onedrive.save(d.name,content,d.cloudId),15000); d.cloudId=r.id; }
    saveDocs(docs); setSync("saved");
  }catch(e){
    setSync("error");   // leave cloudDirty so the next edit (or manual Save) retries
    cloudDirty=true;
  }finally{
    cloudSaving=false;
    // if the user kept typing during the save, schedule another pass
    if(cloudDirty){ clearTimeout(cloudTimer); cloudTimer=setTimeout(cloudAutoSave, 2500); }
  }
}
// tiny sync indicator next to the filename
function setSync(state){
  const el=$("#sync"); if(!el) return;
  el.textContent = state==="saving" ? "saving…" : state==="saved" ? "✓ saved" : state==="error" ? "⚠ offline" : "";
  el.className = "sync "+state;
  if(state==="saved"){ clearTimeout(setSync._t); setSync._t=setTimeout(()=>{ el.textContent=""; },1800); }
}

/* ---------- status toast ---------- */
let toastTimer=null;
function toast(msg){ const s=$("#status"); s.textContent=msg; s.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>s.classList.remove("show"),1600); }

/* ---------- edit/preview toggle ---------- */
$("#segEdit").onclick=()=>{ document.body.classList.remove("view-preview"); $("#segEdit").classList.add("active"); $("#segView").classList.remove("active"); };
$("#segView").onclick=()=>{ render(); document.body.classList.add("view-preview"); $("#segView").classList.add("active"); $("#segEdit").classList.remove("active"); };

/* ---------- undo / redo (app-managed history) ----------
   document.execCommand("undo") cannot work here: toolbar actions assign src.value
   directly, which wipes the browser's native undo stack. We keep our own per-doc
   history of {value,s,e}. Typing is coalesced so one undo reverts a chunk. */
const HIST={};   // docId -> { stack:[{value,s,e}], idx }
let histTyping=null, applyingHist=false;
function hist(){ const d=active(); if(!d) return null; if(!HIST[d.id]) HIST[d.id]={stack:[{value:src.value,s:0,e:0}],idx:0}; return HIST[d.id]; }
function pushHistory(){
  if(applyingHist) return; const h=hist(); if(!h) return;
  const top=h.stack[h.idx];
  if(top && top.value===src.value){ top.s=src.selectionStart; top.e=src.selectionEnd; return; }
  h.stack=h.stack.slice(0,h.idx+1);
  h.stack.push({value:src.value,s:src.selectionStart,e:src.selectionEnd});
  if(h.stack.length>200) h.stack.shift();
  h.idx=h.stack.length-1;
}
function pushHistorySoon(){ clearTimeout(histTyping); histTyping=setTimeout(pushHistory,350); }
function restoreHist(snap){
  applyingHist=true;
  src.value=snap.value; render();
  const d=active(); if(d){ d.content=src.value; d.updated=Date.now(); saveDocs(docs); }
  try{ src.focus(); src.selectionStart=snap.s; src.selectionEnd=snap.e; }catch(_){}
  applyingHist=false;
}
function doUndo(){ clearTimeout(histTyping); pushHistory(); const h=hist(); if(!h||h.idx<=0) return; h.idx--; restoreHist(h.stack[h.idx]); }
function doRedo(){ const h=hist(); if(!h||h.idx>=h.stack.length-1) return; h.idx++; restoreHist(h.stack[h.idx]); }

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
  undo:()=>doUndo(),
  redo:()=>doRedo(),
  h1:()=>linePrefix("# "),h2:()=>linePrefix("## "),
  bold:()=>wrap("**","**"),italic:()=>wrap("_","_"),strike:()=>wrap("~~","~~"),
  highlight:()=>wrap("==","=="),code:()=>wrap("`","`"),
  ul:()=>linePrefix("- "),ol:()=>linePrefix("",true),task:()=>linePrefix("- [ ] "),quote:()=>linePrefix("> "),
  link:()=>{const{s,e,val}=getSel();const sel=val.slice(s,e)||"text";insert(`[${sel}](url)`,4);},
  table:()=>insert("\n| A | B |\n| --- | --- |\n| 1 | 2 |\n"),
  codeblk:()=>insert("\n```\n\n```\n",5),
  symbols:()=>toggleSymbolBar()
};
const TOOLS=[["undo"],["redo"],["sep"],["h1"],["h2"],["bold"],["italic"],["strike"],["highlight"],["code"],["sep"],["ul"],["ol"],["task"],["quote"],["symbols"],["sep"],["link"],["table"],["codeblk"]];
$("#tools").innerHTML = TOOLS.map(t=> t[0]==="sep" ? '<span class="sep"></span>' : `<button data-act="${t[0]}">${ic[t[0]]}</button>`).join("");
$("#tools").addEventListener("click",e=>{ const b=e.target.closest("[data-act]"); if(b&&ACT[b.dataset.act]) ACT[b.dataset.act](); });

// symbol inserter: a row of glyphs you tap to insert at the cursor (energy dots, checks, etc.)
const SYMBOLS=["▢","▣","●","○","☐","☑","★","→","•","—"];
function toggleSymbolBar(){
  let bar=$("#symBar");
  if(bar){ bar.remove(); return; }
  bar=document.createElement("div"); bar.id="symBar";
  bar.innerHTML=SYMBOLS.map(s=>`<button class="symBtn">${s}</button>`).join("");
  $("#tools").after(bar);
  bar.querySelectorAll(".symBtn").forEach(b=>b.onclick=()=>{ insert(b.textContent); });
}

/* ---------- new document (one tap) ---------- */
function createNewDoc(){
  const n=docs.filter(d=>/^Untitled/.test(d.name||"")).length;
  newDoc(n?`Untitled ${n+1}.md`:"Untitled.md","");
  closeSheets(); document.body.classList.remove("view-preview");
  $("#segEdit").classList.add("active"); $("#segView").classList.remove("active");
  src.focus();
}

/* ---------- top bar icons ---------- */
$("#menuBtn").innerHTML=ic.menu; $("#saveBtn").innerHTML=ic.save;
$("#newBtn").innerHTML=ic.plus; $("#newBtn").onclick=createNewDoc;
$("#saveBtn").onclick=saveDoc;   // wired here (with the other top-bar buttons) so a later throw can't skip it
// tap the title to rename the current doc
docname.style.cursor="pointer"; docname.title="Tap to rename";
docname.onclick=()=>{
  const d=active(); if(!d) return;
  const n=prompt("File name:", d.name||"Untitled.md");
  if(n!==null && n.trim()){ d.name=n.trim().endsWith(".md")||n.includes(".")?n.trim():n.trim()+".md"; saveDocs(docs); docname.textContent=d.name; }
};

/* ---------- the single sheet (documents + actions) ---------- */
const scrim=$("#scrim");
function openSheet(el){ persistActive(); scrim.classList.add("open"); el.classList.add("open"); if(el.id==="docsSheet") renderDocList(); }
function openDrawer(){ openSheet($("#docsSheet")); }
function closeSheets(){ scrim.classList.remove("open"); document.querySelectorAll(".sheet").forEach(s=>s.classList.remove("open")); }
scrim.onclick=closeSheets;
$("#menuBtn").onclick=openDrawer;

/* ---------- iOS edge-swipe: swipe right from the left edge opens the drawer; swipe left closes it ---------- */
(function(){
  const EDGE=28, THRESH=55; let sx=0, sy=0, tracking=false, fromEdge=false;
  document.addEventListener("touchstart",e=>{
    const t=e.touches[0]; sx=t.clientX; sy=t.clientY; tracking=true;
    fromEdge = sx<=EDGE;            // started near the left screen edge
  },{passive:true});
  document.addEventListener("touchend",e=>{
    if(!tracking) return; tracking=false;
    const t=e.changedTouches[0]; const dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dx)<THRESH || Math.abs(dy)>Math.abs(dx)) return;   // mostly-horizontal only
    const drawerOpen=$("#docsSheet").classList.contains("open");
    if(dx>0 && fromEdge && !drawerOpen) openDrawer();              // edge → right: open
    else if(dx<0 && drawerOpen) closeSheets();                     // left swipe: close
  },{passive:true});
})();

function renderDocList(){
  const list=$("#docList");
  const fmt=ts=>{ const d=new Date(ts); return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})+" "+d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}); };
  // Sources row: open/import from elsewhere
  let sources=`<div class="docItem" id="importBtn">${ic.download}<span>Import from Files…</span><span class="meta">iCloud · any</span></div>`;
  if(window.Cloud && Cloud.google.configured())
    sources+=`<div class="docItem" id="gOpenBtn">${ic.gdrive}<span>Open from Google Drive…</span></div>`;
  if(window.Cloud && Cloud.onedrive.configured())
    sources+=`<div class="docItem" id="msOpenBtn">${ic.onedrive}<span>Open from OneDrive…</span></div>`;
  // Document list
  let items="";
  docs.forEach(d=>{
    const tag = d.provider==="gdrive"?" · Drive" : d.provider==="onedrive"?" · OneDrive" : "";
    const activeCls = d.id===activeId ? " active" : "";
    items+=`<div class="docItem${activeCls}" data-id="${d.id}"><span>${(d.name||"Untitled")}</span><span class="meta">${fmt(d.updated)}${tag}</span><span class="dx" data-del="${d.id}">${ic.trash}</span></div>`;
  });
  list.innerHTML =
    // TOP: header + scrollable document list
    `<div class="drawerTop">`+
      `<div class="sheetHead"><h3>Documents</h3><button class="newBtnSheet" id="newDocBtn">${ic.plus}<span>New</span></button></div>`+
      `<div class="sheetGroup">${items||'<div class="empty">No documents yet</div>'}</div>`+
    `</div>`+
    // BOTTOM (pinned): sources + settings
    `<div class="drawerBot">`+
      `<div class="sheetLabel">Open from</div>`+
      `<div class="sheetGroup">${sources}</div>`+
      `<div class="sheetLabel">Settings</div>`+
      `<div class="sheetGroup"><div class="docItem" id="themeBtn">${ic.theme}<span>Theme</span><span class="meta" id="themeName"></span></div></div>`+
    `</div>`;
  // wire up
  $("#newDocBtn").onclick=createNewDoc;
  $("#importBtn").onclick=()=>$("#fileInput").click();
  const gb=$("#gOpenBtn"); if(gb) gb.onclick=openFromGoogle;
  const mb=$("#msOpenBtn"); if(mb) mb.onclick=openFromOneDrive;
  const tn=$("#themeName"); if(tn){ const cur=localStorage.getItem("mdpwa.theme")||""; tn.textContent=(THEMES.find(t=>t[0]===cur)||THEMES[0])[1]; }
  $("#themeBtn").onclick=()=>{
    const cur=localStorage.getItem("mdpwa.theme")||""; const i=THEMES.findIndex(t=>t[0]===cur);
    const next=THEMES[(i+1)%THEMES.length]; applyTheme(next[0]); $("#themeName").textContent=next[1];
  };
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
// Google Drive folder browser. No Picker (its iframe needs third-party cookies
// that iOS blocks). We list folders + .md files in a folder using the token we
// already hold, and let the user navigate in/up. "Documents" exits to the docs list.
const GDRIVE_LAST="mdpwa_gdrive_last";   // remember the folder you were last in
// In-session navigation history for back/forward. Each item: {id, name}.
let gHist=[], gHi=-1;
// mode: "push" (normal click), "back", "forward". back/forward just move gHi.
async function gBrowse(folderId, folderName, mode){
  const list=$("#docList");
  toast("Loading Drive…");
  let entries;
  try{ entries=await Cloud.google.list(folderId); }
  catch(e){
    alert("Google Drive error:\n"+(e&&(e.message||e.error||JSON.stringify(e))||e));
    if(folderId && folderId!=="root"){ try{ localStorage.removeItem(GDRIVE_LAST); }catch(_){} return gBrowse("root",null,"push"); }
    return;
  }
  const fid=folderId||"root";
  const crumb = fid==="root" ? "My Drive" : (folderName||"Folder");
  // maintain history
  if(mode==="back"){ gHi=Math.max(0,gHi-1); }
  else if(mode==="forward"){ gHi=Math.min(gHist.length-1,gHi+1); }
  else { gHist=gHist.slice(0,gHi+1); gHist.push({id:fid,name:folderName||null}); gHi=gHist.length-1; }
  try{ localStorage.setItem(GDRIVE_LAST, JSON.stringify({id:fid, name:folderName||null})); }catch(_){}
  const canBack=gHi>0, canFwd=gHi<gHist.length-1, canUp=fid!=="root";
  // compact icon-only nav row
  const nav=`<div class="gnav">`+
    `<button class="gNavBtn" id="gBack" ${canBack?"":"disabled"} title="Back">${ic.navBack}</button>`+
    `<button class="gNavBtn" id="gFwd" ${canFwd?"":"disabled"} title="Forward">${ic.navFwd}</button>`+
    `<button class="gNavBtn" id="gUp" ${canUp?"":"disabled"} title="Up one folder">${ic.navUp}</button>`+
    `<button class="gNavBtn" id="gHome" title="My Drive">${ic.navHome}</button>`+
    `<span class="gCrumb">${crumb}</span>`+
    `<button class="gNavBtn" id="gDocs" title="Back to Documents">${ic.menu}</button>`+
    `</div>`;
  const rows = entries.length
    ? entries.map(f=> f.isFolder
        ? `<div class="docItem" data-folder="${f.id}" data-name="${(f.name||"").replace(/"/g,"&quot;")}">${ic.docs}<span>${f.name}</span><span class="meta">›</span></div>`
        : `<div class="docItem" data-file="${f.id}"><span>${f.name}</span><span class="meta">.md</span></div>`
      ).join("")
    : `<div class="empty">No folders or markdown files here</div>`;
  list.innerHTML =
    `<div class="drawerPin">${nav}</div>`+
    `<div class="drawerTop"><div class="sheetGroup">${rows}</div></div>`;
  const back=$("#gBack"); if(back&&canBack) back.onclick=()=>{ const t=gHist[gHi-1]; gBrowse(t.id,t.name,"back"); };
  const fwd=$("#gFwd"); if(fwd&&canFwd) fwd.onclick=()=>{ const t=gHist[gHi+1]; gBrowse(t.id,t.name,"forward"); };
  const up=$("#gUp"); if(up&&canUp) up.onclick=async()=>{ const p=await Cloud.google.parent(fid); gBrowse(p, null, "push"); };
  $("#gHome").onclick=()=>gBrowse("root", null, "push");
  $("#gDocs").onclick=renderDocList;
  list.querySelectorAll("[data-folder]").forEach(el=>el.onclick=()=>gBrowse(el.dataset.folder, el.dataset.name, "push"));
  list.querySelectorAll("[data-file]").forEach(el=>el.onclick=async()=>{
    try{ toast("Downloading…"); const f=await Cloud.google.get(el.dataset.file);
      adoptCloudDoc("gdrive",f.id,f.name,f.content); closeSheets(); $("#segEdit").click(); toast("Opened "+f.name); }
    catch(e){ alert("Google Drive error:\n"+(e.message||e)); }
  });
}
async function openFromGoogle(){
  // reopen where you left off (falls back to root if unset or stale)
  let last={id:"root",name:null};
  try{ const s=JSON.parse(localStorage.getItem(GDRIVE_LAST)||"null"); if(s&&s.id) last=s; }catch(_){}
  gHist=[]; gHi=-1;   // fresh history each time the browser opens
  gBrowse(last.id, last.name, "push");
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
    if(d.provider==="gdrive"){ toast("Saving to Drive…"); const r=await Cloud.google.save(d.name,src.value,d.cloudId,true); d.cloudId=r.id; saveDocs(docs); toast("Saved to Drive"); return; }
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

/* ---------- boot ---------- */
applyTheme(localStorage.getItem("mdpwa.theme")||"");
if(!docs.length){
  newDoc("Welcome.md", "# Welcome to Markdown\n\nA fast, **offline** markdown editor for your phone.\n\n## How it works\n\n- Tap **Edit / View** to switch panes\n- The toolbar formats your text\n- Everything autosaves on your device\n- **Import** opens files from Google Drive, OneDrive, or iCloud (via the Files app)\n- **Save** (↑ icon) shares the file back out — to Files, Drive, OneDrive, or anywhere\n\n## Try it\n\n1. Open the **documents** menu (top-left folder)\n2. Import a `.md` from your Drive\n3. Edit, then tap Save to push it back\n\n> Tip: add this app to your Home Screen for full-screen, app-like use.\n");
} else {
  setActive(activeId && active() ? activeId : docs[0].id);
}

/* ---------- service worker (offline) ---------- */
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }

/* ---------- iOS keyboard fix: lock the top bars in place ----------
   When the keyboard opens, iOS force-scrolls the whole web view up to reveal the
   focused input, which drags the top bar + toolbar off-screen. Two parts:
   1) Hard scroll-lock: whenever iOS tries to scroll the window, snap it back to
      0,0. The app never wants window scroll; all scrolling lives inside #src/#pv.
   2) Size the shell to visualViewport.height so #main shrinks to the area above
      the keyboard. The textarea has its own internal scroll, so the caret stays
      visible by scrolling INSIDE the editor, not by moving the page. */
(function(){
  // 1) Lock the window to the top. This is what actually stops the bars sliding away.
  function lockTop(){
    if(window.pageYOffset!==0 || window.pageXOffset!==0) window.scrollTo(0,0);
    // some iOS builds scroll the documentElement instead of the window
    if(document.scrollingElement && document.scrollingElement.scrollTop!==0)
      document.scrollingElement.scrollTop=0;
  }
  window.addEventListener("scroll", lockTop, {passive:true});
  window.addEventListener("touchmove", lockTop, {passive:true});

  const vv = window.visualViewport;
  if(vv){                                          // older browsers keep the dvh/% fallback
    let raf=0;
    function apply(){
      raf=0;
      document.documentElement.style.setProperty("--app-h", vv.height+"px");
      lockTop();
    }
    function schedule(){ if(!raf) raf=requestAnimationFrame(apply); }
    vv.addEventListener("resize", schedule);
    vv.addEventListener("scroll", schedule);
    apply();
  }

  // On focus, snap back a few times: iOS fires its auto-scroll slightly after
  // focus, so one snap is not enough. The editor keeps the caret visible itself.
  document.addEventListener("focusin", function(e){
    if(e.target && (e.target.id==="src" || e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA")){
      [0,60,150,300].forEach(function(t){ setTimeout(lockTop, t); });
    }
  });
})();
