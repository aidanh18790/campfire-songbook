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
// Palette for user-created genres so each one gets its own stable color instead of all-orange.
const GENRE_EXTRA_PAL=["#c0653f","#7e9b54","#4f8f86","#5c84b1","#9c6ab0","#c25d80","#3f8f6b","#b07cc6","#cf7d52","#5aa0a8","#a8a85a","#6f9f6b"];
function gcolor(n){
  if(GENRE_COLORS[n]) return `var(${GENRE_COLORS[n]})`;
  if(!n) return "var(--g-other)";
  let h=0; for(const c of String(n)) h=(h*31+c.charCodeAt(0))>>>0;
  return GENRE_EXTRA_PAL[h%GENRE_EXTRA_PAL.length];
}
const FLAME=`<svg class="flame" viewBox="0 0 30 38" fill="none"><path d="M15 1C16 9 23 11 23 21c0 6-3.6 10-8 10s-8-4-8-10c0-4 2-6 3-8 .5 3 2 4 3 4-1-4 1-9 2-16Z" fill="url(#fg)"/><path d="M15 14c1 4 4 5 4 9 0 3-1.8 5-4 5s-4-2-4-5c0-2 1-3 2-4 .3 1.5 1.2 2 2 2-.6-2 0-5 0-7Z" fill="#ffe09a"/><defs><linearGradient id="fg" x1="15" y1="1" x2="15" y2="31" gradientUnits="userSpaceOnUse"><stop stop-color="#ffd24a"/><stop offset="1" stop-color="#ff6a2b"/></linearGradient></defs></svg>`;
const starSvg = on => `<svg width="20" height="20" viewBox="0 0 20 20" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6"><path d="M10 1.8l2.5 5.1 5.6.8-4 4 .95 5.6L10 14.7 4.9 17.3l1-5.6-4-4 5.6-.8z"/></svg>`;
const knownIcon=`<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 10l4 4 9-10"/></svg>`;
const todoIcon=`<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4l3 2"/></svg>`;
const learningIcon=`<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3.5v8"/><circle cx="12.6" cy="12.2" r="2.4"/><path d="M15 3.5l-7 1.8v8.2"/><circle cx="5.6" cy="14.6" r="2.4"/></svg>`;

/* ---------- difficulty (a 0.5-5 scale in half steps = a 10-point system; NOT stars) ---------- */
const LEARNING_LIMIT=3;
function diffColor(level){ return ({1:"#8fc06a",2:"#bcc25a",3:"#e8b35a",4:"#e08a4a",5:"#dd6048"})[Math.round(level)||1]||"var(--faint)"; }
function diffLabel(v){ return `${(+v).toFixed(1)} / 5`; }
// Static little meter used on list rows (read-only). Bars fill bottom-up; a half value
// leaves the top bar half-lit.
function diffBars(level){
  const v=Math.max(0,Math.min(5,level||0)); const col=diffColor(v); let out="";
  for(let i=1;i<=5;i++){
    if(v>=i) out+=`<i class="db on" style="background:${col}"></i>`;
    else if(v>=i-0.5) out+=`<i class="db half" style="background:linear-gradient(to top,${col} 52%,var(--line-hi) 52%)"></i>`;
    else out+=`<i class="db"></i>`;
  }
  return out;
}
function diffChip(level,title){ if(!level) return ""; return `<span class="cdiff" title="${esc(title||('Difficulty '+(+level).toFixed(1)+'/5'))}">${diffBars(level)}</span>`; }
// Interactive rater (song page + roulette). Each segment has two tap zones: the left half
// sets the .5 value, the right half sets the whole. Tapping the current value clears it.
function diffRater(songId,current,ratable){
  const canRate = ratable!==false;   // default true; pass false to render the meter read-only
  const v=current||0; let segs="";
  for(let i=1;i<=5;i++){
    const col=diffColor(i);
    const fill = v>=i?`width:100%;background:${col}` : v>=i-0.5?`width:50%;background:${col}` : `width:0`;
    // Interactive tap zones only exist when the song is ratable (i.e. in the user's Currently
    // Know list). Otherwise the meter still shows any saved value, just read-only.
    const halves = canRate
      ? `<span class="dhalf l" data-diff="${songId}" data-difflevel="${i-0.5}" aria-label="difficulty ${i-0.5}"></span>`+
        `<span class="dhalf r" data-diff="${songId}" data-difflevel="${i}" aria-label="difficulty ${i}"></span>`
      : "";
    segs+=`<span class="dseg"><span class="dfill" style="${fill}"></span>${halves}</span>`;
  }
  const label = current ? diffLabel(current) : (canRate ? "Tap to rate" : "Not rated");
  return `<div class="diffrater${canRate?"":" ro"}"><div class="dsegs">${segs}</div><span class="dlabel">${label}</span></div>`;
}
/* ---------- arrangement ("how do you play it") ---------- */
// Replaces the old free-text rating note. Three preset choices plus "Other"; the text
// box only shows for "Other". The chosen value is stored in the SAME `diffNote` field
// (a preset string, or the custom text for Other), so the rollup, group average, and
// "how others rated it" list keep working with no data migration. Pre-existing free-text
// notes simply read back as an "Other" value, which is fine.
const ARRANGEMENTS=["As recorded","Simple strumming","Fingerstyle"];
let arrangeOther=new Set(); // songIds where the user has the Other text box open (may be unsaved yet)
function arrangePicker(songId,current,enabled,inputId,saveId,savedId){
  const cur=(current||"").trim();
  const isPreset=ARRANGEMENTS.includes(cur);
  const otherOpen=arrangeOther.has(songId)||(cur!==""&&!isPreset);   // Other wins if it's open, even before a clear write lands
  const selPreset=otherOpen?null:(isPreset?cur:null);
  const dis=enabled?"":" disabled";
  const chips=ARRANGEMENTS.map(a=>`<button class="achip ${selPreset===a?'on':''}" data-arrange="${songId}" data-arrval="${esc(a)}"${dis}>${esc(a)}</button>`).join("")
    +`<button class="achip ${otherOpen?'on':''}" data-arrange="${songId}" data-arrval="__other"${dis}>Other</button>`;
  const boxVal=(cur!==""&&!isPreset)?cur:"";
  const box=otherOpen
    ?`<div class="arrange-other"><input class="txt diffnote-in" id="${inputId}" maxlength="140" placeholder="Describe the arrangement&hellip;" value="${esc(boxVal)}"${dis}>
        <button class="savenote" id="${saveId}" disabled>Save</button><span class="savedmsg" id="${savedId}"></span></div>`
    :"";
  return `<div class="arrange-chips">${chips}</div>${box}`;
}
// Average difficulty across everyone (from the collection-group rollup in allLists).
function avgDiff(id){ const sd=allLists[id]; if(!sd||!sd.diffs||!sd.diffs.length) return null; const sum=sd.diffs.reduce((a,b)=>a+b,0); return {value:sum/sd.diffs.length,count:sd.diffs.length}; }
const searchLinks = (title,artist)=>{ const q=encodeURIComponent(`${title} ${artist}`.trim()); return { spotify:`https://open.spotify.com/search/${q}`, apple:`https://music.apple.com/search?term=${q}` }; };

const PAL=["#c0653f","#d99b3c","#7e9b54","#4f8f86","#5c84b1","#9c6ab0","#c25d80","#3f8f6b"];
function colorFor(id){ let h=0; for(const c of String(id)) h=(h*31+c.charCodeAt(0))>>>0; return PAL[h%PAL.length]; }
function initialsOf(name){ const p=String(name||"?").trim().split(/\s+/).filter(Boolean); const s=(p[0]?p[0][0]:"")+(p[1]?p[1][0]:""); return (s||"?").toUpperCase(); }
function avatar(name,color,size){ const fs=Math.round(size*0.4); return `<span class="av" style="width:${size}px;height:${size}px;background:${color||'#c8a86a'};font-size:${fs}px">${esc(initialsOf(name))}</span>`; }
function nameOf(uid,fallback){ return (usersMap[uid]&&usersMap[uid].name)||fallback||"Friend"; }
function colorOf(uid,fallback){ return (usersMap[uid]&&usersMap[uid].color)||fallback||colorFor(uid); }
// Firestore Timestamp -> milliseconds (0 if missing). Used to sort a person's lists by
// when a song was added to THEIR list (not when it joined the songbook).
function tsMillis(ts){ if(!ts) return 0; if(typeof ts.toMillis==="function") return ts.toMillis(); if(typeof ts.seconds==="number") return ts.seconds*1000; return 0; }

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
let addedByFilter=null;        // home: filter songs by who added them (uid or "seed"), null = anyone
let learningOnly=false;        // home: show only songs someone is currently learning
let filtersOpen=false;         // home: whether the genre + added-by filter panel is expanded
let sortMode="added", sortDir="desc";  // added|known|todo|difficulty ; desc|asc
let collapsed={known:false,todo:false,learning:false,starred:false};
// Personal-page filters/sorters — mirror the home page but kept independent so filtering
// your own lists never changes the main page (and vice versa). Reset when you switch people.
let uQuery="", userGenresInc=new Set(), userGenresExc=new Set(), uSort="added", uSortDir="desc";
let uStarOnly=false;           // personal page: show only this person's starred songs
let uFiltersOpen=false;        // personal page: whether the genre + starred filter panel is expanded
let scrollMem={};              // remembers each list view's scroll so leaving/returning doesn't jump to top
let noRepeats=false, spinPlayed=new Set();
let lastSpinPick=null;     // id of the song the wheel last landed on (survives re-renders so rating it doesn't wipe the reveal)
let lastUserView=null;
let profUid=null;        // uid whose lists are cached in profEntries (other people only)
let profEntries=null;    // fetch-once-per-visit cache of a profile's lists subcollection
let profLoading=null;    // uid currently being fetched (dedupes concurrent loads)
let profGen=0;           // generation token; a superseded in-flight fetch is discarded
let isAdmin=(()=>{try{return localStorage.getItem("cf-admin")==="1";}catch(e){return false;}})();
let detachNotes=null, currentNotes=[], notesSongId=null, lastSong=null;
let myPersonalNotes={};  // songId -> text, populated by the notes listener, survives navigation

/* Lightweight toast (e.g. "Currently Learning is full"). */
let toastTimer=null;
function toast(msg){
  let t=$("toast");
  if(!t){ t=document.createElement("div"); t.id="toast"; t.className="toast"; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ const x=$("toast"); if(x) x.classList.remove("show"); },2600);
}

const CODE_WORDS=["ember","cedar","river","willow","maple","aspen","spruce","birch","pine","fern","moss","creek","ridge","cabin","trail","flint","spark","glow","drift","stone"];
function newCode(){
  const w=CODE_WORDS[Math.floor(Math.random()*CODE_WORDS.length)];
  const n=Math.random().toString(36).slice(2,6).toUpperCase();
  return w+"-"+n;
}
// Recovery codes ARE the Firestore user-doc id, and doc ids are case-sensitive. newCode()
// produces a lowercase word + an UPPERCASE 4-char suffix (e.g. "ember-A3F9"), and older
// ids use the "u_..." form with underscores. So we must NOT lowercase here and must keep
// underscores — otherwise the lookup never matches the stored doc. Just strip whitespace
// and anything outside the id alphabet.
function normalizeCode(s){ return String(s||"").trim().replace(/\s+/g,"").replace(/[^A-Za-z0-9_-]/g,""); }
// A user might type their code in the wrong case. Since we can't do a case-insensitive
// doc lookup, offer the canonical newCode casing (lowercase word + uppercase suffix) as a
// fallback candidate. Returns a de-duped list of ids to try, most-likely first.
function codeCandidates(code){
  const id=normalizeCode(code);
  const out=[];
  if(id) out.push(id);
  const m=id.match(/^([A-Za-z]+)-([A-Za-z0-9]{4})$/);
  if(m){ const canon=m[1].toLowerCase()+"-"+m[2].toUpperCase(); if(!out.includes(canon)) out.push(canon); }
  return out;
}
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
  const cands=codeCandidates(code);
  if(!cands.length) return null;
  for(const id of cands){
    let snap; try{ snap=await F.getDoc(F.doc(db,"users",id)); }catch(e){ continue; }
    if(!snap||!snap.exists()) continue;
    const d=snap.data();
    setLocalId(id);
    try{ localStorage.setItem("cf-name",d.name||"Friend"); localStorage.setItem("cf-color",d.color||colorFor(id)); }catch(e){}
    me={uid:id,name:d.name||"Friend",color:d.color||colorFor(id)};
    return me;
  }
  return null;
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
  const ref=await F.addDoc(F.collection(db,"songs"),{title,artist,genres,sortKey:Date.now(),addedBy:me.uid,addedByName:me.name});
  return ref.id;
}
async function deleteSong(id){ await F.deleteDoc(F.doc(db,"songs",id)); }
async function saveSongFields(id,fields){ await F.updateDoc(F.doc(db,"songs",id),fields); }
async function savePersonalNote(songId,text){
  const ref=F.doc(db,"songs",songId,"notes",me.uid);
  if(text.trim()) await F.setDoc(ref,{text:text.trim(),name:me.name,color:me.color,uid:me.uid,updatedAt:F.serverTimestamp()});
  else await F.deleteDoc(ref).catch(()=>{});
}
function myEntry(id){ const e=myLists[id]; return {status:(e&&e.status)||null,starred:!!(e&&e.starred),difficulty:(e&&e.difficulty)||null,diffNote:(e&&e.diffNote)||"",featured:!!(e&&e.featured)}; }
function learningCount(){ return Object.values(myLists).filter(v=>v && v.status==='learning').length; }
// One place that writes (or deletes) the current user's entry for a song. The doc is
// kept alive if it carries a status, a star, OR a difficulty rating; otherwise removed.
async function writeEntry(songId,{status,starred,difficulty,diffNote,featured}){
  const ref=F.doc(db,"users",me.uid,"lists",songId);
  const note=(diffNote||"").trim();
  if(!status && !starred && !difficulty){ await F.deleteDoc(ref).catch(()=>{}); return; }
  const prev=myLists[songId];
  // `featured` pins a starred song to the profile's Starred band. Only the band's Customize
  // picker sets it; every other edit preserves the prior value, and an unstarred song can't
  // stay featured.
  const feat=(!starred)?false:((featured===undefined)?!!(prev&&prev.featured):!!featured);
  const data={status:status||null,starred:!!starred,difficulty:difficulty||null,diffNote:note,featured:feat,updatedAt:F.serverTimestamp()};
  // addedAt marks when the song first landed on this person's list — it must never move on
  // later edits (starring, status changes, etc.), or the "Date added" sort would jump the
  // song to the top. Preserve an existing stamp; stamp only a genuinely new entry. A legacy
  // entry that predates addedAt is deliberately left un-stamped (the personal sort falls back
  // to the song's own order for those) rather than being pinned to "now" on its first edit.
  if(prev&&prev.addedAt){ data.addedAt=prev.addedAt; }
  else if(!prev){ data.addedAt=F.serverTimestamp(); }
  await F.setDoc(ref,data);
}
// Returns false if the change was blocked (Currently Learning full), true otherwise.
async function setStatus(songId,status){
  const cur=myEntry(songId);
  if(status==='learning' && cur.status!=='learning' && learningCount()>=LEARNING_LIMIT){
    toast(`Currently Learning is full (max ${LEARNING_LIMIT}). Move one out first.`); return false;
  }
  // A star only makes sense while the song is in Currently Know. Moving it to any other
  // category (or off your lists) drops the star (and, via writeEntry, its featured pin) —
  // but the difficulty rating and its arrangement note stay attached to you, so they're
  // still there (read-only) and become editable again if it returns to Currently Know.
  const keepStar = status==='known' ? cur.starred : false;
  await writeEntry(songId,{status,starred:keepStar,difficulty:cur.difficulty,diffNote:cur.diffNote}); return true;
}
async function toggleStar(songId){
  const cur=myEntry(songId);
  // Stars live only on songs you currently know. Block starring anything else; still allow
  // un-starring a legacy star that predates this rule.
  if(cur.status!=='known' && !cur.starred){ toast("Add this to Currently Know to star it."); return; }
  await writeEntry(songId,{status:cur.status,starred:!cur.starred,difficulty:cur.difficulty,diffNote:cur.diffNote});
}
// Pin/unpin a starred song in the profile's Starred band. Idempotent (explicit on/off,
// not a flip) so rapid taps in the picker can't desync.
async function setFeatured(songId,on){
  const cur=myEntry(songId);
  if(!cur.starred) return;
  await writeEntry(songId,{status:cur.status,starred:cur.starred,difficulty:cur.difficulty,diffNote:cur.diffNote,featured:!!on});
}
async function setDifficulty(songId,level){
  const cur=myEntry(songId);
  // You can only change a rating while the song is in your Currently Know list. A saved rating
  // on a non-known song stays put (shown read-only) until the song is known again.
  if(cur.status!=='known'){ toast("Add this to Currently Know to rate its difficulty."); return; }
  const next=(cur.difficulty===level)?null:level;       // tapping the current value clears it
  const note=next?cur.diffNote:"";                        // clearing the rating clears its arrangement too
  if(!next) arrangeOther.delete(songId);                  // and collapses any open Other box
  await writeEntry(songId,{status:cur.status,starred:cur.starred,difficulty:next,diffNote:note});
}
// Save just the note that accompanies a rating (keeps the rating itself).
async function saveDiffNote(songId,note){
  const cur=myEntry(songId);
  await writeEntry(songId,{status:cur.status,starred:cur.starred,difficulty:cur.difficulty,diffNote:note});
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
      if(!next[songId]) next[songId]={known:[],todo:[],learning:[],diffs:[],diffBy:[]};
      if(v.status==='known') next[songId].known.push(uid);
      else if(v.status==='todo') next[songId].todo.push(uid);
      else if(v.status==='learning') next[songId].learning.push(uid);
      if(typeof v.difficulty==='number' && v.difficulty>=0.5){ next[songId].diffs.push(v.difficulty); next[songId].diffBy.push({uid,difficulty:v.difficulty,note:(v.diffNote||"").trim()}); }
    });
    allLists=next; rerender();
  },err=>console.warn("collectionGroup lists",err));
}

/* ============================================================
   ROUTER
   ============================================================ */
function go(hash){ location.hash=hash; }
// Coalesce rapid calls (e.g. per-keystroke search) into one trailing invocation.
function debounce(fn,ms){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; }
function route(){
  const h=location.hash.replace(/^#/,"")||"/"; const parts=h.split("/").filter(Boolean);
  if(parts[0]==="song") return {view:"song",id:parts[1]};
  if(parts[0]==="people") return {view:"people"};
  if(parts[0]==="spin") return {view:"spin"};
  if(parts[0]==="scales") return {view:"scales"};
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
  <div class="shell">
  <div class="topbar">
    <div class="brand" data-go="/">${FLAME}<span class="name">Songbook</span></div>
    <div class="me"><span class="conn ${online?'live':''}" title="${online?'Online':'Offline'}"></span>${avatar(me.name,me.color,30)}</div>
  </div>
  <div class="wrap">${inner}</div>
  </div>
  <nav class="nav">
    <button data-go="/" class="${active==='home'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/></svg>Songs</button>
    <button data-go="/people" class="${active==='people'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/><path d="M16 6.5a3 3 0 0 1 0 6M17 14c2.5.4 4 2.3 4 5"/></svg>People</button>
    <button data-go="/spin" class="${active==='spin'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 12l5-3"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>Spin</button>
    <button data-go="/scales" class="${active==='scales'?'on':''}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h4v-4h4v-4h4v-4h4v-4"/></svg>Scales</button>
    <button data-go="/me" class="${active==='user'?'on':''}"><span style="margin-bottom:1px">${avatar(me.name,me.color,22)}</span>You</button>
  </nav>`;
}

function songRow(s){
  const e=myEntry(s.id);
  const pill = e.status==='todo'?`<span class="pill todo">To-Do</span>`:e.status==='learning'?`<span class="pill learning">Learning</span>`:e.status==='known'?`<span class="pill known">Known</span>`:"";
  const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
  const badges=(pill||tags)?`<div class="badges">${pill}${tags}</div>`:"";
  const sd=allLists[s.id]||{known:[],todo:[],learning:[],diffs:[]};
  const ad=avgDiff(s.id);
  const diffHtml=ad?diffChip(ad.value,`Average difficulty ${ad.value.toFixed(1)}/5 from ${ad.count}`):"";
  const hasList=sd.known.length||sd.learning.length||sd.todo.length;
  const counter=`<div class="counter">${sd.known.length?`<span class="cknown">${knownIcon} ${sd.known.length}</span>`:""}${sd.learning.length?`<span class="clearning">${learningIcon} ${sd.learning.length}</span>`:""}${sd.todo.length?`<span class="ctodo">${todoIcon} ${sd.todo.length}</span>`:""}${diffHtml}${(!hasList&&!diffHtml)?`<span class="cnone">Not on anyone&rsquo;s list yet</span>`:""}</div>`;
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
// Distinct adders across a set of songs, as [key,label] pairs. key is the uid (or "seed").
function addersOf(list){
  const m=new Map();
  list.forEach(s=>{ const k=s.addedBy||"seed"; if(!m.has(k)) m.set(k, k==="seed"?"Songbook":nameOf(k,s.addedByName)); });
  return [...m.entries()].sort((a,b)=> a[0]==="seed"?-1 : b[0]==="seed"?1 : a[1].localeCompare(b[1]));
}
// Shared filter predicate used by the home AND personal pages.
function songMatches(s,q,inc,exc,adder){
  const g=s.genres||[];
  const mq=!q||s.title.toLowerCase().includes(q)||s.artist.toLowerCase().includes(q);
  const mInc=inc.size===0||g.some(x=>inc.has(x));
  const mExc=exc.size===0||!g.some(x=>exc.has(x));
  const mAdder=!adder||(s.addedBy||"seed")===adder;
  return mq&&mInc&&mExc&&mAdder;
}
// Shared sort comparator (operates on song objects) used by both pages.
function songCmp(mode,dir){
  const cnt=s=>allLists[s.id]||{known:[],todo:[],learning:[],diffs:[]};
  const metric=s=> mode==="known"?cnt(s).known.length : mode==="todo"?cnt(s).todo.length : (s.sortKey||0);
  return (a,b)=>{
    if(mode==="difficulty"){
      const da=avgDiff(a.id), db_=avgDiff(b.id), va=da?da.value:null, vb=db_?db_.value:null;
      if(va==null&&vb==null) return a.title.localeCompare(b.title);
      if(va==null) return 1; if(vb==null) return -1;          // unrated songs sink to the bottom either way
      if(va!==vb) return dir==="asc"?va-vb:vb-va;
      return a.title.localeCompare(b.title);
    }
    if(mode==="known"||mode==="todo"){
      const ma=metric(a), mb=metric(b);
      // Songs with a zero count always sink below songs with a count, regardless of direction
      // (mirrors how unrated songs behave under the difficulty sort).
      if(ma===0&&mb===0) return a.title.localeCompare(b.title);
      if(ma===0) return 1; if(mb===0) return -1;
      if(ma!==mb) return dir==="asc"?ma-mb:mb-ma;
      return a.title.localeCompare(b.title);
    }
    const d=metric(a)-metric(b); if(d!==0) return dir==="asc"?d:-d;
    return a.title.localeCompare(b.title);   // stable tiebreak by title
  };
}
// Remember/restore a list view's scroll position across re-renders and navigation,
// so leaving a song (or rating one) doesn't snap the list back to the top.
function keepScroll(key){
  const w=document.querySelector(".wrap"); if(!w) return;
  w.scrollTop = scrollMem[key]||0;
  w.addEventListener("scroll",()=>{ scrollMem[key]=w.scrollTop; },{passive:true});
}
function filteredSongs(){
  const q=query.trim().toLowerCase();
  return songs.filter(s=>songMatches(s,q,activeGenres,excludeGenres,addedByFilter)
      && (!learningOnly || (((allLists[s.id]&&allLists[s.id].learning)||[]).length>0)))
    .sort(songCmp(sortMode,sortDir));
}
function renderHome(){
  const chips=[`<button class="chip all ${(activeGenres.size===0&&excludeGenres.size===0)?'on':''}" data-genre="__all">All</button>`]
    .concat(allGenres().map(g=>{
      const inc=activeGenres.has(g), exc=excludeGenres.has(g);
      return `<button class="chip ${inc?'on':''} ${exc?'exc':''}" style="--gc:${gcolor(g)}" data-genre="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`;
    })).join("");
  const rows=filteredSongs(); const inc=[...activeGenres], exc=[...excludeGenres];
  const adders=addersOf(songs);
  const adderRow = adders.length>=2
    ? `<div class="filters" id="adderfilter"><button class="chip all ${!addedByFilter?'on':''}" data-addedby="__all">Anyone</button>`+
      adders.map(([k,label])=>`<button class="chip ${addedByFilter===k?'on':''}" data-addedby="${esc(k)}">${avatar(label,k==="seed"?"#c8a86a":colorOf(k),16)}${esc(label)}</button>`).join("")+`</div>`
    : "";
  const adderName = addedByFilter ? (addedByFilter==="seed"?"Songbook":nameOf(addedByFilter,"someone")) : null;
  const viewRow=`<div class="filters" id="viewfilter"><button class="chip ${learningOnly?'on':''}" data-learningonly="1">Being learned</button></div>`;
  const parts=[];
  if(inc.length)parts.push(inc.join(" / "));
  if(exc.length)parts.push("no "+exc.join(" / "));
  if(adderName)parts.push("by "+adderName);
  if(learningOnly)parts.push("being learned");
  let showing;
  if(parts.length) showing=`${rows.length} song${rows.length!==1?"s":""} \u00b7 ${parts.join(", ")}`;
  else showing=query?`${rows.length} match${rows.length!==1?"es":""}`:"All songs";
  const active=(activeGenres.size||excludeGenres.size||query||addedByFilter||learningOnly);
  const filterCount=activeGenres.size+excludeGenres.size+(addedByFilter?1:0)+(learningOnly?1:0);
  const arrow=m=> sortMode!==m?"" : (sortDir==="desc"?" \u2193":" \u2191");
  const lbl={added:"Date added",known:"Most known",todo:"Most to-do",difficulty:"Difficulty"};
  const sortBtn=m=>`<button class="sortbtn ${sortMode===m?'on':''}" data-sort="${m}">${lbl[m]}${arrow(m)}</button>`;
  const filterToggle=`<button class="filtertog ${filtersOpen?'open':''} ${filterCount?'active':''}" id="filtertog">
      <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h14M4.5 9h9M7 14h4"/></svg>
      Filters${filterCount?`<span class="fcount">${filterCount}</span>`:""}</button>`;
  const inner=`
    <div class="ptitle">Campfire Songbook</div>
    <div class="psub">${songs.length} songs &middot; tap a genre to include, tap again to exclude</div>
    <div class="homectl">
      <div class="searchbar"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M16 16l-3.5-3.5"/></svg>
        <input id="search" type="text" placeholder="Search songs or artists&hellip;" autocomplete="off" value="${esc(query)}"></div>
      <div class="ctlbar">${filterToggle}<div class="sortbar" id="sortbar">${sortBtn("added")}${sortBtn("difficulty")}${sortBtn("known")}${sortBtn("todo")}</div></div>
      <div class="filterpanel ${filtersOpen?'open':''}" id="filterpanel">
        <div class="filters" id="filters">${chips}</div>
        ${adderRow}
        ${viewRow}
      </div>
      <div class="meta"><span>${showing}</span><span class="clear ${active?'show':''}" id="clear">Clear</span></div>
    </div>
    <div class="list home-list">${rows.length?rows.map(songRow).join(""):`<div class="empty"><div class="big">No songs found</div>Try a different search or clear filters.</div>`}</div>`;
  const _scrollX={}; ["filters","adderfilter","viewfilter","sortbar"].forEach(k=>{const el=$(k);if(el)_scrollX[k]=el.scrollLeft;});
  root.innerHTML=chrome(inner,"home")+`<button class="fab" id="fab"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 3v12M3 9h12"/></svg>Add a Song</button>`+`<button class="totop" id="totop"><svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14V5M4 9l5-5 5 5"/></svg>Top</button>`;
  Object.keys(_scrollX).forEach(k=>{const el=$(k);if(el){void el.scrollWidth;el.scrollLeft=_scrollX[k];}});
  keepScroll("home");
  const si=$("search"); if(si){ const reHome=debounce(()=>{ if(route().view!=="home") return; renderHome(); const n=$("search"); if(n){ n.focus(); n.setSelectionRange(n.value.length,n.value.length); } },140); si.addEventListener("input",e=>{ query=e.target.value; reHome(); }); }
  $("fab").onclick=openAddSheet; const cl=$("clear"); if(cl) cl.onclick=()=>{activeGenres.clear();excludeGenres.clear();query="";addedByFilter=null;learningOnly=false;renderHome();};
  const ft=$("filtertog"); if(ft) ft.onclick=()=>{ filtersOpen=!filtersOpen; renderHome(); };
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
  const sd=allLists[id]||{known:[],todo:[],learning:[],diffs:[]};
  const knownC=sd.known.length, todoC=sd.todo.length, learnC=(sd.learning||[]).length;
  const knownBlock=`<div class="sdgroup"><div class="sdhead"><span class="sdlabel known">${knownIcon} Known by ${knownC}</span></div>
    <div class="pchips">${knownC?peopleChips(sd.known):`<span class="sdnone">Nobody yet</span>`}</div></div>`;
  const learnBlock=`<div class="sdgroup"><div class="sdhead"><span class="sdlabel learning">${learningIcon} Learning now ${learnC}</span></div>
    <div class="pchips">${learnC?peopleChips(sd.learning):`<span class="sdnone">Nobody yet</span>`}</div></div>`;
  const todoBlock=`<div class="sdgroup"><div class="sdhead"><span class="sdlabel todo">${todoIcon} Want to learn ${todoC}</span></div>
    <div class="pchips">${todoC?peopleChips(sd.todo):`<span class="sdnone">Nobody yet</span>`}</div></div>`;
  return `<div class="section"><h3>Supply &amp; demand</h3>${knownBlock}${learnBlock}${todoBlock}</div>`;
}
function renderSong(id){
  const s=songsMap[id];
  if(!s){ root.innerHTML=chrome(`<button class="back" data-go="/">&larr; Back</button><div class="empty"><div class="big">Song not found</div>It may have been removed.</div>`,"home"); return; }
  const e=myEntry(id); const known=e.status==='known'; const L=searchLinks(s.title,s.artist);
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
      <button class="sbtn learning ${e.status==='learning'?'on':''}" data-set="learning" data-id="${id}">Currently Learning</button>
      <button class="sbtn known ${e.status==='known'?'on':''}" data-set="known" data-id="${id}">Currently Know</button>
      <button class="star ${e.starred?'on':''} ${known?'':'locked'}" data-star="${id}" aria-label="favorite" title="${known?'':'Add to Currently Know to star this'}">${starSvg(e.starred)}</button></div></div>
    <div class="section"><h3>Difficulty</h3>
      ${diffRater(id,e.difficulty,known)}
      ${known?"":`<div class="ratelock">${e.difficulty?"Your difficulty rating is saved &mdash; move this back to <b>Currently Know</b> to change it.":"You can rate how hard it is to play once it&rsquo;s in your <b>Currently Know</b> list."}</div>`}
      ${(known||e.difficulty)?`<div class="arrange">
        <div class="arrange-lbl">${known?(e.difficulty?"How are you playing it?":"Rate it first, then pick how you play it"):"How you play it"}</div>
        ${arrangePicker(id,e.diffNote,known&&!!e.difficulty,"diffnote","savediff","diffsaved")}</div>`:""}
      <div class="diffavg">${(()=>{const ad=avgDiff(id);return ad?`Group average <b>${ad.value.toFixed(1)}</b> / 5 &middot; ${ad.count} rating${ad.count!==1?"s":""}`:`No ratings yet &mdash; you&rsquo;re the first`;})()}</div>
      ${(()=>{const by=((allLists[id]&&allLists[id].diffBy)||[]).filter(d=>d.uid!==me.uid).sort((a,b)=>(b.note?1:0)-(a.note?1:0)||b.difficulty-a.difficulty);
        if(!by.length) return "";
        return `<div class="diffothers"><div class="diffothers-h">How others rated it</div>${by.map(d=>`<div class="noteitem"><div class="notewho" data-go="/user/${d.uid}">${avatar(nameOf(d.uid),colorOf(d.uid),22)}<span class="nm">${esc(nameOf(d.uid))}</span>${diffChip(d.difficulty)}<span class="dval">${d.difficulty.toFixed(1)}</span></div>${d.note?`<div class="notetext"><span style="color:var(--faint)">Plays it &middot; </span>${linkify(d.note)}</div>`:""}</div>`).join("")}</div>`;})()}</div>
    ${supplyDemandSection(id)}
    <div class="section"><h3>My notes <button class="expandtog" data-expand="mynotes">Expand</button></h3>
      <textarea class="notes" id="mynotes" placeholder="Your own notes (everyone can see these too).">${esc(myNoteText)}</textarea>
      <button class="savenote" id="savemine" disabled>Save my notes</button><span class="savedmsg" id="minesaved"></span></div>
    <div class="section"><h3>Everyone&rsquo;s notes</h3><div class="notefeed">${othersHtml}</div></div>
    <button class="ghostbtn danger" id="delsong">Delete this song from the songbook</button>`;
  const _cap={mine:(()=>{const el=$("mynotes");return el?el.value:null;})(),
    mineEx:(()=>{const el=$("mynotes");return el?el.classList.contains("expanded"):false;})(),
    diff:(()=>{const el=$("diffnote");return el?el.value:null;})(),
    wrapScroll:(()=>{const w=document.querySelector(".wrap");return w?w.scrollTop:0;})(),
    focus:document.activeElement&&document.activeElement.id,sel:(document.activeElement&&typeof document.activeElement.selectionStart==='number')?document.activeElement.selectionStart:null};
  root.innerHTML=chrome(inner,"home");
  if(lastSong===id){
    {const w=document.querySelector(".wrap");if(w)w.scrollTop=_cap.wrapScroll;}   // don't jump to top on a re-render (rating, arrangement, etc.)
    if(_cap.mine!=null){const el=$("mynotes");if(el){el.value=_cap.mine;const sm=$("savemine");if(sm)sm.disabled=(el.value.trim()===myNoteText.trim());}}
    if(_cap.mineEx){const el=$("mynotes");if(el){el.classList.add("expanded");const t=document.querySelector('[data-expand="mynotes"]');if(t)t.textContent="Collapse";}}
    if(_cap.diff!=null){const el=$("diffnote");if(el){el.value=_cap.diff;const sd=$("savediff");if(sd)sd.disabled=(el.value.trim()===e.diffNote.trim());}}
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
  const dnote=$("diffnote"), savediff=$("savediff");
  if(dnote&&savediff){ const dorig=dnote.value;
    dnote.addEventListener("input",()=>{ savediff.disabled = dnote.value.trim()===dorig.trim(); });
    savediff.onclick=async()=>{ savediff.disabled=true; await saveDiffNote(id,dnote.value); const m=$("diffsaved"); if(m){m.textContent="Saved";setTimeout(()=>{const x=$("diffsaved");if(x)x.textContent="";},1500);} };
  }
  $("delsong").onclick=async()=>{ const b=$("delsong");
    if(b.dataset.confirm){ await deleteSong(id); go("/"); }
    else{ b.dataset.confirm="1"; b.textContent="Tap again to permanently delete"; setTimeout(()=>{const x=$("delsong");if(x){delete x.dataset.confirm;x.textContent="Delete this song from the songbook";}},3000); } };
}

// Compact row for the "Starred" favourites band at the top of a personal profile.
function starRow(s){
  return `<div class="starrow" data-open="${s.id}"><span class="si">${starSvg(true)}</span>
    <div class="st"><div class="stt">${esc(s.title)}</div><div class="sa">${esc(s.artist)}</div></div></div>`;
}
function listItem(s,starred,difficulty){
  const tags=(s.genres||[]).map(g=>`<span class="tag" style="--tc:${gcolor(g)}">${esc(g)}</span>`).join("");
  const diffHtml=difficulty?diffChip(difficulty,`Difficulty ${difficulty}/5`):"";
  const badges=(tags||diffHtml)?`<div class="badges">${tags}${diffHtml}</div>`:"";
  return `<div class="row" data-id="${s.id}"><button class="star ${starred?'on':''}" data-star="${s.id}" aria-label="favorite">${starSvg(starred)}</button>
    <div class="rowmain" data-open="${s.id}"><div class="rowtitle">${esc(s.title)}</div><div class="rowartist">${esc(s.artist)}</div>${badges}</div></div>`;
}
async function renderUser(uid){
  if(!uid){ root.innerHTML=chrome(`<div class="empty"><div class="big">No user</div></div>`,"user"); return; }
  if(lastUserView!==uid){ uQuery=""; userGenresInc.clear(); userGenresExc.clear(); uSort="added"; uSortDir="desc"; uStarOnly=false; uFiltersOpen=false; lastUserView=uid; }
  const isMe=uid===me.uid;
  // Your own profile reads the always-live myLists (kept fresh by its onSnapshot), so no
  // fetch is needed and self-edits show instantly. Other people's lists are fetched once
  // per visit and cached in profEntries; search/filter/sort then re-paint off the cache
  // instead of hitting Firestore on every keystroke.
  if(isMe){ paintUser(uid, myLists); return; }
  if(profUid===uid && profEntries){ paintUser(uid, profEntries); return; }
  if(profLoading===uid) return;              // a fetch for this profile is already in flight
  const myGen=++profGen; profLoading=uid;
  paintUserLoading(uid);                      // instant header so the tap never feels dead
  let entries={};
  try{ const snap=await F.getDocs(F.collection(db,"users",uid,"lists")); snap.docs.forEach(d=>entries[d.id]=d.data()); }catch(err){ console.error(err); }
  if(myGen!==profGen) return;                 // a newer render superseded this fetch — discard
  profLoading=null;
  const rt=route(); if(rt.view!=="user"||rt.uid!==uid) return;  // navigated away mid-fetch — discard
  profUid=uid; profEntries=entries;
  paintUser(uid, entries);
}

function paintUserLoading(uid){
  const isMe=uid===me.uid;
  const pname=nameOf(uid,isMe?me.name:"Friend"), pcolor=colorOf(uid,isMe?me.color:null);
  const inner=`
    <div style="display:flex;align-items:center;gap:14px;margin:16px 2px 6px">${avatar(pname,pcolor,56)}
      <div><div class="ptitle" style="margin:0;font-size:26px">${esc(pname)}</div>
      <div class="psub" style="margin:4px 0 0">Loading&hellip;</div></div></div>
    ${isMe?"":`<button class="back" data-go="/people" style="padding-top:4px">&larr; All people</button>`}
    <div class="list" style="padding:48px 0;text-align:center;color:var(--faint)">Loading songs&hellip;</div>`;
  root.innerHTML=chrome(inner,"user");
}

function paintUser(uid, entries){
  const isMe=uid===me.uid;
  const pname=nameOf(uid,isMe?me.name:"Friend"), pcolor=colorOf(uid,isMe?me.color:null);
  const uq=uQuery.trim().toLowerCase();
  const cmp=songCmp(uSort,uSortDir);
  // On a personal page, "Date added" means added to THIS person's list (their entry's
  // addedAt), not when the song joined the songbook. Other sort modes reuse the shared
  // group-metric comparator. A pending (just-written) entry has no resolved timestamp yet,
  // so treat it as "now" to keep it at the top instead of flickering to the bottom.
  // "Date added" = when the song joined THIS person's list. Never fall back to updatedAt:
  // that field is bumped on every edit (star/status/difficulty), which would make favouriting
  // a song jump it to the top. Resolved addedAt wins; a just-written entry (addedAt still
  // pending) is treated as "now" so it settles at the top instead of flickering to the bottom;
  // a legacy entry with no addedAt at all falls back to the song's own stable order.
  const entAddedAt=id=>{
    const v=entries[id]; if(!v) return 0;
    const t=tsMillis(v.addedAt);
    if(t) return t;
    if('addedAt' in v) return Date.now();   // present but unresolved → brand-new write
    const s=songsMap[id];                    // legacy entry: stable, unaffected by starring
    return (s&&s.sortKey)||0;
  };
  const uCmp=(a,b)=>{
    if(uSort==="added"){
      const d=entAddedAt(a.s.id)-entAddedAt(b.s.id);
      if(d!==0) return uSortDir==="asc"?d:-d;
      return a.s.title.localeCompare(b.s.title);
    }
    return cmp(a.s,b.s);
  };
  const collect=status=>{
    const items=Object.entries(entries).filter(([id,v])=>v.status===status&&songsMap[id])
      .map(([id,v])=>({s:songsMap[id],starred:!!v.starred,difficulty:v.difficulty||null}))
      .filter(it=>songMatches(it.s,uq,userGenresInc,userGenresExc) && (!uStarOnly||it.starred));
    items.sort(uCmp);
    return items;
  };
  const learning=collect("learning"), known=collect("known"), todo=collect("todo");
  // Starred favourites band at the top of the profile. If the person has pinned specific
  // favourites (featured), show exactly those; otherwise fall back to their 5 most-recently-
  // starred so the band is never empty. A starred song still appears in its normal status
  // list below — this is purely an extra quick-access view.
  const starAll=Object.entries(entries)
    .filter(([id,v])=>v.starred&&songsMap[id])
    .map(([id,v])=>({s:songsMap[id],featured:!!v.featured,at:tsMillis(v.addedAt||v.updatedAt)||Date.now()}));
  const starFeat=starAll.filter(x=>x.featured).sort((a,b)=>b.at-a.at);
  const starred = starFeat.length ? starFeat : starAll.sort((a,b)=>b.at-a.at).slice(0,5);
  const starHtml = starred.length? `<div class="starsec ${collapsed.starred?'collapsed':''}"><div class="sh">
      <button class="shtog" data-collapse="starred"><span class="si">${starSvg(true)}</span><span class="lbl">Starred</span><span class="ct">${starred.length}</span><span class="chev">${collapsed.starred?"\u203A":"\u2304"}</span></button>
      ${isMe?`<button class="edit-pencil starcustom" id="starcustom">Customize</button>`:""}</div>
    <div class="list starlist">${starred.map(it=>starRow(it.s)).join("")}</div></div>` : "";
  // The person's full song set (any list) — used to build the filter chips so they don't
  // vanish as you filter.
  const personSongs=Object.entries(entries)
    .filter(([id,v])=>(v.status==='known'||v.status==='todo'||v.status==='learning')&&songsMap[id])
    .map(([id])=>songsMap[id]);
  const ugSet=new Set(); personSongs.forEach(s=>(s.genres||[]).forEach(g=>ugSet.add(g)));
  const ugKnown=Object.keys(GENRE_COLORS).filter(g=>ugSet.has(g));
  const ugExtra=[...ugSet].filter(g=>!GENRE_COLORS[g]).sort();
  const ugAll=[...ugKnown,...ugExtra];
  const ugChips = ugAll.length? `<div class="filters" id="ufilters"><button class="chip all ${(userGenresInc.size===0&&userGenresExc.size===0)?'on':''}" data-ugenre="__all">All</button>`+
    ugAll.map(g=>{const gi=userGenresInc.has(g),ge=userGenresExc.has(g);return `<button class="chip ${gi?'on':''} ${ge?'exc':''}" style="--gc:${gcolor(g)}" data-ugenre="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`;}).join("")+`</div>` : "";
  const uArrow=m=> uSort!==m?"" : (uSortDir==="desc"?" \u2193":" \u2191");
  const lbl={added:"Date added",known:"Most known",todo:"Most to-do",difficulty:"Difficulty"};
  const uSortBtn=m=>`<button class="sortbtn ${uSort===m?'on':''}" data-usort="${m}">${lbl[m]}${uArrow(m)}</button>`;
  const uActive=(userGenresInc.size||userGenresExc.size||uQuery.trim()||uStarOnly);
  const uFilterCount=userGenresInc.size+userGenresExc.size+(uStarOnly?1:0);
  const starFilterRow=`<div class="filters" id="ustarfilter"><button class="chip ${uStarOnly?'on':''}" data-ustaronly="1">Starred only</button></div>`;
  const uFilterToggle=`<button class="filtertog ${uFiltersOpen?'open':''} ${uFilterCount?'active':''}" id="ufiltertog">
      <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 4h14M4.5 9h9M7 14h4"/></svg>
      Filters${uFilterCount?`<span class="fcount">${uFilterCount}</span>`:""}</button>`;
  // "Showing" summary — mirrors the home page so the collapsed filters stay legible.
  const uInc=[...userGenresInc], uExc=[...userGenresExc], uParts=[];
  if(uInc.length)uParts.push(uInc.join(" / "));
  if(uExc.length)uParts.push("no "+uExc.join(" / "));
  if(uStarOnly)uParts.push("starred");
  const uTotal=known.length+learning.length+todo.length;
  let uShowing;
  if(uParts.length) uShowing=`${uTotal} song${uTotal!==1?"s":""} \u00b7 ${uParts.join(", ")}`;
  else uShowing=uQuery.trim()?`${uTotal} match${uTotal!==1?"es":""}`:`${uTotal} song${uTotal!==1?"s":""}`;
  const controls=`<div class="homectl" style="margin-top:8px">
      <div class="searchbar"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="M16 16l-3.5-3.5"/></svg>
        <input id="usearch" type="text" placeholder="Search ${isMe?"your":esc(pname)+"\u2019s"} lists&hellip;" autocomplete="off" value="${esc(uQuery)}"></div>
      <div class="ctlbar">${uFilterToggle}<div class="sortbar" id="usortbar">${uSortBtn("added")}${uSortBtn("difficulty")}${uSortBtn("known")}${uSortBtn("todo")}</div></div>
      <div class="filterpanel ${uFiltersOpen?'open':''}" id="ufilterpanel">
        ${ugChips}
        ${starFilterRow}
      </div>
      <div class="meta"><span>${uShowing}</span><span class="clear ${uActive?'show':''}" data-uclear="1">Clear</span></div>
    </div>`;
  const sec=(cls,label,items,cap)=>{ const col=collapsed[cls]?" collapsed":"";
    return `<div class="listsec ${cls}${col}"><button class="lh" data-collapse="${cls}"><span class="dot"></span><h2>${label}</h2><span class="ct">${items.length}${cap?` / ${cap}`:""}</span><span class="chev">${collapsed[cls]?"\u203A":"\u2304"}</span></button>
    <div class="list seclist">${items.length?items.map(it=>listItem(it.s,it.starred,it.difficulty)).join(""):`<div class="empty" style="padding:24px"><div style="color:var(--faint)">${uActive?"Nothing matches your filters.":"Nothing here yet."}</div></div>`}</div></div>`; };
  const inner=`
    <div style="display:flex;align-items:center;gap:14px;margin:16px 2px 6px">${avatar(pname,pcolor,56)}
      <div><div class="ptitle" style="margin:0;font-size:26px">${esc(pname)}${isMe?" (you)":""}</div>
      <div class="psub" style="margin:4px 0 0">${known.length} known &middot; ${learning.length} learning &middot; ${todo.length} to learn${isMe?` &middot; <button class="edit-pencil" id="editname" style="font-size:13px">Edit name</button> &middot; <button class="edit-pencil" id="codebtn" style="font-size:13px">Recovery code</button> &middot; <button class="edit-pencil" id="adminbtn" style="font-size:13px">Admin${isAdmin?" \u2713":""}</button> &middot; <button class="edit-pencil" id="signoutbtn" style="font-size:13px">Sign out</button>`:""}</div></div></div>
    ${(!isMe&&isAdmin)?`<div style="display:flex;gap:8px;margin:0 2px 4px"><button class="minibtn" data-arename="${uid}">Rename</button><button class="minibtn danger" data-aremove="${uid}">Remove person</button></div>`:""}
    ${isMe?"":`<button class="back" data-go="/people" style="padding-top:4px">&larr; All people</button>`}
    ${starHtml}
    ${controls}
    ${sec("learning","Currently Learning",learning,LEARNING_LIMIT)}
    ${sec("known","Currently Know",known)}
    ${sec("todo","To-Do",todo)}`;
  const _focId=document.activeElement&&document.activeElement.id;
  const _sel=(document.activeElement&&typeof document.activeElement.selectionStart==='number')?document.activeElement.selectionStart:null;
  const _scrollUX={}; ["ufilters","ustarfilter","usortbar"].forEach(k=>{const el=$(k);if(el)_scrollUX[k]=el.scrollLeft;});
  root.innerHTML=chrome(inner,"user");
  keepScroll("user:"+uid);
  Object.keys(_scrollUX).forEach(k=>{const el=$(k);if(el){void el.scrollWidth;el.scrollLeft=_scrollUX[k];}});
  if(_focId){ const el=$(_focId); if(el){ el.focus(); if(_sel!=null){ try{el.setSelectionRange(_sel,_sel);}catch(e){} } } }
  const usi=$("usearch"); if(usi){ const reU=debounce(()=>{ const rt=route(); if(rt.view!=="user"||rt.uid!==uid) return; renderUser(uid); },140); usi.addEventListener("input",e=>{ uQuery=e.target.value; reU(); }); }
  const uft=$("ufiltertog"); if(uft) uft.onclick=()=>{ uFiltersOpen=!uFiltersOpen; renderUser(uid); };
  const en=$("editname"); if(en) en.onclick=openEditName;
  const cb=$("codebtn"); if(cb) cb.onclick=openCodeSheet;
  const ab=$("adminbtn"); if(ab) ab.onclick=openAdminSheet;
  const so=$("signoutbtn"); if(so) so.onclick=openSignOutSheet;
  const sc=$("starcustom"); if(sc) sc.onclick=openStarPickSheet;
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
  const _spinScroll=(()=>{const w=document.querySelector(".wrap");return w?w.scrollTop:0;})();
  root.innerHTML=chrome(inner,"spin");
  if(known.length===0) return;
  const reel=$("reel"), btn=$("spinbtn"), pick=$("pick");
  const cell=s=>`<div class="slot-cell"><div class="sc-title">${esc(s.title)}</div><div class="sc-artist">${esc(s.artist)}</div></div>`;
  // Before the first spin there's no song to show, so the slot holds a neutral prompt
  // rather than parking a real song there and implying it's "the pick".
  const placeholder=`<div class="slot-cell slot-ph"><div class="sc-ph-title"><span class="sc-ph-mark">\u266A</span> Ready to spin</div><div class="sc-ph-sub">Tap below to pick a song</div></div>`;
  reel.innerHTML=placeholder;
  // Capture an in-progress note so a re-render (from rating, or a friend's update) doesn't wipe it.
  const _noteCap={ v:(()=>{const el=$("spindiffnote");return el?el.value:null;})(),
    foc:document.activeElement&&document.activeElement.id==="spindiffnote",
    sel:(document.activeElement&&typeof document.activeElement.selectionStart==='number')?document.activeElement.selectionStart:null };
  // The card revealed after a spin. Pulled out so re-renders (e.g. rating the song,
  // which writes to Firestore and triggers a re-render) can restore it instead of wiping it.
  const pickCard=w=>{ const ent=myEntry(w.id); const rk=ent.status==='known';
    return `<div class="pick-card">
      <div data-open="${w.id}" style="cursor:pointer">
        <div class="pick-label">Play this one</div>
        <div class="pick-title">${esc(w.title)}</div>
        <div class="pick-artist">${esc(w.artist)}</div>
        <div class="pick-tap">Tap to open the song &rarr;</div>
      </div>
      <div class="pick-diff"><span class="pick-diff-l">How hard is it to play?</span>${diffRater(w.id,ent.difficulty,rk)}
        <div class="arrange" style="width:100%">${arrangePicker(w.id,ent.diffNote,rk&&!!ent.difficulty,"spindiffnote","spinsavediff","spindiffsaved")}</div>
      </div>
    </div>`; };
  // Attach handlers to the note field inside whatever pick card is currently shown.
  const wirePickNote=sid=>{ const inp=$("spindiffnote"), sv=$("spinsavediff"); if(!inp||!sv) return;
    const dorig=inp.value;
    inp.addEventListener("input",()=>{ sv.disabled = inp.value.trim()===dorig.trim(); });
    sv.onclick=async()=>{ sv.disabled=true; await saveDiffNote(sid,inp.value); const m=$("spindiffsaved"); if(m){m.textContent="Saved";setTimeout(()=>{const x=$("spindiffsaved");if(x)x.textContent="";},1500);} }; };
  // Restore the last reveal if we re-rendered (so rating from here doesn't clear it),
  // and keep the landed song parked in the slot window instead of snapping back to the top.
  if(lastSpinPick && songsMap[lastSpinPick]){
    pick.innerHTML=pickCard(songsMap[lastSpinPick]); reel.innerHTML=cell(songsMap[lastSpinPick]); wirePickNote(lastSpinPick);
    if(_noteCap.v!=null){ const el=$("spindiffnote"); if(el){ el.value=_noteCap.v; const sv=$("spinsavediff"); if(sv) sv.disabled=(el.value.trim()===myEntry(lastSpinPick).diffNote.trim());
      if(_noteCap.foc){ el.focus(); if(_noteCap.sel!=null){ try{el.setSelectionRange(_noteCap.sel,_noteCap.sel);}catch(e){} } } } }
    {const w=document.querySelector(".wrap");if(w)w.scrollTop=_spinScroll;}   // keep position on re-render (e.g. rating from the pick card)
  }
  $("norep").onclick=()=>{ noRepeats=!noRepeats; renderSpin(); };
  const rs=$("resetspin"); if(rs) rs.onclick=()=>{ spinPlayed.clear(); lastSpinPick=null; renderSpin(); };
  let spinning=false;
  btn.onclick=()=>{
    // Recompute the pool live each spin from the current played set — using the stale
    // closure pool was the no-repeats bug (a just-played song stayed eligible).
    const livePool=noRepeats? known.filter(s=>!spinPlayed.has(s.id)) : known;
    if(spinning||livePool.length===0) return; spinning=true; pick.innerHTML=""; lastSpinPick=null; btn.disabled=true; btn.textContent="Spinning\u2026";
    const winner=livePool[Math.floor(Math.random()*livePool.length)];
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
      spinning=false; lastSpinPick=winner.id;
      pick.innerHTML=pickCard(winner); wirePickNote(winner.id);
      // refresh controls (reset count / pool) without wiping the reveal
      const rb=$("resetspin"); if(rb) rb.textContent=`Reset (${spinPlayed.size} played)`;
      if(noRepeats && remaining===0){ btn.disabled=true; btn.textContent="All played \u2014 reset to spin"; }
      else { btn.disabled=false; btn.textContent="Spin again"; }
    },dur+60);
  };
}

/* ============================================================
   SCALES — data-driven fretboard maps (any scale, any key)
   ============================================================ */
const SC_NOTES=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const SC_OPEN=[4,11,7,2,9,4];   // open-string pitch classes, top->bottom: e B G D A E
const SCALES={
  minPent: {name:"Minor pentatonic", iv:[0,3,5,7,10],      deg:["R","\u266d3","4","5","\u266d7"]},
  majPent: {name:"Major pentatonic", iv:[0,2,4,7,9],       deg:["R","2","3","5","6"]},
  bluegrass:{name:"Bluegrass",       iv:[0,2,3,4,7,9],      deg:["R","2","\u266d3","3","5","6"]},
  blues:   {name:"Blues",            iv:[0,3,5,6,7,10],     deg:["R","\u266d3","4","\u266d5","5","\u266d7"]},
  major:   {name:"Major",            iv:[0,2,4,5,7,9,11],   deg:["R","2","3","4","5","6","7"]},
  mixolydian:{name:"Mixolydian",     iv:[0,2,4,5,7,9,10],   deg:["R","2","3","4","5","6","\u266d7"]},
  natMinor:{name:"Natural minor",    iv:[0,2,3,5,7,8,10],   deg:["R","2","\u266d3","4","5","\u266d6","\u266d7"]},
};
let scaleRoot="A", scaleType="minPent", scaleView="neck", scaleLabels="notes", scalePos=0;
let scaleMode="scales", breakKey="G", breakChord=0;

function scPcs(){ const r=SC_NOTES.indexOf(scaleRoot); return SCALES[scaleType].iv.map(i=>(r+i)%12); }
function scDeg(pc){ const p=scPcs(), i=p.indexOf(pc); return i<0?"":SCALES[scaleType].deg[i]; }
// Position anchors: frets on the low-E string (0..12) that land on a scale tone.
function scAnchors(){ const p=scPcs(), out=[]; for(let f=0;f<=12;f++){ if(p.includes((SC_OPEN[5]+f)%12)) out.push(f); } return out; }

function fretboardSVG(fromFret,toFret){
  const rootPc=SC_NOTES.indexOf(scaleRoot), pcs=scPcs();
  const showOpen=fromFret===0;
  const fw=34, nutX=66, openX=44, topY=18, sp=24, r=10;
  const nSpaces=toFret-fromFret;
  const lineX=k=>nutX+(k-fromFret)*fw;
  const noteX=f=>f===0?openX:nutX+(f-fromFret-0.5)*fw;
  const ys=[0,1,2,3,4,5].map(i=>topY+i*sp);
  const botY=ys[5], numY=botY+22, W=nutX+nSpaces*fw+18, H=numY+8;
  const midY=(ys[2]+ys[3])/2, boardX=showOpen?openX-16:nutX-8;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:none" role="img" aria-label="${esc(scaleRoot)} ${esc(SCALES[scaleType].name)} scale on the fretboard">`;
  s+=`<rect x="${boardX}" y="${topY-9}" width="${W-boardX-4}" height="${botY-topY+18}" rx="10" fill="#1d130b" stroke="rgba(246,236,219,0.10)"/>`;
  for(let i=0;i<6;i++){ const sw=(0.8+i*0.18).toFixed(2); s+=`<line x1="${showOpen?openX:nutX}" y1="${ys[i]}" x2="${lineX(toFret)}" y2="${ys[i]}" stroke="rgba(246,236,219,0.42)" stroke-width="${sw}"/>`; }
  for(let k=fromFret;k<=toFret;k++){ const nut=(k===0); s+=`<line x1="${lineX(k)}" y1="${ys[0]}" x2="${lineX(k)}" y2="${ys[5]}" stroke="${nut?'rgba(246,236,219,0.70)':'rgba(246,236,219,0.20)'}" stroke-width="${nut?4:1}"/>`; }
  [3,5,7,9,12,15].forEach(f=>{ if(f>fromFret&&f<=toFret){ if(f===12){ s+=`<circle cx="${noteX(f)}" cy="${(ys[1]+ys[2])/2}" r="3.5" fill="rgba(246,236,219,0.16)"/><circle cx="${noteX(f)}" cy="${(ys[3]+ys[4])/2}" r="3.5" fill="rgba(246,236,219,0.16)"/>`; } else { s+=`<circle cx="${noteX(f)}" cy="${midY}" r="3.5" fill="rgba(246,236,219,0.16)"/>`; } } });
  const names=["e","B","G","D","A","E"];
  for(let i=0;i<6;i++){ s+=`<text x="10" y="${ys[i]+4}" font-size="11" font-weight="600" fill="rgba(246,236,219,0.5)">${names[i]}</text>`; }
  [0,3,5,7,9,12,15].forEach(f=>{ if(f>=fromFret&&f<=toFret&&(f>0||showOpen)){ s+=`<text x="${noteX(f)}" y="${numY}" text-anchor="middle" font-size="11" fill="rgba(246,236,219,0.42)">${f}</text>`; } });
  for(let st=0;st<6;st++){
    for(let f=(showOpen?0:fromFret);f<=toFret;f++){
      if(!showOpen&&f===0) continue;
      const pc=(SC_OPEN[st]+f)%12;
      if(!pcs.includes(pc)) continue;
      const isRoot=pc===rootPc, label=scaleLabels==="notes"?SC_NOTES[pc]:scDeg(pc);
      const cx=noteX(f), cy=ys[st], fill=isRoot?"#ff7e3d":"#cdb794", tcol=isRoot?"#2a1206":"#241a0c";
      s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${isRoot?' stroke="#f6ecdb" stroke-width="1.4"':''}/>`;
      s+=`<text x="${cx}" y="${cy+3.4}" text-anchor="middle" font-size="${label.length>2?9:10.5}" font-weight="700" fill="${tcol}">${label}</text>`;
    }
  }
  return s+`</svg>`;
}

/* ============================================================
   BLUEGRASS PLAY-ALONG TRAINER
   Web Audio metronome + I-IV-V backing with live target guidance.
   Audio/transport state lives outside the DOM; visuals are driven by
   a requestAnimationFrame loop synced to the audio clock, so the app's
   full re-render model never fights the transport.
   ============================================================ */
let pracCtx=null, pracMaster=null, pracPlaying=false, pracTempo=80, pracBacking=true;
let pracTimer=null, pracRAF=0, pracNextTime=0, pracBeat=0, pracBarAbs=0, pracQueue=[], pracEls=null;

function pracFreq(m){ return 440*Math.pow(2,(m-69)/12); }
function pracProg(){ const kp=SC_NOTES.indexOf(breakKey); return [0,5,7,0].map(iv=>{const pc=(kp+iv)%12; return {pc, name:SC_NOTES[pc]};}); }

function pracClick(t,accent){
  const o=pracCtx.createOscillator(), g=pracCtx.createGain();
  o.type="square"; o.frequency.value=accent?1800:1150;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(accent?0.32:0.19,t+0.001);
  g.gain.exponentialRampToValueAtTime(0.0001,t+0.035);
  o.connect(g); g.connect(pracMaster); o.start(t); o.stop(t+0.05);
}
function pracPluck(type,freq,t,dur,peak){
  const o=pracCtx.createOscillator(), g=pracCtx.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(peak,t+0.008);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(pracMaster); o.start(t); o.stop(t+dur+0.02);
}
function pracChordAudio(pc,t,barDur){
  pracPluck("triangle",pracFreq(36+pc),t,0.7,0.34);              // bass on the downbeat
  [0,4,7].forEach(iv=>{                                          // soft sustained triad pad
    const o=pracCtx.createOscillator(), g=pracCtx.createGain();
    o.type="sine"; o.frequency.value=pracFreq(48+pc+iv);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(0.05,t+0.04);
    g.gain.setValueAtTime(0.05,t+Math.max(0.06,barDur-0.25));
    g.gain.exponentialRampToValueAtTime(0.0001,t+barDur-0.02);
    o.connect(g); g.connect(pracMaster); o.start(t); o.stop(t+barDur);
  });
}
function pracScheduler(){
  const spb=60/pracTempo;
  while(pracNextTime < pracCtx.currentTime+0.12){
    const beat=pracBeat, bar=pracBarAbs, t=pracNextTime;
    pracClick(t, beat===0);
    if(beat===0 && bar>0 && pracBacking){
      const prog=pracProg(), ch=prog[(bar-1)%prog.length];
      pracChordAudio(ch.pc, t, spb*4);
    }
    pracQueue.push({t, beat, bar});
    pracBeat++;
    if(pracBeat>3){ pracBeat=0; pracBarAbs++; }
    pracNextTime += spb;
  }
}
function pracDraw(){
  if(!pracPlaying) return;
  const now=pracCtx.currentTime;
  while(pracQueue.length && pracQueue[0].t<=now){
    const ev=pracQueue.shift();
    pracShowBeat(ev.beat);
    if(ev.beat===0) pracShowBar(ev.bar);
  }
  pracRAF=requestAnimationFrame(pracDraw);
}
function pracShowBeat(beat){
  if(!pracEls) return;
  pracEls.dots.forEach((d,i)=>{ d.classList.toggle("on",i===beat); d.classList.toggle("acc",i===beat&&beat===0); });
}
function pracShowBar(bar){
  if(!pracEls) return;
  const prog=pracProg(), len=prog.length, kp=SC_NOTES.indexOf(breakKey);
  const nextIdx=bar%len, nextCh=prog[nextIdx], aimPc=(nextCh.pc+4)%12;
  if(bar===0){ if(pracEls.chord) pracEls.chord.textContent="\u2013"; pracEls.prog.forEach((c,i)=>{ c.classList.remove("on"); c.classList.toggle("aim",i===nextIdx); }); if(pracEls.fret) pracEls.fret.innerHTML=breakBoardSVG(kp,nextCh.pc,aimPc); }
  else { const curIdx=(bar-1)%len, curCh=prog[curIdx]; if(pracEls.chord) pracEls.chord.textContent=curCh.name; pracEls.prog.forEach((c,i)=>{ c.classList.toggle("on",i===curIdx); c.classList.toggle("aim",i===nextIdx&&i!==curIdx); }); if(pracEls.fret) pracEls.fret.innerHTML=breakBoardSVG(kp,curCh.pc,aimPc); }
  if(pracEls.aim) pracEls.aim.textContent=SC_NOTES[aimPc];
  if(pracEls.target) pracEls.target.innerHTML=`the 3rd of <b>${nextCh.name}</b> \u2014 land on the next \u201c1\u201d`;
}
function pracStart(){
  if(pracPlaying) return;
  if(!pracCtx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC){ alert("Audio isn\u2019t supported in this browser."); return; } pracCtx=new AC(); pracMaster=pracCtx.createGain(); pracMaster.connect(pracCtx.destination); }
  if(pracCtx.state==="suspended") pracCtx.resume();
  const n=pracCtx.currentTime;
  pracMaster.gain.cancelScheduledValues(n); pracMaster.gain.setValueAtTime(1,n);
  pracBeat=0; pracBarAbs=0; pracQueue=[]; pracNextTime=n+0.15; pracPlaying=true;
  pracBind();
  pracTimer=setInterval(pracScheduler,25);
  pracRAF=requestAnimationFrame(pracDraw);
}
function pracStop(){
  pracPlaying=false;
  if(pracTimer){ clearInterval(pracTimer); pracTimer=null; }
  if(pracRAF){ cancelAnimationFrame(pracRAF); pracRAF=0; }
  if(pracMaster&&pracCtx){ const n=pracCtx.currentTime; pracMaster.gain.cancelScheduledValues(n); pracMaster.gain.setValueAtTime(pracMaster.gain.value,n); pracMaster.gain.linearRampToValueAtTime(0,n+0.06); }
  const btn=$("pracBtn"); if(btn){ btn.textContent="Start"; btn.classList.remove("on"); }
  if(pracEls){ pracEls.dots.forEach(d=>d.classList.remove("on","acc")); if(pracEls.chord)pracEls.chord.textContent="–"; if(pracEls.aim)pracEls.aim.textContent="▸"; if(pracEls.target)pracEls.target.textContent="press start"; pracEls.prog.forEach(c=>c.classList.remove("on","aim")); }
}
function pracBind(){
  const btn=$("pracBtn"); if(btn) btn.onclick=()=>{ pracPlaying?pracStop():pracStart(); };
  const tempo=$("pracTempo"); if(tempo) tempo.oninput=(e)=>{ pracTempo=+e.target.value; const b=$("pracBpm"); if(b) b.textContent=pracTempo; };
  const back=$("pracBack"); if(back) back.onclick=()=>{ pracBacking=!pracBacking; back.classList.toggle("on",pracBacking); back.textContent="Backing: "+(pracBacking?"on":"off"); };
  if(pracPlaying){
    if(btn){ btn.textContent="Stop"; btn.classList.add("on"); }
    pracEls={ dots:[...document.querySelectorAll("#pracBeats .pdot")], chord:$("pracChord"), aim:$("pracAim"), target:$("pracTarget"), prog:[...document.querySelectorAll("#pracProg .pcell")], fret:$("pracFret") };
  }
}

function renderPlayInner(){
  const kp=SC_NOTES.indexOf(breakKey), prog=pracProg();
  const keyChips=["G","C","D","A"].map(k=>`<button class="chip ${k===breakKey?'on':''}" data-bkey="${k}">${k}</button>`).join("");
  const roman=["I","IV","V","I"];
  const progCells=prog.map((c,i)=>`<div class="pcell">${c.name}<span>${roman[i]}</span></div>`).join("");
  const dots=[0,1,2,3].map(()=>`<i class="pdot"></i>`).join("");
  return `
    <div class="psub">Play along with the changes \u2014 you\u2019re always aiming one chord ahead. Land on the cyan target (the next chord\u2019s 3rd) right as the change hits.</div>
    <div class="scctl"><div class="scctl-label">Key</div><div class="filters scscroll" id="bkey" style="flex-wrap:wrap">${keyChips}</div></div>
    <div class="pracpanel">
      <div class="pracnow">
        <div class="pracover">now over <b id="pracChord">\u2013</b></div>
        <div class="pracaim" id="pracAim">\u25b8</div>
        <div class="pracaimsub" id="pracTarget">press start \u2014 aim to land on the next chord\u2019s 3rd</div>
      </div>
      <div class="pbeats" id="pracBeats">${dots}</div>
      <div class="pprog" id="pracProg">${progCells}</div>
      <div class="fretwrap" id="pracFret">${breakBoardSVG(kp, prog[0].pc, (prog[1].pc+4)%12)}</div>
      <div class="sclegend praclegend">
        <span><i style="background:#ff6b3d"></i>land on the 1</span>
        <span><i style="background:#4db8e8"></i>aim: next 3rd</span>
        <span><i style="background:#c9bba2"></i>connect between</span>
      </div>
      <div class="praccontrols">
        <button class="pracbtn" id="pracBtn">Start</button>
        <div class="practempo"><label>Tempo <b id="pracBpm">${pracTempo}</b> bpm</label><input type="range" id="pracTempo" min="50" max="150" step="2" value="${pracTempo}"></div>
        <button class="pracback ${pracBacking?'on':''}" id="pracBack">Backing: ${pracBacking?'on':'off'}</button>
      </div>
      <div class="prachint">Land on the bright note on the \u201c1\u201d of each bar; wander the faint scale notes in between; steer toward the cyan note \u2014 the next chord\u2019s 3rd \u2014 to land on the change. Start slow, then nudge the tempo up.</div>
    </div>`;
}

function breakBoardSVG(keyPc, chordPc, aimPc){
  const pal=[0,2,4,7,9].map(i=>(keyPc+i)%12);            // major pentatonic palette
  const R=chordPc, T=(chordPc+4)%12, F=(chordPc+7)%12;   // chord root, major 3rd, 5th
  const OPEN=[4,11,7,2,9,4];
  const fw=34, nutX=66, openX=44, topY=18, sp=24, r=10, toFret=12;
  const lineX=k=>nutX+k*fw;
  const noteX=f=>f===0?openX:nutX+(f-0.5)*fw;
  const ys=[0,1,2,3,4,5].map(i=>topY+i*sp);
  const botY=ys[5], numY=botY+22, W=nutX+toFret*fw+18, H=numY+8, midY=(ys[2]+ys[3])/2;
  let s=`<svg viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:none" role="img" aria-label="chord-tone targets over the ${SC_NOTES[keyPc]} pentatonic">`;
  s+=`<rect x="${openX-16}" y="${topY-9}" width="${W-(openX-16)-4}" height="${botY-topY+18}" rx="10" fill="#1d130b" stroke="rgba(246,236,219,0.10)"/>`;
  for(let i=0;i<6;i++){ const sw=(0.8+i*0.18).toFixed(2); s+=`<line x1="${openX}" y1="${ys[i]}" x2="${lineX(toFret)}" y2="${ys[i]}" stroke="rgba(246,236,219,0.42)" stroke-width="${sw}"/>`; }
  for(let k=0;k<=toFret;k++){ const nut=(k===0); s+=`<line x1="${lineX(k)}" y1="${ys[0]}" x2="${lineX(k)}" y2="${ys[5]}" stroke="${nut?'rgba(246,236,219,0.70)':'rgba(246,236,219,0.20)'}" stroke-width="${nut?4:1}"/>`; }
  [3,5,7,9,12].forEach(f=>{ if(f===12){ s+=`<circle cx="${noteX(f)}" cy="${(ys[1]+ys[2])/2}" r="3.5" fill="rgba(246,236,219,0.16)"/><circle cx="${noteX(f)}" cy="${(ys[3]+ys[4])/2}" r="3.5" fill="rgba(246,236,219,0.16)"/>`; } else { s+=`<circle cx="${noteX(f)}" cy="${midY}" r="3.5" fill="rgba(246,236,219,0.16)"/>`; } });
  const names=["e","B","G","D","A","E"];
  for(let i=0;i<6;i++){ s+=`<text x="10" y="${ys[i]+4}" font-size="11" font-weight="600" fill="rgba(246,236,219,0.5)">${names[i]}</text>`; }
  [0,3,5,7,9,12].forEach(f=>{ s+=`<text x="${noteX(f)}" y="${numY}" text-anchor="middle" font-size="11" fill="rgba(246,236,219,0.42)">${f}</text>`; });
  for(let st=0;st<6;st++){
    for(let f=0;f<=toFret;f++){
      const pc=(OPEN[st]+f)%12;
      let role=null;
      if(aimPc!=null && pc===aimPc) role="aim";
      else if(pc===T) role="3"; else if(pc===R) role="R"; else if(pc===F) role="5"; else if(pal.includes(pc)) role="pass";
      if(!role) continue;
      const cx=noteX(f), cy=ys[st];
      if(role==="pass"){ s+=`<circle cx="${cx}" cy="${cy}" r="5.5" fill="#c9bba2" opacity="0.5"/>`; continue; }
      if(role==="aim"){ s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#4db8e8" stroke="#eaf6fc" stroke-width="1.7"/>`; s+=`<text x="${cx}" y="${cy+3.4}" text-anchor="middle" font-size="11" font-weight="700" fill="#06242f">3</text>`; continue; }
      const fill = role==="3"?"#ff6b3d" : role==="R"?"#e0a23e" : "#2fa98c";
      s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${role==="3"?' stroke="#f6ecdb" stroke-width="1.6"':''}/>`;
      s+=`<text x="${cx}" y="${cy+3.4}" text-anchor="middle" font-size="11" font-weight="700" fill="#2a1206">${role}</text>`;
    }
  }
  return s+`</svg>`;
}

function renderBreaksInner(){
  const keyPc=SC_NOTES.indexOf(breakKey);
  const chords=[0,5,7].map((iv,i)=>({pc:(keyPc+iv)%12, roman:["I","IV","V"][i]}));
  if(breakChord>2||breakChord<0) breakChord=0;
  const sel=chords[breakChord];
  const keyChips=["G","C","D","A"].map(k=>`<button class="chip ${k===breakKey?'on':''}" data-bkey="${k}">${k}</button>`).join("");
  const chordPills=chords.map((c,i)=>`<button class="bkchord ${i===breakChord?'on':''}" data-bchord="${i}"><b>${SC_NOTES[c.pc]}</b><span>${c.roman}</span></button>`).join("");
  return `
    <div class="psub">A bluegrass break is the melody dressed up. Land on the chord tones \u2014 the 3rd nails the change \u2014 and connect them with scale notes. Pick a key and a chord to see where the targets sit.</div>
    <div class="scctl"><div class="scctl-label">Key</div><div class="filters scscroll" id="bkey" style="flex-wrap:wrap">${keyChips}</div></div>
    <div class="bklabel">The changes \u2014 tap a chord to target it</div>
    <div class="bkchords">${chordPills}</div>
    <div class="fretwrap" id="fretscroll">${breakBoardSVG(keyPc, sel.pc)}</div>
    <div class="sclegend">
      <span><i style="background:#e0a23e"></i>Root</span>
      <span><i style="background:#ff6b3d"></i>3rd \u00b7 aim here</span>
      <span><i style="background:#2fa98c"></i>5th</span>
      <span><i style="background:#c9bba2"></i>scale</span>
    </div>
    <div class="section bkrun">
      <h3>The G run \u2014 the essential closing lick</h3>
      <div class="bkrun-sub">Bluegrass punctuation for ending a phrase. Learn it in G first; move it to other keys with a capo using the same shape. (One common version \u2014 there are many.)</div>
      <pre class="tab">e|--------------------|
B|--------------------|
G|-----------------0--|
D|--------------------|
A|-----------0--2--3--|
E|--3--0--------------|</pre>
    </div>
    <div class="section bksteps">
      <h3>Building a break, step by step</h3>
      <ol>
        <li>Learn the chords and the rhythm for the tune.</li>
        <li>Play the melody straight \u2014 a break is the melody first, not a scale.</li>
        <li>Strip it to the key notes: the few that make the tune recognizable.</li>
        <li>Fill the gaps with chord tones \u2014 land on R, 3 or 5 of the chord you\u2019re on.</li>
        <li>Connect those targets with pentatonic and passing notes.</li>
        <li>Add slides, hammer-ons, pull-offs, and a G run to finish.</li>
      </ol>
    </div>`;
}

function renderScales(){
  const _scrollSX={}; ["scroot","sctype","fretscroll","bkey"].forEach(k=>{const el=$(k);if(el)_scrollSX[k]=el.scrollLeft;});
  const modeToggle=`<div class="sctoggles" style="margin-top:10px"><div class="seg"><button class="${scaleMode==="scales"?"on":""}" data-scmode="scales">Scales</button><button class="${scaleMode==="breaks"?"on":""}" data-scmode="breaks">Breaks</button><button class="${scaleMode==="play"?"on":""}" data-scmode="play">Play</button></div></div>`;
  let body;
  if(scaleMode==="breaks"){
    body=renderBreaksInner();
  } else if(scaleMode==="play"){
    body=renderPlayInner();
  } else {
    const rootChips=SC_NOTES.map(n=>`<button class="chip ${n===scaleRoot?'on':''}" data-scroot="${n}">${n}</button>`).join("");
    const typeChips=Object.keys(SCALES).map(k=>`<button class="chip ${k===scaleType?'on':''}" data-sctype="${k}">${SCALES[k].name}</button>`).join("");
    const anchors=scAnchors(); if(scalePos>anchors.length-1) scalePos=0;
    let board, posBar="";
    if(scaleView==="box"){
      const a=anchors[scalePos]||0, from=Math.max(0,Math.min(11,a-1)), to=from+4;
      board=fretboardSVG(from,to);
      posBar=`<div class="scpos"><button data-scpos="prev" ${scalePos<=0?"disabled":""} aria-label="previous position">\u2039</button><div class="scpos-lbl">Position ${scalePos+1} of ${anchors.length}<span class="scpos-sub">frets ${from}\u2013${to}</span></div><button data-scpos="next" ${scalePos>=anchors.length-1?"disabled":""} aria-label="next position">\u203a</button></div>`;
    } else { board=fretboardSVG(0,12); }
    body=`
    <div class="psub">Fretboard maps for the scales worth knowing. Orange notes are the root \u2014 anchor everything to them.</div>
    <div class="scctl"><div class="scctl-label">Root</div><div class="filters scscroll" id="scroot">${rootChips}</div></div>
    <div class="scctl"><div class="scctl-label">Scale</div><div class="filters scscroll" id="sctype">${typeChips}</div></div>
    <div class="sctoggles">
      <div class="seg"><button class="${scaleView==="neck"?"on":""}" data-scview="neck">Full neck</button><button class="${scaleView==="box"?"on":""}" data-scview="box">One box</button></div>
      <div class="seg"><button class="${scaleLabels==="notes"?"on":""}" data-sclabels="notes">Notes</button><button class="${scaleLabels==="degrees"?"on":""}" data-sclabels="degrees">Degrees</button></div>
    </div>
    ${posBar}
    <div class="fretwrap" id="fretscroll">${board}</div>
    <div class="sclegend"><span><i style="background:#ff7e3d"></i>Root (${scaleRoot})</span><span><i style="background:#cdb794"></i>Scale note</span></div>
    <div class="section sctip"><h3>How to actually learn it</h3><div class="sctip-body">Don\u2019t run it up and down on autopilot \u2014 that builds finger speed but no musical instinct. Loop a chord or a single drone note in ${scaleRoot} and play the scale over it, landing on the orange roots and letting the other notes pass through. Get one position comfortable, then connect it to the next, two at a time, until the whole neck joins up.</div></div>`;
  }
  const inner=`<div class="ptitle">Scales</div>${modeToggle}${body}`;
  root.innerHTML=chrome(inner,"scales");
  Object.keys(_scrollSX).forEach(k=>{const el=$(k);if(el){void el.scrollWidth;el.scrollLeft=_scrollSX[k];}});
  keepScroll("scales");
  if(scaleMode==="play") pracBind();
}

function render(){
  const r=route();
  // Leaving a profile invalidates the other-person cache so returning re-fetches once
  // ("fetch once per visit"). Background snapshot re-renders keep r.view==="user", so they
  // reuse the cache instead of re-fetching on every list change anyone makes.
  if(r.view!=="user"){ profUid=null; profEntries=null; profLoading=null; }
  if(pracPlaying && r.view!=="scales") pracStop();
  if(r.view!=="song" && detachNotes){ detachNotes(); detachNotes=null; notesSongId=null; currentNotes=[]; }
  // NB: lastSpinPick intentionally persists across navigation so returning to the
  // spin page still shows the song you last landed on (see renderSpin restore block).
  if(r.view==="home") renderHome();
  else if(r.view==="song") renderSong(r.id);
  else if(r.view==="people") renderPeople();
  else if(r.view==="spin") renderSpin();
  else if(r.view==="scales") renderScales();
  else if(r.view==="user") renderUser(r.uid);
  else renderHome();
}

/* ---------- global clicks ---------- */
document.addEventListener("click",e=>{
  const col=e.target.closest("[data-collapse]"); if(col){ const k=col.getAttribute("data-collapse"); collapsed[k]=!collapsed[k]; render(); return; }
  const ex=e.target.closest("[data-expand]"); if(ex){ const ta=$(ex.getAttribute("data-expand")); if(ta){ const on=ta.classList.toggle("expanded"); ex.textContent=on?"Collapse":"Expand"; } return; }
  const ar=e.target.closest("[data-arename]"); if(ar){ e.stopPropagation(); adminRenameSheet(ar.getAttribute("data-arename")); return; }
  const arm=e.target.closest("[data-aremove]"); if(arm){ e.stopPropagation(); adminRemoveSheet(arm.getAttribute("data-aremove")); return; }
  const dr=e.target.closest("[data-diff]"); if(dr){ e.stopPropagation(); const sid=dr.getAttribute("data-diff"); const lvl=parseFloat(dr.getAttribute("data-difflevel")); setDifficulty(sid,lvl); return; }
  const arr=e.target.closest("[data-arrange]"); if(arr){ e.stopPropagation(); if(arr.disabled) return;
    const sid=arr.getAttribute("data-arrange"), val=arr.getAttribute("data-arrval");
    const cur=myEntry(sid).diffNote.trim(), isPreset=ARRANGEMENTS.includes(cur);
    const otherOpen=arrangeOther.has(sid)||(cur!==""&&!isPreset);
    if(val==="__other"){
      if(otherOpen){ arrangeOther.delete(sid); if(cur!==""&&!isPreset) saveDiffNote(sid,""); else render(); }  // close (clearing any custom text)
      else { arrangeOther.add(sid); if(isPreset) saveDiffNote(sid,""); else render(); }                        // open (dropping any preset)
    } else {
      arrangeOther.delete(sid);
      saveDiffNote(sid, cur===val?"":val);   // tap a preset to set it, tap the active one to clear
    }
    return; }
  const g=e.target.closest("[data-go]"); if(g){ const dest=g.getAttribute("data-go");
    // Tapping home (nav or logo) while ALREADY on the home tab resets search/filters/scroll.
    // From any other tab it just navigates home, leaving the previous search intact.
    if(dest==="/" && route().view==="home"){ query=""; activeGenres.clear(); excludeGenres.clear(); addedByFilter=null; learningOnly=false; filtersOpen=false; scrollMem["home"]=0; renderHome(); return; }
    go(dest); return; }
  if(e.target.closest("[data-back]")){ history.length>1?history.back():go("/"); return; }
  const open=e.target.closest("[data-open]"); if(open){ closeSheet(); go("/song/"+open.getAttribute("data-open")); return; }
  const plus=e.target.closest("[data-plus]"); if(plus){ e.stopPropagation(); openListSheet(plus.getAttribute("data-plus")); return; }
  const star=e.target.closest("[data-star]"); if(star){ e.stopPropagation(); toggleStar(star.getAttribute("data-star")); return; }
  const setb=e.target.closest("[data-set]"); if(setb){ const st=setb.getAttribute("data-set"); const sid=setb.getAttribute("data-id"); const cur=myEntry(sid).status; setStatus(sid, cur===st?null:st); return; }
  const ug=e.target.closest("[data-ugenre]"); if(ug){ const v=ug.getAttribute("data-ugenre");
    if(v==="__all"){ userGenresInc.clear(); userGenresExc.clear(); }
    else if(userGenresInc.has(v)){ userGenresInc.delete(v); userGenresExc.add(v); }       // include -> exclude
    else if(userGenresExc.has(v)){ userGenresExc.delete(v); }                              // exclude -> off
    else { userGenresInc.add(v); }                                                         // off -> include
    render(); return; }
  const ust=e.target.closest("[data-usort]"); if(ust){ const m=ust.getAttribute("data-usort");
    if(uSort===m){ uSortDir=uSortDir==="desc"?"asc":"desc"; } else { uSort=m; uSortDir="desc"; }
    render(); return; }
  const uso=e.target.closest("[data-ustaronly]"); if(uso){ uStarOnly=!uStarOnly; render(); return; }
  const scr=e.target.closest("[data-scroot]"); if(scr){ scaleRoot=scr.getAttribute("data-scroot"); scalePos=0; render(); return; }
  const sct=e.target.closest("[data-sctype]"); if(sct){ scaleType=sct.getAttribute("data-sctype"); scalePos=0; render(); return; }
  const scv=e.target.closest("[data-scview]"); if(scv){ scaleView=scv.getAttribute("data-scview"); render(); return; }
  const scl=e.target.closest("[data-sclabels]"); if(scl){ scaleLabels=scl.getAttribute("data-sclabels"); render(); return; }
  const scp=e.target.closest("[data-scpos]"); if(scp){ const an=scAnchors(); const d=scp.getAttribute("data-scpos")==="next"?1:-1; scalePos=Math.max(0,Math.min(an.length-1,scalePos+d)); render(); return; }
  const scm=e.target.closest("[data-scmode]"); if(scm){ pracStop(); scaleMode=scm.getAttribute("data-scmode"); render(); return; }
  const bky=e.target.closest("[data-bkey]"); if(bky){ if(pracPlaying) pracStop(); breakKey=bky.getAttribute("data-bkey"); render(); return; }
  const bch=e.target.closest("[data-bchord]"); if(bch){ breakChord=parseInt(bch.getAttribute("data-bchord"),10)||0; render(); return; }
  const ucl=e.target.closest("[data-uclear]"); if(ucl){ uQuery=""; userGenresInc.clear(); userGenresExc.clear(); uStarOnly=false; render(); return; }
  const sb=e.target.closest("[data-sort]"); if(sb){ const m=sb.getAttribute("data-sort");
    if(sortMode===m){ sortDir=sortDir==="desc"?"asc":"desc"; } else { sortMode=m; sortDir="desc"; }
    renderHome(); return; }
  const adb=e.target.closest("[data-addedby]"); if(adb){ const v=adb.getAttribute("data-addedby"); addedByFilter=(v==="__all")?null:v; renderHome(); return; }
  const lo=e.target.closest("[data-learningonly]"); if(lo){ learningOnly=!learningOnly; renderHome(); return; }
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
function openSheet(html){ sheet.innerHTML=`<div class="grip"></div>`+html; sheet.scrollTop=0; sheet.style.transition=""; sheet.style.transform=""; scrim.classList.add("open"); sheet.classList.add("open"); }
function closeSheet(){ scrim.classList.remove("open"); sheet.classList.remove("open"); }
scrim.onclick=closeSheet;

/* Swipe the sheet down to dismiss. Only starts when the sheet is scrolled to the top,
   so it never fights with scrolling a tall sheet. */
(function enableSheetSwipe(){
  let startY=null, dragging=false, dy=0;
  sheet.addEventListener("touchstart",ev=>{
    if(!sheet.classList.contains("open")||sheet.scrollTop>0){ startY=null; return; }
    startY=ev.touches[0].clientY; dragging=false; dy=0;
  },{passive:true});
  sheet.addEventListener("touchmove",ev=>{
    if(startY==null) return;
    dy=ev.touches[0].clientY-startY;
    if(dy>0){
      if(sheet.scrollTop>0 && !dragging){ startY=null; return; }
      dragging=true; sheet.style.transition="none"; sheet.style.transform=`translateY(${dy}px)`;
      ev.preventDefault();   // stop the sheet from also scrolling while we drag it down
    }
  },{passive:false});
  const end=()=>{
    if(startY==null) return; startY=null;
    if(!dragging) return; dragging=false;
    sheet.style.transition="";
    sheet.style.transform="";          // snap back via CSS; if dismissing, removing .open animates it out
    if(dy>90) closeSheet();
  };
  sheet.addEventListener("touchend",end);
  sheet.addEventListener("touchcancel",end);
})();

const check=`<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-9"/></svg>`;

function openListSheet(id){
  const s=songsMap[id]; if(!s) return; const e=myEntry(id);
  openSheet(`<h2>${esc(s.title)}</h2><p class="sh-sub">Add to one of your lists</p>
    <button class="opt todo ${e.status==='todo'?'on':''}" data-act="todo"><span class="ic">${check}</span>To-Do list</button>
    <button class="opt learning ${e.status==='learning'?'on':''}" data-act="learning"><span class="ic">${check}</span>Currently Learning <span class="optsub">max ${LEARNING_LIMIT}</span></button>
    <button class="opt known ${e.status==='known'?'on':''}" data-act="known"><span class="ic">${check}</span>Currently Know</button>
    ${e.status?`<button class="opt remove" data-act="none"><span class="ic">&times;</span>Remove from my lists</button>`:""}`);
  sheet.querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{ const a=b.getAttribute("data-act"); const ok=await setStatus(id,a==="none"?null:a); if(ok!==false) closeSheet(); });
}

let pickGenres=new Set();
let addStatus=null;   // optionally drop the new song straight onto one of my lists
function openAddSheet(){
  pickGenres=new Set(); addStatus=null;
  const chips=allGenres().map(g=>`<button class="chip" style="--gc:${gcolor(g)}" data-pick="${esc(g)}"><span class="dot"></span>${esc(g)}</button>`).join("");
  openSheet(`<h2>Add a song</h2><p class="sh-sub">It joins the shared songbook for everyone</p>
    <div class="field"><label>Song title</label><input class="txt" id="f-title" placeholder="e.g. Wagon Wheel" autocomplete="off"></div>
    <div class="field"><label>Artist</label><input class="txt" id="f-artist" placeholder="e.g. Darius Rucker" autocomplete="off"></div>
    <div class="field"><label>Genres (tap any that fit)</label><div class="gpick" id="gpick">${chips}</div>
      <div class="newg"><input class="txt" id="f-newg" placeholder="Add a new genre&hellip;" autocomplete="off"><button id="addg">Add</button></div></div>
    <div class="field"><label>Add to my list (optional)</label><div class="mystatus" id="addlists">
      <button class="sbtn todo" data-addstatus="todo">To-Do</button>
      <button class="sbtn learning" data-addstatus="learning">Currently Learning</button>
      <button class="sbtn known" data-addstatus="known">Currently Know</button></div></div>
    <button class="save" id="savesong" disabled>Add to songbook</button>`);
  const valid=()=>{ $("savesong").disabled=!$("f-title").value.trim()||pickGenres.size===0; };
  const repaint=()=>sheet.querySelectorAll("[data-pick]").forEach(b=>b.classList.toggle("on",pickGenres.has(b.getAttribute("data-pick"))));
  sheet.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{ const g=b.getAttribute("data-pick"); pickGenres.has(g)?pickGenres.delete(g):pickGenres.add(g); repaint(); valid(); });
  sheet.querySelectorAll("[data-addstatus]").forEach(b=>b.onclick=()=>{ const v=b.getAttribute("data-addstatus"); addStatus=(addStatus===v)?null:v;
    sheet.querySelectorAll("[data-addstatus]").forEach(x=>x.classList.toggle("on",x.getAttribute("data-addstatus")===addStatus)); });
  $("f-title").addEventListener("input",valid);
  $("addg").onclick=()=>{ const v=$("f-newg").value.trim(); if(!v)return; const g=v.replace(/\s+/g," "); pickGenres.add(g);
    const c=document.createElement("button"); c.className="chip on"; c.style.setProperty("--gc",gcolor(g)); c.setAttribute("data-pick",g); c.innerHTML=`<span class="dot"></span>${esc(g)}`;
    c.onclick=()=>{ pickGenres.has(g)?pickGenres.delete(g):pickGenres.add(g); c.classList.toggle("on"); valid(); }; $("gpick").appendChild(c); $("f-newg").value=""; valid(); };
  $("f-newg").addEventListener("keydown",ev=>{ if(ev.key==="Enter"){ev.preventDefault();$("addg").click();} });
  $("savesong").onclick=()=>{ const t=$("f-title").value.trim(), a=$("f-artist").value.trim()||"Unknown"; if(!t||!pickGenres.size)return;
    const norm=x=>x.toLowerCase().replace(/[^a-z0-9]/g,"");
    const dupes=songs.filter(s=>norm(s.title)===norm(t));
    if(dupes.length){ confirmDuplicate(t,a,[...pickGenres],dupes,addStatus); return; }
    commitAdd(t,a,[...pickGenres],addStatus);
  };
}
async function commitAdd(t,a,genres,status){ const id=await addSong(t,a,genres); if(status&&id) await setStatus(id,status); closeSheet(); go("/"); }
function confirmDuplicate(t,a,genres,dupes,status){
  const list=dupes.map(s=>{
    const sd=allLists[s.id]||{known:[],todo:[],learning:[],diffs:[]};
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
  $("dup-add").onclick=()=>{ commitAdd(t,a,genres,status); };
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
// Curate which starred songs appear in your profile's Starred band. Pin any number; pin
// none and the band falls back to your 5 most recent. Writes go straight to each list
// entry's `featured` flag. The open sheet survives the resulting re-render because it
// lives in #sheet, not #root.
function openStarPickSheet(){
  const stars=Object.entries(myLists)
    .filter(([id,v])=>v.starred&&songsMap[id])
    .map(([id,v])=>({s:songsMap[id],featured:!!v.featured,at:tsMillis(v.addedAt||v.updatedAt)||Date.now()}))
    .sort((a,b)=>b.at-a.at);
  const rowsHtml = stars.length
    ? stars.map(x=>`<button class="opt ${x.featured?'on':''}" data-featstar="${x.s.id}">
        <span class="ic featic" style="background:${x.featured?'var(--amber)':'var(--card-hi)'};color:${x.featured?'#241006':'var(--faint)'}">${starSvg(x.featured)}</span>
        <div style="flex:1;min-width:0"><div class="rowtitle">${esc(x.s.title)}</div><div class="rowartist">${esc(x.s.artist)}</div></div></button>`).join("")
    : `<p class="sh-sub">You haven&rsquo;t starred any songs yet. Tap the star on any song to favourite it, then come back to pin your favourites here.</p>`;
  openSheet(`<h2>Customize Starred band</h2><p class="sh-sub">Pick which starred songs sit at the top of your profile. Choose none and your 5 most recent show automatically.</p>
    ${rowsHtml}
    <button class="ghostbtn" id="stardone">Done</button>`);
  sheet.querySelectorAll("[data-featstar]").forEach(b=>b.onclick=async()=>{
    const id=b.getAttribute("data-featstar"); const on=!b.classList.contains("on");
    b.classList.toggle("on",on);
    const ic=b.querySelector(".featic"); if(ic){ ic.style.background=on?"var(--amber)":"var(--card-hi)"; ic.style.color=on?"#241006":"var(--faint)"; ic.innerHTML=starSvg(on); }
    await setFeatured(id,on);
  });
  $("stardone").onclick=closeSheet;
}
function openSignOutSheet(){
  openSheet(`<h2>Sign out?</h2><p class="sh-sub">There are no passwords here &mdash; your recovery code <b>is</b> your account. Save it before you sign out, or you won&rsquo;t be able to get your lists and notes back on this device.</p>
    <div class="codebox" id="so-code">${esc(me.uid)}</div>
    <button class="save" id="so-copy">Copy my recovery code</button>
    <button class="ghostbtn danger" id="so-go">Sign out on this device</button>
    <button class="ghostbtn" id="so-cancel">Cancel</button>`);
  $("so-copy").onclick=async()=>{ try{ await navigator.clipboard.writeText(me.uid); $("so-copy").textContent="Copied \u2713"; }catch(e){ $("so-copy").textContent="Select the code above to copy"; } };
  $("so-cancel").onclick=closeSheet;
  $("so-go").onclick=()=>{ const b=$("so-go");
    if(b.dataset.confirm){ signOut(); }
    else{ b.dataset.confirm="1"; b.textContent="Tap again to sign out"; setTimeout(()=>{const x=$("so-go");if(x){delete x.dataset.confirm;x.textContent="Sign out on this device";}},3000); }
  };
}
// Wipe the local profile and hard-reload. The reload is deliberate: the Firestore
// listeners are keyed to me.uid and guarded by the `started` flag, so a soft sign-out
// + new sign-in would leave stale listeners on the old profile. A full reload resets
// all module state; boot() then sees no profile and shows the gate. The cached shell
// makes this work offline too.
function signOut(){
  try{ localStorage.removeItem("cf-uid"); localStorage.removeItem("cf-name"); localStorage.removeItem("cf-color"); localStorage.removeItem("cf-admin"); }catch(e){}
  location.reload();
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
