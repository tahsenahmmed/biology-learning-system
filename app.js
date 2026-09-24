const SUPABASE_URL="https://nyuzirfxfzyvnnmshffz.supabase.co";
const SUPABASE_KEY="sb_publishable_IJ77OXLurFMxd8HhkDfe9g_1gd3KYYE";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
let state={courses:[],notes:[],files:[]},user=null,mode="signin";
const page=location.pathname.split("/").pop()||"index.html";
const currentPage=page.replace(".html","")||"index";

function course(id){return state.courses.find(c=>c.id===id)}
function chapter(courseId,id){return course(courseId)?.chapters.find(x=>x.id===id)}
function empty(text){return '<div class="empty">'+esc(text)+'</div>'}
function go(path){location.href=path}

function setupNavigation(){
  $$(".nav-item").forEach(a=>a.classList.toggle("active",a.dataset.page===currentPage));
  const titles={dashboard:"Dashboard",courses:"Courses",notes:"Notes",materials:"Study Materials",review:"Review"};
  if($("#pageTitle"))$("#pageTitle").textContent=titles[currentPage]||"BioStudy";
  const actions={
    dashboard:["+ Add course","courses.html"],
    courses:["+ Add course",null],
    notes:["+ Add note",null],
    materials:["+ Upload material",null],
    review:["",null]
  };
  if($("#headerAction")){
    const [label,target]=actions[currentPage]||["",null];
    $("#headerAction").textContent=label;
    $("#headerAction").hidden=!label;
    if(target)$("#headerAction").onclick=()=>go(target);
    if(currentPage==="courses")$("#headerAction").onclick=()=>$("#addCourseBtn")?.click();
    if(currentPage==="notes")$("#headerAction").onclick=()=>$("#addNoteBtn")?.click();
    if(currentPage==="materials")$("#headerAction").onclick=()=>$("#uploadFileBtn")?.click();
  }
  $("#searchBtn")?.addEventListener("click",openSearch);
  $("#logoutBtn")?.addEventListener("click",async()=>{await db.auth.signOut();go("index.html")});
}

async function load(){
  const [a,b,c,f]=await Promise.all([
    db.from("courses").select("*").order("created_at"),
    db.from("chapters").select("*").order("created_at"),
    db.from("notes").select("*").order("created_at",{ascending:false}),
    db.from("study_files").select("*").order("created_at",{ascending:false})
  ]);
  const err=a.error||b.error||c.error||f.error;
  if(err)throw err;
  state.courses=(a.data||[]).map(x=>({...x,chapters:(b.data||[]).filter(y=>y.course_id===x.id)}));
  state.notes=c.data||[];
  state.files=f.data||[];
  if($("#storageStatus"))$("#storageStatus").textContent="Connected";
  renderPage();
}

function renderPage(){
  if(currentPage==="dashboard")renderDashboard();
  if(currentPage==="courses")renderCourses();
  if(currentPage==="notes"){renderNotes($("#noteSearch")?.value||"");updateNoteCourses()}
  if(currentPage==="materials")renderMaterials();
  if(currentPage==="review")renderReview();
}

function renderDashboard(){
  $("#courseCount").textContent=state.courses.length;
  $("#chapterCount").textContent=state.courses.reduce((n,c)=>n+c.chapters.length,0);
  $("#noteCount").textContent=state.notes.length;
  $("#fileCount").textContent=state.files.length;
  const b=$("#dashboardCourses");
  if(!state.courses.length){b.innerHTML=empty("No courses yet. Your biology empire awaits its first brick.");return}
  b.innerHTML=state.courses.map(c=>'<article class="course-card"><h4>'+esc(c.name)+'</h4><p>'+esc(c.description||"Biology course")+'</p><div class="course-meta"><span>'+c.chapters.length+' chapters</span><span>'+state.notes.filter(n=>n.course_id===c.id).length+' notes</span></div><a class="ghost-btn inline-btn" href="courses.html">Open course area</a></article>').join("");
}

function renderCourses(){
  const b=$("#coursesList");
  if(!state.courses.length){b.innerHTML=empty("No courses yet.");return}
  b.innerHTML=state.courses.map(c=>'<article class="course-row"><div class="course-info"><h4>'+esc(c.name)+'</h4><p>'+esc(c.description||"No description")+'</p><div class="chapter-list">'+(c.chapters.length?c.chapters.map(ch=>'<span class="chapter-chip">'+esc(ch.name)+'</span>').join(""):'<span class="chapter-chip">No chapters yet</span>')+'</div></div><div class="top-actions"><button class="ghost-btn" onclick="openChapter(\''+c.id+'\')">+ Chapter</button><button class="ghost-btn" onclick="deleteCourse(\''+c.id+'\')">Delete</button></div></article>').join("");
}

function updateNoteCourses(){
  if(!$("#noteCourse"))return;
  $("#noteCourse").innerHTML='<option value="">Unassigned</option>'+state.courses.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");
  updateChapterOptions();
}
function updateChapterOptions(){
  if(!$("#noteChapter"))return;
  const c=course($("#noteCourse").value);
  $("#noteChapter").innerHTML='<option value="">Unassigned</option>'+(c?.chapters||[]).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join("");
}
function renderNotes(q){
  const b=$("#notesList"); if(!b)return;
  q=q.toLowerCase().trim();
  const ns=state.notes.filter(n=>!q||[n.title,n.content,(n.tags||[]).join(" "),course(n.course_id)?.name,chapter(n.course_id,n.chapter_id)?.name].join(" ").toLowerCase().includes(q));
  if(!ns.length){b.innerHTML=empty("No notes match your search.");return}
  b.innerHTML=ns.map(n=>'<article class="note-card"><h4>'+esc(n.title)+'</h4><div class="note-meta">'+(n.tags||[]).map(t=>'<span class="tag">#'+esc(t)+'</span>').join("")+'</div><div class="content">'+esc(n.content)+'</div><div class="note-footer"><span class="tag">'+esc(course(n.course_id)?.name||"Unassigned")+'</span><button class="ghost-btn" onclick="toggleReviewed(\''+n.id+'\')">'+(n.reviewed?"Reviewed ✓":"Mark reviewed")+'</button></div></article>').join("");
}
function renderReview(){
  const b=$("#reviewList"); if(!b)return;
  const ns=state.notes.filter(n=>!n.reviewed);
  b.innerHTML=ns.length?ns.map(n=>'<article class="review-card"><button class="primary-btn" onclick="toggleReviewed(\''+n.id+'\')">Mark reviewed</button><h4>'+esc(n.title)+'</h4><p>'+esc(n.content.slice(0,180))+'</p></article>').join(""):empty("Review queue is clear. Suspiciously productive.");
}
function formatSize(bytes){
  if(bytes<1024)return bytes+" B";
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+" KB";
  return (bytes/1024/1024).toFixed(1)+" MB";
}
function renderMaterials(){
  const b=$("#filesList"); if(!b)return;
  const filter=$("#materialFilter")?.value||"";
  const files=state.files.filter(f=>!filter||f.course_id===filter);
  if(!files.length){b.innerHTML=empty("No study materials here yet. Upload your PDFs, documents, or images.");return}
  b.innerHTML=files.map(f=>'<article class="file-card"><div class="file-icon">'+esc((f.mime_type||"FILE").split("/").pop().toUpperCase().slice(0,4))+'</div><div class="file-info"><h4>'+esc(f.name)+'</h4><p>'+esc(course(f.course_id)?.name||"Unassigned")+(chapter(f.course_id,f.chapter_id)?' · '+esc(chapter(f.course_id,f.chapter_id).name):"")+'</p><small>'+formatSize(f.size)+' · '+new Date(f.created_at).toLocaleDateString()+'</small></div><div class="file-actions"><button class="ghost-btn" onclick="openFile(\''+f.id+'\')">Open</button><button class="ghost-btn" onclick="deleteFile(\''+f.id+'\')">Delete</button></div></article>').join("");
  if($("#materialFilter")&&$("#materialFilter").options.length===1)$("#materialFilter").innerHTML='<option value="">All courses</option>'+state.courses.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");
}
async function openFile(id){
  const f=state.files.find(x=>x.id===id); if(!f)return;
  const r=await db.storage.from("study-files").createSignedUrl(f.path,3600);
  if(r.error)return alert(r.error.message);
  window.open(r.data.signedUrl,"_blank","noopener");
}
async function deleteFile(id){
  const f=state.files.find(x=>x.id===id); if(!f)return;
  if(!confirm("Delete this study material?"))return;
  const s=await db.storage.from("study-files").remove([f.path]);
  if(s.error)return alert(s.error.message);
  const r=await db.from("study_files").delete().eq("id",id);
  if(r.error)return alert(r.error.message);
  await load();
}
function openChapter(id){
  $("#chapterCourseId").value=id;$("#chapterName").value="";$("#chapterDialog").showModal();
}
async function deleteCourse(id){
  if(!confirm("Delete this course? Its notes will become unassigned."))return;
  const r=await db.from("courses").delete().eq("id",id);
  if(r.error)return alert(r.error.message);
  await load();
}
async function toggleReviewed(id){
  const n=state.notes.find(x=>x.id===id);if(!n)return;
  const r=await db.from("notes").update({reviewed:!n.reviewed,updated_at:new Date().toISOString()}).eq("id",id);
  if(r.error)return alert(r.error.message);
  await load();
}
function setupCourses(){
  $("#addCourseBtn")?.addEventListener("click",()=>{$("#courseForm").reset();$("#courseDialog").showModal()});
  $("#courseForm")?.addEventListener("submit",async e=>{e.preventDefault();const r=await db.from("courses").insert({user_id:user.id,name:$("#courseName").value.trim(),description:$("#courseDescription").value.trim()});if(r.error)return alert(r.error.message);$("#courseDialog").close();await load()});
  $("#chapterForm")?.addEventListener("submit",async e=>{e.preventDefault();const r=await db.from("chapters").insert({course_id:$("#chapterCourseId").value,name:$("#chapterName").value.trim()});if(r.error)return alert(r.error.message);$("#chapterDialog").close();await load()});
}
function setupNotes(){
  $("#addNoteBtn")?.addEventListener("click",()=>{if(!state.courses.length)return alert("Create a course first.");$("#noteForm").reset();updateNoteCourses();$("#noteDialog").showModal()});
  $("#noteCourse")?.addEventListener("change",updateChapterOptions);
  $("#noteSearch")?.addEventListener("input",e=>renderNotes(e.target.value));
  $("#noteForm")?.addEventListener("submit",async e=>{e.preventDefault();const r=await db.from("notes").insert({user_id:user.id,title:$("#noteTitle").value.trim(),course_id:$("#noteCourse").value||null,chapter_id:$("#noteChapter").value||null,tags:$("#noteTags").value.split(",").map(x=>x.trim()).filter(Boolean),content:$("#noteContent").value.trim()});if(r.error)return alert(r.error.message);$("#noteDialog").close();await load()});
}
function setupMaterials(){
  $("#uploadFileBtn")?.addEventListener("click",()=>{if($("#fileCourse"))$("#fileCourse").innerHTML='<option value="">Unassigned</option>'+state.courses.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");updateFileChapters();$("#fileDialog").showModal()});
  $("#fileCourse")?.addEventListener("change",updateFileChapters);
  $("#materialFilter")?.addEventListener("change",renderMaterials);
  $("#fileForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=$("#studyFile").files[0];if(!f)return;const path=user.id+"/"+crypto.randomUUID()+"-"+f.name.replace(/[^a-zA-Z0-9._-]/g,"_");const up=await db.storage.from("study-files").upload(path,f);if(up.error)return alert(up.error.message);const r=await db.from("study_files").insert({user_id:user.id,course_id:$("#fileCourse").value||null,chapter_id:$("#fileChapter").value||null,name:f.name,path,size:f.size,mime_type:f.type});if(r.error){await db.storage.from("study-files").remove([path]);return alert(r.error.message)}$("#fileDialog").close();await load()});
}
function updateFileChapters(){
  if(!$("#fileChapter"))return;
  const c=course($("#fileCourse")?.value);
  $("#fileChapter").innerHTML='<option value="">Unassigned</option>'+(c?.chapters||[]).map(x=>'<option value="'+x.id+'">'+esc(x.name)+'</option>').join("");
}
function openSearch(){
  if(!$("#searchDialog"))return;
  $("#globalSearch").value="";$("#searchResults").innerHTML="";$("#searchDialog").showModal();$("#globalSearch").focus();
}
function setupSearch(){
  $("#globalSearch")?.addEventListener("input",e=>{
    const q=e.target.value.toLowerCase().trim(),a=[];
    state.courses.forEach(c=>{if(!q||c.name.toLowerCase().includes(q))a.push('<div class="search-result"><strong>'+esc(c.name)+'</strong><span>Course</span></div>')});
    state.notes.forEach(n=>{if(!q||[n.title,n.content].join(" ").toLowerCase().includes(q))a.push('<div class="search-result"><strong>'+esc(n.title)+'</strong><span>Note</span></div>')});
    state.files.forEach(f=>{if(!q||f.name.toLowerCase().includes(q))a.push('<div class="search-result"><strong>'+esc(f.name)+'</strong><span>Study material</span></div>')});
    $("#searchResults").innerHTML=a.slice(0,30).join("")||empty("Nothing found.");
  });
}
function setupAuth(){
  $("#authToggle")?.addEventListener("click",()=>{
    mode=mode==="signin"?"signup":"signin";
    $("#authTitle").textContent=mode==="signin"?"Sign in to BioStudy":"Create your BioStudy account";
    $("#authSubmit").textContent=mode==="signin"?"Sign in":"Create account";
    $("#authToggle").textContent=mode==="signin"?"Create a new account":"I already have an account";
    $("#authMessage").textContent="";
  });
  $("#authForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
    const r=mode==="signin"?await db.auth.signInWithPassword({email,password}):await db.auth.signUp({email,password});
    if(r.error){$("#authMessage").textContent=r.error.message;return}
    if(mode==="signup"&&!r.data.session){$("#authMessage").textContent="Account created. Check your email, then sign in.";return}
    go("dashboard.html");
  });
}
(async()=>{
  const s=await db.auth.getSession();
  if(page==="index.html"||page===""){
    if(s.data.session){go("dashboard.html");return}
    setupAuth();return;
  }
  if(!s.data.session){go("index.html");return}
  user=s.data.session.user;
  setupNavigation();setupCourses();setupNotes();setupMaterials();setupSearch();
  try{await load()}catch(e){console.error(e);if($("#storageStatus"))$("#storageStatus").textContent="Setup pending";alert("Cloud data could not be loaded. Refresh shortly.")} 
})();