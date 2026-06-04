/* ============================================================
   FIREBASE  (no auth — identity is a local profile)
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyAt4YQQr-SNp_KszD1m1JFWIV5ftEsHuqA",
  authDomain: "campfire-ed6f3.firebaseapp.com",
  projectId: "campfire-ed6f3",
  storageBucket: "campfire-ed6f3.firebasestorage.app",
  messagingSenderId: "473461550751",
  appId: "1:473461550751:web:47d3e5bff9566c31a53caa",
  measurementId: "G-F8QXGG04R3"
};
const FB_SDK = "https://www.gstatic.com/firebasejs/12.14.0";
const { initializeApp } = await import(`${FB_SDK}/firebase-app.js`);
const F = await import(`${FB_SDK}/firebase-firestore.js`);
const app = initializeApp(firebaseConfig);
let db;
try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
catch(e){ console.warn("cache fallback", e); db = F.getFirestore(app); }

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const root = $("root");
const esc = s => String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function linkify(t){ return esc(t).replace(/(https?:\/\/[^\s]+)/g, u=>`<a href="${u}" target="_blank" rel="noopener">${u}</a>`); }
const GENRE_COLORS={Folk:"--g-folk",Country:"--g-country",Pop:"--g-pop",Rock:"--g-rock",Bluegrass:"--g-bluegrass",Grunge:"--g-grunge",Blues:"--g-blues",Granola:"--g-granola"};
const gcolor=n=>GENRE_COLORS[n]?`var(${GENRE_COLORS[n]})`:"var(--g-other)";
const FLAME=`<svg class="flame" viewBox="0 0 30 38" fill="none"><path d="M15 1C16 9 23 11 23 21c0 6-3.6 10-8 10s-8-4-8-10c0-4 2-6 3-8 .5 3 2 4 3 4-1-4 1-9 2-16Z" fill="url(#fg)"/><path d="M15 14c1 4 4 5 4 9 0 3-1.8 5-4 5s-4-2-4-5c0-2 1-3 2-4 .3 1.5 1.2 2 2 2-.6-2 0-5 0-7Z" fill="#ffe09a"/><defs><linearGradient id="fg" x1="15" y1="1" x2="15" y2="31" gradientUnits="userSpaceOnUse"><stop stop-color="#ffd24a"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient></defs></svg>`;
const starSvg = on => `<svg width="20" height="20" viewBox="0 0 20 20" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6"><path d="M10 1.8l2.5 5.1 5.6.8-4 4 .95 5.6L10 14.7 4.9 17.3l1-5.6-4-4 5.6-.8z"/></svg>`;
const knownIcon=`<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 10l4 4 9-10"/></svg>`;
const todoIcon=`<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4l3 2"/></svg>`;
const searchLinks = (title,artist)=>{ const q=encodeURIComponent(`${title} ${artist}`.trim()); return { spotify:`https://open.spotify.com/search/${q}`, apple:`https://music.apple.com/search?term=${q}` }; };

const PAL=["#c0653f","#d99b3c","#7e9b54","#4f8f86","#5c84b1","#9c6ab0","#c25d80","#3f8f6b"];
function colorFor(id){ let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return PAL[h%PAL.length]; }
function initialsOf(name){ const p=String(name||"?").trim().split(/\s+/).filter(Boolean); const s=(p[0]?p[0][0]:"")+(p[1]?p[1][0]:""); return (s||"?").toUpperCase(); }
function avatar(name,color,size){ const fs=Math.round(size*0.4); return `<span class="av" style="width:${size}px;height:${size}px;background:${color||'#c8a86a'};font-size:${fs}px">${esc(initialsOf(name))}</span>`; }
function nameOf(uid,fallback){ return (usersMap[uid]&&usersMap[uid].name)||fallback||"Friend"; }
function colorOf(uid,fallback){ return (usersMap[uid]&&usersMap[uid].color)||fallback||colorFor(uid); }

/* ---------- seed ---------- */
function seedRows(){
  return [
    ["Take Me Home Country Roads","John Denver","Folk,Country"],["Yellow","Coldplay","Pop"],
    ["Wagon Wheel","Darius Rucker","Country"],["Upside Down","Jack Johnson","Folk,Pop"],
    ["Sweet Home Alabama","Lynyrd Skynyrd","Rock"],["Hotel California","The Eagles","Rock"],
    ["Chicken Fried","Zac Brown Band","Country"],["Toes","Zac Brown Band","Country"],
    ["Dust in a Baggie","Billy Strings","Bluegrass,Country"],["Island in the Sun","Weezer","Rock"],
    ["Good Riddance","Green Day","Rock"],["Home","Edward Sharpe and The Magnetic Zeros","Folk,Pop"],
    ["Little Lion Man","Mumford & Sons","Folk,Pop"],["I Will Wait","Mumford & Sons","Folk,Pop"],
    ["Counting Stars","One Republic","Pop"],["Blackbird","The Beatles","Rock,Pop"],
    ["Fast Car","Tracy Chapman","Folk,Pop"],["Ain't No Sunshine","Bill Withers","Blues"],
    ["Evergreen","Richy Mitch & The Coal Miners","Folk,Granola"],["Bad Moon Rising","Creedence Clearwater Revival","Rock"],
    ["Brown Eyed Girl","Van Morrison","Rock,Pop"],["Banana Pancakes","Jack Johnson","Folk,Pop"],
    ["Revival","Zach Bryan","Country"],["Have You Ever Seen the Rain","Creedence Clearwater Revival","Rock,Pop"],
    ["Under the Bridge","Red Hot Chili Peppers","Rock"],["Scar Tissue","Red Hot Chili Peppers","Rock"],
    ["Harvest Moon","Neil Young","Folk,Rock"],["You Belong With Me","Taylor Swift","Pop"],
    ["Party in the USA","Miley Cyrus","Pop"],["Brandy (You're a Fine Girl)","Looking Glass","Rock,Pop"],
    ["Wham Bam Shang-a-Lang","John Batdorf","Rock,Pop"],["All the Debts I Owe","Caamp","Folk,Granola"],
    ["Jumper","Third Eye Blind","Rock"],["She Will Be Loved","Maroon 5","Pop"],
    ["Somebody That I Used to Know","Gotye","Pop"],["Feathered Indians","Tyler Childers","Folk,Country"],
    ["Wake Me Up","Avicii","Pop"],["Hey There Delilah","Plain White T's","Pop"],
    ["By and By","Caamp","Folk,Granola"],["Take It Easy","The Eagles","Folk,Rock"],
    ["Don't Think Twice It's Alright","Bob Dylan, Billy Strings","Folk"],["Lady May","Tyler Childers","Folk,Country"],
    ["Outside","Staind","Rock,Grunge"],["Empty as a Drum","Turnpike Troubadors","Country"],
    ["Drive","Incubus","Rock"],["Night Moves","Bob Seger","Rock"],
    ["Black","Pearl Jam","Rock,Grunge"],["Interstate Love Song","Stone Temple Pilots","Rock,Grunge"],
    ["Plush","Stone Temple Pilots","Rock,Grunge"]
  ];
}

/* ============================================================
   STATE + LOCAL PROFILE
   ============================================================ */
let me=null;                 // {uid,name,color}
let songs=[], songsMap={}, myLists={}, usersMap={}, allLists={};
let query="", activeGenres=new Set(), excludeGenres=new Set(), online=navigator.onLine, started=false;
let sortMode="added", sortDir="desc";  // added|known|todo ; desc|asc
let collapsed={known:false,todo:false};
let userGenres=new Set();  // genre filter on the personal page
let noRepeats=false, spinPlayed=new Set();
let lastUserView=null;
let isAdmin=(()=>{try{return localStorage.getItem("cf-admin")==="1";}catch(e){return false;}})();
let detachNotes=null, currentNotes=[], notesSongId=null, lastSong=null;
let myPersonalNotes={};  // songId -> text, populated by the notes listener, survives navigation

const CODE_WORDS=["ember","cedar","river","willow","maple","aspen","spruce","birch","pine","fern","moss","creek","ridge","cabin","trail","flint","spark","glow","drift","stone"];
function newCode(){
  const w=CODE_WORDS[Math.floor(Math.random()*CODE_WORDS.length)];
  const n=Math.random().toString(36).slice(2,6).toUpperCase();
  return w+"-"+n;
}
function normalizeCode(s){ return String(s||"").trim().toLowerCase().replace(/\s+/g,"").replace(/[^a-z0-9-]/g,""); }
function localId(){
  let id=null; try{ id=localStorage.getItem("cf-uid"); }catch(e){}
  if(!id){ id=newCode(); try{localStorage.setItem("cf-uid",id);}catch(e){} }
  return id;
}
function setLocalId(id){ try{ localStorage.setItem("cf-uid",id); }catch(e){} }
function loadProfile(){
  const uid=localId();
  let name=null,color=null;
  try{ name=localStorage.getItem("cf-name"); color=localStorage.getItem("cf-color"); }catch(e){}
  if(!name) return null;
  return {uid,name,color:color||colorFor(uid)};
}
function saveProfile(name,color){
  const uid=localId();
  try{ localStorage.setItem("cf-name",name); localStorage.setItem("cf-color",color); }catch(e){}
  me={uid,name,color};
}
// Restore an existing profile by its recovery code. Returns the profile or null if not found.
async function restoreProfile(code){
  const id=normalizeCode(code);
  if(!id) return null;
  let snap; try{ snap=await F.getDoc(F.doc(db,"users",id)); }catch(e){ return null; }
  if(!snap.exists()) return null;
  const d=snap.data();
  setLocalId(id);
  try{ localStorage.setItem("cf-name",d.name||"Friend"); localStorage.setItem("cf-color",d.color||colorFor(id)); }catch(e){}
  me={uid:id,name:d.name||"Friend",color:d.color||colorFor(id)};
  return me;
}
function setAdmin(on){ isAdmin=on; try{ on?localStorage.setItem("cf-admin","1"):localStorage.removeItem("cf-admin"); }catch(e){} }
async function sha256(str){ const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
async function getAdminHash(){ try{ const d=await F.getDoc(F.doc(db,"meta","admin")); return d.exists()?(d.data().hash||null):null; }catch(e){ return null; } }
async function setAdminHash(hash){ await F.setDoc(F.doc(db,"meta","admin"),{hash,setBy:me.name,at:F.serverTimestamp()},{merge:true}); }
async function adminRename(uid,name,color){ await F.setDoc(F.doc(db,"users",uid),{name,color,updatedAt:F.serverTimestamp()},{merge:true}); }
async function adminRemove(uid){
  const ls=await F.getDocs(F.collection(db,"users",uid,"lists"));
  const batch=F.writeBatch(db);
  ls.docs.forEach(d=>batch.delete(d.ref));
  songs.forEach(s=>batch.delete(F.doc(db,"songs",s.id,"notes",uid)));
  batch.delete(F.doc(db,"users",uid));
  await batch.commit();
}

/* ============================================================
   DATA OPS
   ============================================================ */
async function ensureProfile(){
  await F.setDoc(F.doc(db,"users",me.uid),{name:me.name,color:me.color,updatedAt:F.serverTimestamp()},{merge:true});
}
async function ensureSeed(){
  const metaRef=F.doc(db,"meta","init");
  const snap=await F.getDoc(metaRef);
  if(snap.exists()) return;
  const batch=F.writeBatch(db);
  seedRows().forEach((r,i)=>{ const ref=F.doc(F.collection(db,"songs"));
    batch.set(ref,{title:r[0],artist:r[1],genres:r[2].split(",").map(g=>g.trim()),sortKey:i,addedBy:"seed",addedByName:"Songbook"}); });
  batch.set(metaRef,{seeded:true,at:F.serverTimestamp()});
  await batch.commit();
}
async function addSong(title,artist,genres){
  await F.addDoc(F.collection(db,"songs"),{title,artist,genres,sortKey:Date.now(),addedBy:me.uid,addedByName:me.name});
}
async function deleteSong(id){ await F.deleteDoc(F.doc(db,"songs",id)); }
async function saveSongFields(id,fields){ await F.updateDoc(F.doc(db,"songs",id),fields); }
async function savePersonalNote(songId,text){
  const ref=F.doc(db,"songs",songId,"notes",me.uid);
  if(text.trim()) await F.setDoc(ref,{text:text.trim(),name:me.name,color:me.color,uid:me.uid,updatedAt:F.serverTimestamp()});
  else await F.deleteDoc(ref).catch(()=>{});
}
function myEntry(id){ return myLists[id]||{status:null,starred:false}; }
async function setStatus(songId,status){
  const ref=F.doc(db,"users",me.uid,"lists",songId); const cur=myEntry(songId);
  if(status===null){ if(cur.starred) await F.setDoc(ref,{status:null,starred:true,updatedAt:F.serverTimestamp()}); else await F.deleteDoc(ref).catch(()=>{}); }
  else await F.setDoc(ref,{status,starred:cur.starred||false,updatedAt:F.serverTimestamp()},{merge:true});
}
async function toggleStar(songId){
  const ref=F.doc(db,"users",me.uid,"lists",songId); const cur=myEntry(songId); const next=!cur.starred;
  if(!next && !cur.status) await F.deleteDoc(ref).catch(()=>{});
  else await F.setDoc(ref,{status:cur.status||null,starred:next,updatedAt:F.serverTimestamp()},{merge:true});
}

/* ============================================================
   LISTENERS
   ============================================================ */
function startListeners(){
  if(started) return; started=true;
  F.onSnapshot(F.query(F.collection(db,"songs"),F.orderBy("sortKey","asc")),snap=>{
    songs=snap.docs.map(d=>({id:d.id,...d.data()})); songsMap={}; songs.forEach(s=>songsMap[s.id]=s); rerender();
  },err=>{ console.error("songs",err); root.innerHTML=`<div class="wrap"><div class="empty"><div class="big">Can&rsquo;t reach the songbook</div>Make sure your Firestore rules allow read &amp; write (see setup note).</div></div>`; });
  F.onSnapshot(F.collection(db,"users",me.uid,"lists"),snap=>{ myLists={}; snap.docs.forEach(d=>myLists[d.id]=d.data()); rerender(); });
  F.onSnapshot(F.collection(db,"users"),snap=>{ usersMap={}; snap.docs.forEach(d=>usersMap[d.id]=d.data()); rerender(); });
  // Everyone's list entries (for supply/demand). Path: users/{uid}/lists/{songId}
  F.onSnapshot(F.collectionGroup(db,"lists"),snap=>{
    const next={};
    snap.docs.forEach(d=>{
      const uid=d.ref.parent.parent.id, songId=d.id, v=d.data();
      if(!next[songId]) next[songId]={known:[],todo:[]};
      if(v.status==='known') next[songId].known.push(uid);
      else if(v.status==='todo') next[songId].todo.push(uid);
    });
    allLists=next; rerender();
  },err=>console.warn("collectionGroup lists",err));
}

/* ============================================================
   ROUTER
   ============================================================ */
function go(hash){ location.hash=hash; }
function route(){
  const h=location.hash.replace(/^#/,"")||"/"; const parts=h.split("/").filter(Boolean);
  if(parts[0]==="song") return {view:"song",id:parts[1]};
  if(parts[0]==="people") return {view:"people"};
  if(parts[0]==="spin") return {view:"spin"};
  if(parts[0]==="me") return {view:"user",uid:me?me.uid:null};
  if(parts[0]==="user") return {view:"user",uid:parts[1]};
  return {view:"home"};
}
function rerender(){ if(me) render(); }
window.addEventListener("hashchange",()=>{ if(detachNotes){detachNotes();detachNotes=null;notesSongId=null;} render(); });
window.addEventListener("online",()=>{online=true;render();});
window.addEventListener("offline",()=>{online=false;render();});

/* ============================================================
   RENDER
   ============================================================ */
function chrome(inner,active){
  return `
  <div class="topbar">
    <div class="brand" data-go="/">${FLAME}<span class="name">Songbook</span></div>
    <div class="me"><span class="conn ${online?'live':''}" title="${online?'Online':'Offline'}"></span>${avatar(me.name,me.color,30)}</div>
  </div>
  <div class="wrap">${inner}</div>
  <nav class="nav">
    <button data-go="/" class="${active==='home'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>Songs</button>
    <button data-go="/people" class="${active==='people'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 6.5a3 3 0 0 1 0 6M17 14c2.5.4 4 2.3 4 5"/></svg>People</button>
    <button data-go="/spin" class="${active==='spin'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 12l5-3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>Spin</button>
    <button data-go="/me" class="${active==='user'?'on':''}"><span style="margin-bottom:1px">${avatar(me.name,me.color,22)}</span>You</button>
  </nav>`;
}

function songRow(s){
  const e=myEntry(s.id);
  const pill = e.status==='todo'?`<span class="pill todo">To-Do</span>`:e.status==='known'?`<span class="pill known">Known</span>`:"";
  const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
  const badges=(pill||tags)?`<div class="badges">${pill}${tags}</div>`:"";
  const sd=allLists[s.id]||{known:[],todo:[]};
  const counter=`<div class="counter">${sd.known.length?`<span class="cknown">${knownIcon} ${sd.known.length}</span>`:""}${sd.todo.length?`<span class="ctodo">${todoIcon} ${sd.todo.length}</span>`:""}${(!sd.known.length&&!sd.todo.length)?`<span class="cnone">Not on anyone&rsquo;s list yet</span>`:""}</div>`;
  const addedBy = (s.addedBy && s.addedBy!=="seed") ? `<div class="rowadded">Added by ${esc(nameOf(s.addedBy,s.addedByName))}</div>` : "";
  return `<div class="row" data-id="${s.id}">
    <button class="plus ${e.status?'has':''}" data-plus="${s.id}" aria-label="add to list">+</button>
    <div class="rowmain" data-open="${s.id}"><div class="rowtitle">${esc(s.title)}</div><div class="rowartist">${esc(s.artist)}</div>${addedBy}${counter}${badges}</div>
    <button class="star ${e.starred?'on':''}" data-star="${s.id}" aria-label="favorite">${starSvg(e.starred)}</button>
  </div>`;
}
function allGenres(){
  const set=new Set(); songs.forEach(s=>(s.genres||[]).forEach(g=>set.add(g)));
  const known=Object.keys(GENRE_COLORS).filter(g=>set.has(g));
  const extra=[...set].filter(g=>!GENRE_COLORS[g]).sort(); return [...known,...extra];
}
function filteredSongs(){
  const q=query.trim().toLowerCase();
  const out=songs.filter(s=>{ const mq=!q||s.title.toLowerCase().includes(q)||s.artist.toLowerCase().includes(q);
    const g=s.genres||[];
    const mInc=activeGenres.size===0||g.some(x=>activeGenres.has(x));
    const mExc=excludeGenres.size===0||!g.some(x=>excludeGenres.has(x));
    return mq&&mInc&&mExc; });
  const cnt=s=>allLists[s.id]||{known:[],todo:[]};
  const metric=s=> sortMode==="known"?cnt(s).known.length : sortMode==="todo"?cnt(s).todo.length : (s.sortKey||0);
  out.sort((a,b)=>{ const d=metric(a)-metric(b); if(d!==0) return sortDir==="asc"?d:-d;
    return a.title.localeCompare(b.title); });   // stable tiebreak by title
  return out;
}
function renderHome(){
  const chips=[`<button class="chip all ${(activeGenres.size===0&&excludeGenres.size===0)?'on':''}" data-genre="__all">All</button>`]
    .concat(allGenres().map(g=>{
      const inc=activeGenres.has(g), exc=excludeGenres.has(g);
      return `<button class="chip ${inc?'on':''} ${exc?'exc':''}" style="--gc:${gcolor(g)}" data-genre="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`;
    })).join("");
  const rows=filteredSongs(); const inc=[...activeGenres], exc=[...excludeGenres];
  let showing;
  if(inc.length||exc.length){
    const parts=[]; if(inc.length)parts.push(inc.join(" / ")); if(exc.length)parts.push("no "+exc.join(" / "));
    showing=`${rows.length} song${rows.length!==1?"s":""} \u00b7 ${parts.join(", ")}`;
  } else showing=query?`${rows.length} match${rows.length!==1?"es":""}`:"All songs";
  const active=(activeGenres.size||excludeGenres.size||query);
  const arrow=m=> sortMode!==m?"" : (sortDir==="desc"?" \u2193":" \u2191");
  const lbl={added:"Date added",known:"Most known",todo:"Most to-do"};
  const sortBtn=m=>`<button class="sortbtn ${sortMode===m?'on':''}" data-sort="${m}">${lbl[m]}${arrow(m)}</button>`;
  const inner=`
    <div class="ptitle">Campfire Songbook</div>
    <div class="psub">${songs.length} songs &middot; tap a genre to include, tap again to exclude</div>
    <div class="homectl">
      <div class="searchbar"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M16 16l-3.5-3.5"/></svg>
        <input id="search" type="text" placeholder="Search songs or artists&hellip;" autocomplete="off" value="${esc(query)}"></div>
      <div class="filters" id="filters">${chips}</div>
      <div class="sortbar" id="sortbar">${sortBtn("added")}${sortBtn("known")}${sortBtn("todo")}</div>
      <div class="meta"><span>${showing}</span><span class="clear ${active?'show':''}" id="clear">Clear</span></div>
    </div>
    <div class="list home-list">${rows.length?rows.map(songRow).join(""):`<div class="empty"><div class="big">No songs found</div>Try a different search or clear filters.</div>`}</div>`;
  const _wrapScroll=(()=>{const w=document.querySelector(".wrap");return w?w.scrollTop:0;})();
  const _filScroll=(()=>{const f=$("filters");return f?f.scrollLeft:0;})();
  root.innerHTML=chrome(inner,"home")+`<button class="fab" id="fab"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 3v12M3 9h12"/></svg>Add a Song</button>`+`<button class="totop" id="totop"><svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14V5M4 9l5-5 5 5"/></svg>Top</button>`;
  (()=>{const w=document.querySelector(".wrap");if(w)w.scrollTop=_wrapScroll;const f=$("filters");if(f)f.scrollLeft=_filScroll;})();
  const si=$("search"); if(si){ si.addEventListener("input",e=>{ query=e.target.value; renderHome(); const n=$("search"); n.focus(); n.setSelectionRange(n.value.length,n.value.length); }); }
  $("fab").onclick=openAddSheet; const cl=$("clear"); if(cl) cl.onclick=()=>{activeGenres.clear();excludeGenres.clear();query="";renderHome();};
  const wrap=document.querySelector(".wrap"), tt=$("totop");
  if(wrap&&tt){
    const upd=()=>tt.classList.toggle("show",wrap.scrollTop>260);
    wrap.addEventListener("scroll",upd,{passive:true}); upd();
    tt.onclick=()=>wrap.scrollTo({top:0,behavior:"smooth"});
  }
}

function peopleChips(uids){
  return uids.map(uid=>`<span class="pchip" data-go="/user/${uid}">${avatar(nameOf(uid,"Friend"),colorOf(uid),20)}<span>${esc(nameOf(uid,"Friend"))}</span></span>`).join("");
}
function supplyDemandSection(id){
  const sd=allLists[id]||{known:[],todo:[]};
  const knownC=sd.known.length, todoC=sd.todo.length;
  const knownBlock=`<div class="sdgroup"><div class="sdhead"><span class="sdlabel known">${knownIcon} Known by ${knownC}</span></div>
    <div class="pchips">${knownC?peopleChips(sd.known):`<span class="sdnone">Nobody yet</span>`}</div></div>`;
  const todoBlock=`<div class="sdgroup"><div class="sdhead"><span class="sdlabel todo">${todoIcon} Want to learn ${todoC}</span></div>
    <div class="pchips">${todoC?peopleChips(sd.todo):`<span class="sdnone">Nobody yet</span>`}</div></div>`;
  return `<div class="section"><h3>Supply &amp; demand</h3>${knownBlock}${todoBlock}</div>`;
}
function renderSong(id){
  const s=songsMap[id];
  if(!s){ root.innerHTML=chrome(`<button class="back" data-go="/">&larr; Back</button><div class="empty"><div class="big">Song not found</div>It may have been removed.</div>`,"home"); return; }
  const e=myEntry(id); const L=searchLinks(s.title,s.artist);
  if(notesSongId!==id) currentNotes=[];
  const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
  const addedLink = s.addedBy && s.addedBy!=="seed" ? `Added by <a data-go="/user/${s.addedBy}">${esc(nameOf(s.addedBy,s.addedByName))}</a>` : `From the original songbook`;
  const myNoteText = myPersonalNotes[id] !== undefined ? myPersonalNotes[id] : (currentNotes.find(n=>n.uid===me.uid)||{text:""}).text;
  const others = currentNotes.filter(n=>n.uid!==me.uid);
  const othersHtml = others.length?others.map(n=>`
    <div class="noteitem"><div class="notewho" data-go="/user/${n.uid}">${avatar(nameOf(n.uid,n.name),colorOf(n.uid,n.color),22)}<span class="nm">${esc(nameOf(n.uid,n.name))}</span></div>
    <div class="notetext">${linkify(n.text)}</div></div>`).join(""):`<div class="notetext" style="color:var(--faint)">No notes from others yet.</div>`;
  const inner=`
    <button class="back" data-back="1">&larr; Songs</button>
    <div class="dhead">
      <div class="dtitle">${esc(s.title)}</div><div class="dartist">${esc(s.artist)}</div>
      <div class="dadded">${addedLink} &middot; <button class="edit-pencil" id="editsong">Edit details</button></div>
      ${tags?`<div class="dtags">${tags}</div>`:""}
    </div>
    <div class="section"><h3>Listen</h3><div class="listen">
      <a class="spotify" href="${L.spotify}" target="_blank" rel="noopener">Spotify</a>
      <a class="apple" href="${L.apple}" target="_blank" rel="noopener">Apple Music</a></div></div>
    <div class="section"><h3>My lists</h3><div class="mystatus">
      <button class="sbtn todo ${e.status==='todo'?'on':''}" data-set="todo" data-id="${id}">To-Do</button>
      <button class="sbtn known ${e.status==='known'?'on':''}" data-set="known" data-id="${id}">Currently Know</button>
      <button class="star ${e.starred?'on':''}" data-star="${id}" aria-label="favorite">${starSvg(e.starred)}</button></div></div>
    ${supplyDemandSection(id)}
    <div class="section"><h3>My notes <button class="expandtog" data-expand="mynotes">Expand</button></h3>
      <textarea class="notes" id="mynotes" placeholder="Your own notes (everyone can see these too).">${esc(myNoteText)}</textarea>
      <button class="savenote" id="savemine" disabled>Save my notes</button><span class="savedmsg" id="minesaved"></span></div>
    <div class="section"><h3>Everyone&rsquo;s notes</h3><div class="notefeed">${othersHtml}</div></div>
    <button class="ghostbtn danger" id="delsong">Delete this song from the songbook</button>`;
  const _cap={mine:(()=>{const el=$("mynotes");return el?el.value:null;})(),
    mineEx:(()=>{const el=$("mynotes");return el?el.classList.contains("expanded"):false;})(),
    focus:document.activeElement&&document.activeElement.id,sel:(document.activeElement&&typeof document.activeElement.selectionStart==='number')?document.activeElement.selectionStart:null};
  root.innerHTML=chrome(inner,"home");
  if(lastSong===id){
    if(_cap.mine!=null){const el=$("mynotes");if(el){el.value=_cap.mine;const sm=$("savemine");if(sm)sm.disabled=(el.value.trim()===myNoteText.trim());}}
    if(_cap.mineEx){const el=$("mynotes");if(el){el.classList.add("expanded");const t=document.querySelector('[data-expand="mynotes"]');if(t)t.textContent="Collapse";}}
    if(_cap.focus){const el=$(_cap.focus);if(el){el.focus();if(_cap.sel!=null){try{el.setSelectionRange(_cap.sel,_cap.sel);}catch(e){}}}}
  }
  lastSong=id;
  if(notesSongId!==id){
    if(detachNotes){detachNotes();detachNotes=null;}
    notesSongId=id;
    detachNotes=F.onSnapshot(F.collection(db,"songs",id,"notes"),snap=>{
      currentNotes=snap.docs.map(d=>({uid:d.id,...d.data()}));
      const mine=currentNotes.find(n=>n.uid===me.uid);
      if(mine) myPersonalNotes[id]=mine.text;
      else if(myPersonalNotes[id]===undefined) myPersonalNotes[id]="";
      const r=route(); if(r.view==="song"&&r.id===id) renderSong(id);
    });
  }
  $("editsong").onclick=()=>openEditSong(id);
  const mine=$("mynotes"), savemine=$("savemine"); const orig=myNoteText;
  mine.addEventListener("input",()=>{ savemine.disabled = mine.value.trim()===orig.trim(); });
  savemine.onclick=async()=>{ savemine.disabled=true; myPersonalNotes[id]=mine.value; await savePersonalNote(id,mine.value); $("minesaved").textContent="Saved"; setTimeout(()=>{const m=$("minesaved");if(m)m.textContent="";},1500); };
  $("delsong").onclick=async()=>{ const b=$("delsong");
    if(b.dataset.confirm){ await deleteSong(id); go("/"); }
    else{ b.dataset.confirm="1"; b.textContent="Tap again to permanently delete"; setTimeout(()=>{const x=$("delsong");if(x){delete x.dataset.confirm;x.textContent="Delete this song from the songbook";}},3000); } };
}

function listItem(s,starred){
  const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
  return `<div class="row" data-id="${s.id}"><button class="star ${starred?'on':''}" data-star="${s.id}" aria-label="favorite">${starSvg(starred)}</button>
    <div class="rowmain" data-open="${s.id}"><div class="rowtitle">${esc(s.title)}</div><div class="rowartist">${esc(s.artist)}</div>${tags?`<div class="badges">${tags}</div>`:""}</div></div>`;
}
async function renderUser(uid){
  if(!uid){ root.innerHTML=chrome(`<div class="empty"><div class="big">No user</div></div>`,"user"); return; }
  if(lastUserView!==uid){ userGenres.clear(); lastUserView=uid; }
  const isMe=uid===me.uid;
  const pname=nameOf(uid,isMe?me.name:"Friend"), pcolor=colorOf(uid,isMe?me.color:null);
  let entries={};
  try{ const snap=await F.getDocs(F.collection(db,"users",uid,"lists")); snap.docs.forEach(d=>entries[d.id]=d.data()); }catch(err){ console.error(err); }
  const collect=status=>Object.entries(entries).filter(([id,v])=>v.status===status&&songsMap[id])
    .map(([id,v])=>({s:songsMap[id],starred:!!v.starred}))
    .filter(it=> userGenres.size===0 || (it.s.genres||[]).some(g=>userGenres.has(g)))
    .sort((a,b)=>(b.starred?1:0)-(a.starred?1:0)||a.s.title.localeCompare(b.s.title));
  const known=collect("known"), todo=collect("todo");
  // genre chips built from everything this person has in either list
  const ugSet=new Set();
  Object.entries(entries).forEach(([id,v])=>{ if((v.status==='known'||v.status==='todo')&&songsMap[id]) (songsMap[id].genres||[]).forEach(g=>ugSet.add(g)); });
  const ugKnown=Object.keys(GENRE_COLORS).filter(g=>ugSet.has(g));
  const ugExtra=[...ugSet].filter(g=>!GENRE_COLORS[g]).sort();
  const ugAll=[...ugKnown,...ugExtra];
  const ugChips = ugAll.length? `<div class="filters" id="ufilters"><button class="chip all ${userGenres.size===0?'on':''}" data-ugenre="__all">All</button>`+
    ugAll.map(g=>`<button class="chip ${userGenres.has(g)?'on':''}" style="--gc:${gcolor(g)}" data-ugenre="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`).join("")+`</div>` : "";
  const sec=(cls,label,items)=>{ const col=collapsed[cls]?" collapsed":"";
    return `<div class="listsec ${cls}${col}"><button class="lh" data-collapse="${cls}"><span class="dot"></span><h2>${label}</h2><span class="ct">${items.length}</span><span class="chev">${collapsed[cls]?"\u203A":"\u2304"}</span></button>
    <div class="list seclist">${items.length?items.map(it=>listItem(it.s,it.starred)).join(""):`<div class="empty" style="padding:24px"><div style="color:var(--faint)">${userGenres.size?"Nothing in this genre.":"Nothing here yet."}</div></div>`}</div></div>`; };
  const inner=`
    <div style="display:flex;align-items:center;gap:14px;margin:16px 2px 6px">${avatar(pname,pcolor,56)}
      <div><div class="ptitle" style="margin:0;font-size:26px">${esc(pname)}${isMe?" (you)":""}</div>
      <div class="psub" style="margin:4px 0 0">${known.length} known &middot; ${todo.length} to learn${isMe?` &middot; <button class="edit-pencil" id="editname" style="font-size:13px">Edit name</button> &middot; <button class="edit-pencil" id="codebtn" style="font-size:13px">Recovery code</button> &middot; <button class="edit-pencil" id="adminbtn" style="font-size:13px">Admin${isAdmin?" \u2713":""}</button>`:""}</div></div></div>
    ${(!isMe&&isAdmin)?`<div style="display:flex;gap:8px;margin:0 2px 4px"><button class="minibtn" data-arename="${uid}">Rename</button><button class="minibtn danger" data-aremove="${uid}">Remove person</button></div>`:""}
    ${isMe?"":`<button class="back" data-go="/people" style="padding-top:4px">&larr; All people</button>`}
    ${ugChips}
    ${sec("known","Currently Know",known)}
    ${sec("todo","To-Do",todo)}`;
  root.innerHTML=chrome(inner,"user");
  const en=$("editname"); if(en) en.onclick=openEditName;
  const cb=$("codebtn"); if(cb) cb.onclick=openCodeSheet;
  const ab=$("adminbtn"); if(ab) ab.onclick=openAdminSheet;
}

function renderPeople(){
  const ids=Object.keys(usersMap);
  ids.sort((a,b)=>(a===me.uid?-1:b===me.uid?1:(usersMap[a].name||"").localeCompare(usersMap[b].name||"")));
  const cards=ids.map(uid=>{ const u=usersMap[uid];
    const adminActions = isAdmin?`<div class="padmin"><button class="minibtn" data-arename="${uid}">Rename</button>${uid!==me.uid?`<button class="minibtn danger" data-aremove="${uid}">Remove</button>`:""}</div>`:"";
    return `<div class="person ${uid===me.uid?'merow':''}" data-go="/user/${uid}">${avatar(u.name,u.color,42)}
      <div style="flex:1;min-width:0"><div class="pn">${esc(u.name||"Friend")}${uid===me.uid?" (you)":""}</div><div class="pc">View their lists &amp; notes</div></div>${adminActions}</div>`;
  }).join("");
  const inner=`<div class="ptitle">People</div><div class="psub">Tap anyone to see what they know and want to learn${isAdmin?` &middot; <span style="color:var(--amber)">admin on</span>`:""}</div>
    <div class="list" style="gap:10px">${cards||`<div class="empty"><div class="big">Just you so far</div>Share the link to bring friends around the fire.</div>`}</div>`;
  root.innerHTML=chrome(inner,"people");
}

function renderSpin(){
  const known=Object.entries(myLists).filter(([id,v])=>v.status==='known'&&songsMap[id]).map(([id])=>songsMap[id]);
  const knownIds=new Set(known.map(s=>s.id));
  // keep played set valid against current known list
  [...spinPlayed].forEach(id=>{ if(!knownIds.has(id)) spinPlayed.delete(id); });
  const pool=noRepeats? known.filter(s=>!spinPlayed.has(s.id)) : known;
  const playedCount=spinPlayed.size;
  const inner=`
    <div class="ptitle">What should I play?</div>
    <div class="psub">Spins from your Currently Know list (${known.length} song${known.length!==1?"s":""})</div>
    ${known.length===0
      ? `<div class="empty" style="padding:50px 20px"><div class="big">Nothing to spin yet</div>Add songs to your <b>Currently Know</b> list and they'll show up here.</div>`
      : `<div class="spinopts">
           <button class="toggle ${noRepeats?'on':''}" id="norep" role="switch" aria-checked="${noRepeats}"><span class="kn"></span><span class="tl">No repeats</span></button>
           ${noRepeats?`<button class="resetbtn" id="resetspin">Reset (${playedCount} played)</button>`:""}
         </div>
         <div class="slot"><div class="slot-window"><div class="slot-reel" id="reel"></div></div></div>
         <button class="spinbtn" id="spinbtn"${pool.length===0?" disabled":""}>${pool.length===0?"All played \u2014 reset to spin":"Spin the wheel"}</button>
         <div class="spin-pick" id="pick"></div>`}`;
  root.innerHTML=chrome(inner,"spin");
  if(known.length===0) return;
  const reel=$("reel"), btn=$("spinbtn"), pick=$("pick");
  const cell=s=>`<div class="slot-cell"><div class="sc-title">${esc(s.title)}</div><div class="sc-artist">${esc(s.artist)}</div></div>`;
  reel.innerHTML=(pool.length?pool:known).map(cell).join("");
  $("norep").onclick=()=>{ noRepeats=!noRepeats; renderSpin(); };
  const rs=$("resetspin"); if(rs) rs.onclick=()=>{ spinPlayed.clear(); renderSpin(); };
  let spinning=false;
  btn.onclick=()=>{
    if(spinning||pool.length===0) return; spinning=true; pick.innerHTML=""; btn.disabled=true; btn.textContent="Spinning\u2026";
    const winner=pool[Math.floor(Math.random()*pool.length)];
    const strip=[]; const spins=18+Math.floor(Math.random()*8);
    for(let i=0;i<spins;i++) strip.push(known[Math.floor(Math.random()*known.length)]);
    strip.push(winner);
    reel.innerHTML=strip.map(cell).join("");
    const cellH=72;
    reel.style.transition="none"; reel.style.transform="translateY(0)";
    void reel.offsetHeight;
    const target=(strip.length-1)*cellH;
    const dur=2600+Math.random()*700;
    reel.style.transition=`transform ${dur}ms cubic-bezier(.12,.7,.16,1)`;
    reel.style.transform=`translateY(-${target}px)`;
    setTimeout(()=>{
      if(noRepeats) spinPlayed.add(winner.id);
      const remaining = noRepeats ? known.filter(s=>!spinPlayed.has(s.id)).length : known.length;
      spinning=false;
      pick.innerHTML=`<div class="pick-card" data-open="${winner.id}">
        <div class="pick-label">Play this one</div>
        <div class="pick-title">${esc(winner.title)}</div>
        <div class="pick-artist">${esc(winner.artist)}</div>
        <div class="pick-tap">Tap to open the song &rarr;</div></div>`;
      // refresh controls (reset count / pool) without wiping the reveal
      const rb=$("resetspin"); if(rb) rb.textContent=`Reset (${spinPlayed.size} played)`;
      if(noRepeats && remaining===0){ btn.disabled=true; btn.textContent="All played \u2014 reset to spin"; }
      else { btn.disabled=false; btn.textContent="Spin again"; }
    },dur+60);
  };
}

function render(){
  const r=route();
  if(r.view!=="song" && detachNotes){ detachNotes(); detachNotes=null; notesSongId=null; currentNotes=[]; }
  if(r.view==="home") renderHome();
  else if(r.view==="song") renderSong(r.id);
  else if(r.view==="people") renderPeople();
  else if(r.view==="spin") renderSpin();
  else if(r.view==="user") renderUser(r.uid);
  else renderHome();
}

/* ---------- global clicks ---------- */
document.addEventListener("click",e=>{
  const col=e.target.closest("[data-collapse]"); if(col){ const k=col.getAttribute("data-collapse"); collapsed[k]=!collapsed[k]; render(); return; }
  const ex=e.target.closest("[data-expand]"); if(ex){ const ta=$(ex.getAttribute("data-expand")); if(ta){ const on=ta.classList.toggle("expanded"); ex.textContent=on?"Collapse":"Expand"; } return; }
  const ar=e.target.closest("[data-arename]"); if(ar){ e.stopPropagation(); adminRenameSheet(ar.getAttribute("data-arename")); return; }
  const arm=e.target.closest("[data-aremove]"); if(arm){ e.stopPropagation(); adminRemoveSheet(arm.getAttribute("data-aremove")); return; }
  const g=e.target.closest("[data-go]"); if(g){ go(g.getAttribute("data-go")); return; }
  if(e.target.closest("[data-back]")){ history.length>1?history.back():go("/"); return; }
  const open=e.target.closest("[data-open]"); if(open){ closeSheet(); go("/song/"+open.getAttribute("data-open")); return; }
  const plus=e.target.closest("[data-plus]"); if(plus){ e.stopPropagation(); openListSheet(plus.getAttribute("data-plus")); return; }
  const star=e.target.closest("[data-star]"); if(star){ e.stopPropagation(); toggleStar(star.getAttribute("data-star")); return; }
  const setb=e.target.closest("[data-set]"); if(setb){ const st=setb.getAttribute("data-set"); const sid=setb.getAttribute("data-id"); const cur=myEntry(sid).status; setStatus(sid, cur===st?null:st); return; }
  const ug=e.target.closest("[data-ugenre]"); if(ug){ const v=ug.getAttribute("data-ugenre");
    if(v==="__all") userGenres.clear(); else { userGenres.has(v)?userGenres.delete(v):userGenres.add(v); }
    render(); return; }
  const sb=e.target.closest("[data-sort]"); if(sb){ const m=sb.getAttribute("data-sort");
    if(sortMode===m){ sortDir=sortDir==="desc"?"asc":"desc"; } else { sortMode=m; sortDir="desc"; }
    renderHome(); return; }
  const gen=e.target.closest("[data-genre]"); if(gen){ const v=gen.getAttribute("data-genre");
    if(v==="__all"){ activeGenres.clear(); excludeGenres.clear(); }
    else if(activeGenres.has(v)){ activeGenres.delete(v); excludeGenres.add(v); }      // include -> exclude
    else if(excludeGenres.has(v)){ excludeGenres.delete(v); }                            // exclude -> off
    else { activeGenres.add(v); }                                                        // off -> include
    renderHome(); return; }
});

/* ============================================================
   SHEETS
   ============================================================ */
const scrim=$("scrim"), sheet=$("sheet");
function openSheet(html){ sheet.innerHTML=`<div class="grip"></div>`+html; scrim.classList.add("open"); sheet.classList.add("open"); }
function closeSheet(){ scrim.classList.remove("open"); sheet.classList.remove("open"); }
scrim.onclick=closeSheet;
const check=`<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-9"/></svg>`;

function openListSheet(id){
  const s=songsMap[id]; if(!s) return; const e=myEntry(id);
  openSheet(`<h2>${esc(s.title)}</h2><p class="sh-sub">Add to one of your lists</p>
    <button class="opt todo ${e.status==='todo'?'on':''}" data-act="todo"><span class="ic">${check}</span>To-Do list</button>
    <button class="opt known ${e.status==='known'?'on':''}" data-act="known"><span class="ic">${check}</span>Currently Know</button>
    ${e.status?`<button class="opt remove" data-act="none"><span class="ic">&times;</span>Remove from my lists</button>`:""}`);
  sheet.querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{ const a=b.getAttribute("data-act"); await setStatus(id,a==="none"?null:a); closeSheet(); });
}

let pickGenres=new Set();
function openAddSheet(){
  pickGenres=new Set();
  const chips=allGenres().map(g=>`<button class="chip" style="--gc:${gcolor(g)}" data-pick="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`).join("");
  openSheet(`<h2>Add a song</h2><p class="sh-sub">It joins the shared songbook for everyone</p>
    <div class="field"><label>Song title</label><input class="txt" id="f-title" placeholder="e.g. Wagon Wheel" autocomplete="off"></div>
    <div class="field"><label>Artist</label><input class="txt" id="f-artist" placeholder="e.g. Darius Rucker" autocomplete="off"></div>
    <div class="field"><label>Genres (tap any that fit)</label><div class="gpick" id="gpick">${chips}</div>
      <div class="newg"><input class="txt" id="f-newg" placeholder="Add a new genre&hellip;" autocomplete="off"><button id="addg">Add</button></div></div>
    <button class="save" id="savesong" disabled>Add to songbook</button>`);
  const valid=()=>{ $("savesong").disabled=!$("f-title").value.trim()||pickGenres.size===0; };
  const repaint=()=>sheet.querySelectorAll("[data-pick]").forEach(b=>b.classList.toggle("on",pickGenres.has(b.getAttribute("data-pick"))));
  sheet.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{ const g=b.getAttribute("data-pick"); pickGenres.has(g)?pickGenres.delete(g):pickGenres.add(g); repaint(); valid(); });
  $("f-title").addEventListener("input",valid);
  $("addg").onclick=()=>{ const v=$("f-newg").value.trim(); if(!v)return; const g=v.replace(/\s+/g," "); pickGenres.add(g);
    const c=document.createElement("button"); c.className="chip on"; c.style.setProperty("--gc",gcolor(g)); c.setAttribute("data-pick",g); c.innerHTML=`<span class="dot"></span>${esc(g)}`;
    c.onclick=()=>{ pickGenres.has(g)?pickGenres.delete(g):pickGenres.add(g); c.classList.toggle("on"); valid(); }; $("gpick").appendChild(c); $("f-newg").value=""; valid(); };
  $("f-newg").addEventListener("keydown",ev=>{ if(ev.key==="Enter"){ev.preventDefault();$("addg").click();} });
  $("savesong").onclick=()=>{ const t=$("f-title").value.trim(), a=$("f-artist").value.trim()||"Unknown"; if(!t||!pickGenres.size)return;
    const norm=x=>x.toLowerCase().replace(/[^a-z0-9]/g,"");
    const dupes=songs.filter(s=>norm(s.title)===norm(t));
    if(dupes.length){ confirmDuplicate(t,a,[...pickGenres],dupes); return; }
    commitAdd(t,a,[...pickGenres]);
  };
}
async function commitAdd(t,a,genres){ await addSong(t,a,genres); closeSheet(); go("/"); }
function confirmDuplicate(t,a,genres,dupes){
  const list=dupes.map(s=>{
    const sd=allLists[s.id]||{known:[],todo:[]};
    const who=(s.addedBy&&s.addedBy!=="seed")?`Added by ${esc(nameOf(s.addedBy,s.addedByName))}`:"From the original songbook";
    const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
    return `<div class="dupcard" data-open="${s.id}">
      <div class="rowtitle">${esc(s.title)}</div><div class="rowartist">${esc(s.artist)}</div>
      <div class="rowadded">${who} &middot; ${sd.known.length} know &middot; ${sd.todo.length} to-do</div>
      ${tags?`<div class="badges" style="margin-top:6px">${tags}</div>`:""}</div>`;
  }).join("");
  openSheet(`<h2>Already in the songbook?</h2><p class="sh-sub">A song with this name already exists. Is it the same one?</p>
    ${list}
    <button class="save" id="dup-cancel" style="background:var(--card-hi);color:var(--cream);border:1px solid var(--line)">It's already there &mdash; cancel</button>
    <button class="ghostbtn" id="dup-add">No, add mine anyway</button>`);
  $("dup-cancel").onclick=closeSheet;
  $("dup-add").onclick=()=>{ commitAdd(t,a,genres); };
}

function openEditSong(id){
  const s=songsMap[id]; if(!s) return;
  let editG=new Set(s.genres||[]);
  const chips=allGenres().map(g=>`<button class="chip ${editG.has(g)?'on':''}" style="--gc:${gcolor(g)}" data-epick="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`).join("");
  openSheet(`<h2>Edit song</h2><p class="sh-sub">Fix the title, artist, or genres for everyone</p>
    <div class="field"><label>Song title</label><input class="txt" id="e-title" value="${esc(s.title)}"></div>
    <div class="field"><label>Artist</label><input class="txt" id="e-artist" value="${esc(s.artist)}"></div>
    <div class="field"><label>Genres (tap any that fit)</label><div class="gpick" id="egpick">${chips}</div>
      <div class="newg"><input class="txt" id="e-newg" placeholder="Add a new genre&hellip;" autocomplete="off"><button id="eaddg">Add</button></div></div>
    <button class="save" id="esave">Save changes</button>`);
  sheet.querySelectorAll("[data-epick]").forEach(b=>b.onclick=()=>{ const g=b.getAttribute("data-epick"); editG.has(g)?editG.delete(g):editG.add(g); b.classList.toggle("on"); });
  $("eaddg").onclick=()=>{ const v=$("e-newg").value.trim(); if(!v)return; const g=v.replace(/\s+/g," "); editG.add(g);
    const c=document.createElement("button"); c.className="chip on"; c.style.setProperty("--gc",gcolor(g)); c.setAttribute("data-epick",g); c.innerHTML=`<span class="dot"></span>${esc(g)}`;
    c.onclick=()=>{ editG.has(g)?editG.delete(g):editG.add(g); c.classList.toggle("on"); }; $("egpick").appendChild(c); $("e-newg").value=""; };
  $("e-newg").addEventListener("keydown",ev=>{ if(ev.key==="Enter"){ev.preventDefault();$("eaddg").click();} });
  $("esave").onclick=async()=>{ const t=$("e-title").value.trim(), a=$("e-artist").value.trim(); if(!t)return;
    const b=$("esave"); b.disabled=true; b.textContent="Saving\u2026"; await saveSongFields(id,{title:t,artist:a||"Unknown",genres:[...editG]}); closeSheet(); };
}

function nameSheet(targetUid){
  const isSelf = targetUid===me.uid;
  const u = isSelf ? {name:me.name,color:me.color} : (usersMap[targetUid]||{name:"",color:colorFor(targetUid)});
  let color=u.color||colorFor(targetUid);
  const sw=PAL.map(c=>`<button class="swatch ${c===color?'on':''}" data-color="${c}" style="background:${c}"></button>`).join("");
  openSheet(`<h2>${isSelf?"Your name":"Rename person"}</h2><p class="sh-sub">${isSelf?"This is how you show up to everyone":"Admin: change this person's name"}</p>
    <div class="field"><input class="txt" id="n-name" value="${esc(u.name)}" maxlength="24"></div>
    <div class="swatches">${sw}</div>
    <button class="save" id="nsave">Save</button>`);
  sheet.querySelectorAll("[data-color]").forEach(b=>b.onclick=()=>{ color=b.getAttribute("data-color"); sheet.querySelectorAll(".swatch").forEach(x=>x.classList.toggle("on",x.getAttribute("data-color")===color)); });
  $("nsave").onclick=async()=>{ const n=$("n-name").value.trim(); if(!n)return;
    if(isSelf){ saveProfile(n,color); await ensureProfile(); } else { await adminRename(targetUid,n,color); }
    closeSheet(); render(); };
}
function openEditName(){ nameSheet(me.uid); }
function openCodeSheet(){
  openSheet(`<h2>Your recovery code</h2><p class="sh-sub">Save this somewhere safe. If you delete the app or switch phones, enter it to get your lists and notes back.</p>
    <div class="codebox" id="codebox">${esc(me.uid)}</div>
    <button class="save" id="copycode">Copy code</button>
    <button class="ghostbtn" id="closecode">Done</button>`);
  $("copycode").onclick=async()=>{ try{ await navigator.clipboard.writeText(me.uid); $("copycode").textContent="Copied \u2713"; }catch(e){ $("copycode").textContent="Select &amp; copy above"; } };
  $("closecode").onclick=closeSheet;
}
function adminRenameSheet(uid){ nameSheet(uid); }
function adminRemoveSheet(uid){
  const nm=nameOf(uid,"this person");
  openSheet(`<h2>Remove ${esc(nm)}?</h2><p class="sh-sub">This deletes their To-Do/Known lists and their notes. Songs they added to the shared list stay.</p>
    <button class="save" id="rmok" style="background:linear-gradient(180deg,#d9694a 0%,#c0653f 100%);color:#fff">Remove ${esc(nm)}</button>
    <button class="ghostbtn" id="rmcancel">Cancel</button>`);
  $("rmcancel").onclick=closeSheet;
  $("rmok").onclick=async()=>{ const b=$("rmok"); b.disabled=true; b.textContent="Removing\u2026"; try{ await adminRemove(uid); }catch(e){ console.error(e); } closeSheet(); go("/people"); render(); };
}
async function openAdminSheet(){
  openSheet(`<h2>Admin</h2><p class="sh-sub">Checking&hellip;</p>`);
  if(isAdmin){
    openSheet(`<h2>Admin mode is on</h2><p class="sh-sub">Open the People tab to rename or remove anyone. Changes apply for everyone.</p>
      <button class="ghostbtn" id="adminoff">Turn off admin on this device</button>`);
    $("adminoff").onclick=()=>{ setAdmin(false); closeSheet(); render(); };
    return;
  }
  let hash=null; try{ hash=await getAdminHash(); }catch(e){}
  if(!hash){
    openSheet(`<h2>Set up admin</h2><p class="sh-sub">Create an admin passphrase (4+ characters). Anyone who knows it gets admin powers, so keep it to yourself.</p>
      <div class="field"><label>New passphrase</label><input class="txt" id="a-p1" type="password" autocomplete="new-password"></div>
      <div class="field"><label>Confirm passphrase</label><input class="txt" id="a-p2" type="password" autocomplete="new-password"></div>
      <button class="save" id="asetup" disabled>Set passphrase &amp; unlock</button>
      <div class="savedmsg" id="aerr" style="color:#e89;margin-left:0;display:block;margin-top:10px"></div>`);
    const v=()=>{ $("asetup").disabled=!($("a-p1").value.length>=4 && $("a-p1").value===$("a-p2").value); };
    $("a-p1").addEventListener("input",v); $("a-p2").addEventListener("input",v);
    $("asetup").onclick=async()=>{ const b=$("asetup"); b.disabled=true; b.textContent="Saving\u2026"; const h=await sha256($("a-p1").value); await setAdminHash(h); setAdmin(true); closeSheet(); render(); };
    return;
  }
  openSheet(`<h2>Admin access</h2><p class="sh-sub">Enter the admin passphrase to unlock management tools on this device.</p>
    <div class="field"><input class="txt" id="a-p" type="password" autocomplete="current-password" placeholder="Passphrase"></div>
    <button class="save" id="aunlock">Unlock</button>
    <div class="savedmsg" id="aerr" style="color:#e89;margin-left:0;display:block;margin-top:10px"></div>`);
  const tryUnlock=async()=>{ const h=await sha256($("a-p").value); if(h===hash){ setAdmin(true); closeSheet(); render(); } else { $("aerr").textContent="That passphrase didn't match."; } };
  $("aunlock").onclick=tryUnlock;
  $("a-p").addEventListener("keydown",ev=>{ if(ev.key==="Enter"){ev.preventDefault();tryUnlock();} });
}

/* ============================================================
   NAME GATE (first run)
   ============================================================ */
function renderGate(){
  let color=PAL[0];
  root.innerHTML=`<div class="gate">${FLAME}<h1>Campfire Songbook</h1>
    <p>Pick a name so your friends can see which songs you know and want to learn.</p>
    <input id="g-name" type="text" placeholder="Your name" maxlength="24" autocomplete="off">
    <div class="swatches">${PAL.map((c,i)=>`<button class="swatch ${i===0?'on':''}" data-color="${c}" style="background:${c}"></button>`).join("")}</div>
    <button class="enter" id="g-enter" disabled>Enter the campfire</button>
    <button class="restore" id="g-restore">I have a recovery code</button>
    <div class="gerr" id="g-err"></div></div>`;
  const inp=$("g-name"), btn=$("g-enter");
  inp.addEventListener("input",()=>btn.disabled=!inp.value.trim());
  document.querySelectorAll(".swatch").forEach(b=>b.onclick=()=>{ color=b.getAttribute("data-color"); document.querySelectorAll(".swatch").forEach(x=>x.classList.toggle("on",x.getAttribute("data-color")===color)); });
  btn.onclick=async()=>{ const n=inp.value.trim(); if(!n)return; btn.disabled=true; btn.textContent="Lighting the fire\u2026";
    saveProfile(n,color); startListeners(); ensureProfile().catch(e=>console.warn("profile",e)); ensureSeed().catch(e=>console.warn("seed",e)); showNewCode(); };
  $("g-restore").onclick=renderRestore;
  setTimeout(()=>inp.focus(),100);
}
function renderRestore(){
  root.innerHTML=`<div class="gate">${FLAME}<h1>Welcome back</h1>
    <p>Enter your recovery code to bring back your lists and notes.</p>
    <input id="r-code" type="text" placeholder="e.g. ember-7K3Q" autocomplete="off" autocapitalize="off" spellcheck="false">
    <button class="enter" id="r-go" disabled>Restore my profile</button>
    <button class="restore" id="r-back">Start fresh instead</button>
    <div class="gerr" id="r-err"></div></div>`;
  const inp=$("r-code"), btn=$("r-go");
  inp.addEventListener("input",()=>btn.disabled=!inp.value.trim());
  inp.addEventListener("keydown",ev=>{ if(ev.key==="Enter"&&!btn.disabled){ev.preventDefault();btn.click();} });
  btn.onclick=async()=>{ btn.disabled=true; btn.textContent="Looking\u2026"; $("r-err").textContent="";
    const prof=await restoreProfile(inp.value);
    if(prof){ startListeners(); ensureSeed().catch(e=>console.warn("seed",e)); go("/"); render(); }
    else{ btn.disabled=false; btn.textContent="Restore my profile"; $("r-err").textContent="No profile found for that code. Check the spelling, or start fresh."; }
  };
  $("r-back").onclick=renderGate;
  setTimeout(()=>inp.focus(),100);
}
function showNewCode(){
  root.innerHTML=`<div class="gate">${FLAME}<h1>You&rsquo;re in, ${esc(me.name)}</h1>
    <p>This is your recovery code. Save it somewhere — you&rsquo;ll need it to get your lists back if you ever delete the app or switch phones.</p>
    <div class="codebox" style="width:100%">${esc(me.uid)}</div>
    <button class="enter" id="c-copy">Copy code</button>
    <button class="restore" id="c-go">I&rsquo;ve saved it &mdash; continue</button></div>`;
  $("c-copy").onclick=async()=>{ try{ await navigator.clipboard.writeText(me.uid); $("c-copy").textContent="Copied \u2713"; }catch(e){ $("c-copy").textContent="Select the code above to copy"; } };
  $("c-go").onclick=()=>{ go("/"); render(); };
}

/* ============================================================
   BOOT
   ============================================================ */
if(navigator.storage&&navigator.storage.persist){ navigator.storage.persist().catch(()=>{}); }
if("serviceWorker" in navigator){ window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{})); }

(async function boot(){
  me=loadProfile();
  if(!me){ renderGate(); return; }
  root.innerHTML=`<div class="loading">Gathering round the fire&hellip;</div>`;
  // Start listeners and render right away — Firestore's offline cache serves data
  // even with no internet. The profile/seed writes below must NOT block the UI,
  // because offline they hang indefinitely rather than failing.
  startListeners();
  render();
  ensureProfile().catch(e=>console.warn("profile sync deferred",e));
  ensureSeed().catch(e=>console.warn("seed deferred",e));
})();
