const KEY="biostudy-v1";
const state=JSON.parse(localStorage.getItem(KEY)||"null")||{courses:[],notes:[]};
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const esc=s=>String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const save=()=>{localStorage.setItem(KEY,JSON.stringify(state));render()};
const course=id=>state.courses.find(c=>c.id===id);
const chapter=(cid,id)=>{const c=course(cid);return c&&c.chapters.find(x=>x.id===id)};
function id(){return crypto.randomUUID()}
function empty(msg){return '<div class="empty">'+msg+'</div>'}

function render(){
  $("#courseCount").textContent=state.courses.length;
  $("#chapterCount").textContent=state.courses.reduce((n,c)=>n+c.chapters.length,0);
  $("#noteCount").textContent=state.notes.length;
  $("#reviewedCount").textContent=state.notes.filter(n=>n.reviewed).length;
  renderDashboard();renderCourses();renderNotes($("#noteSearch").value||"");renderReview();updateNoteCourses();
}
function renderDashboard(){
  const box=$("#dashboardCourses");
  if(!state.courses.length){box.innerHTML=empty("No courses yet. Your biology empire awaits its first brick.");return}
  box.innerHTML=state.courses.map(c=>'<article class="course-card"><h4>'+esc(c.name)+'</h4><p>'+esc(c.description||"Biology course")+'</p><div class="course-meta"><span>'+c.chapters.length+' chapter'+(c.chapters.length===1?"":"s")+'</span><span>'+state.notes.filter(n=>n.courseId===c.id).length+' notes</span></div><button class="ghost-btn" onclick="openChapter(\''+c.id+'\')">+ Chapter</button></article>').join("");
}
function renderCourses(){
  const box=$("#coursesList");
  if(!state.courses.length){box.innerHTML=empty("No courses yet.");return}
  box.innerHTML=state.courses.map(c=>'<article class="course-row"><div class="course-info"><h4>'+esc(c.name)+'</h4><p>'+esc(c.description||"No description")+'</p><div class="chapter-list">'+(c.chapters.length?c.chapters.map(ch=>'<span class="chapter-chip">'+esc(ch.name)+'</span>').join(""):'<span class="chapter-chip">No chapters yet</span>')+'</div></div><div class="top-actions"><button class="ghost-btn" onclick="openChapter(\''+c.id+'\')">+ Chapter</button><button class="ghost-btn" onclick="deleteCourse(\''+c.id+'\')">Delete</button></div></article>').join("");
}
function renderNotes(filter){
  const q=(filter||"").toLowerCase().trim();
  const notes=state.notes.filter(n=>{
    const c=course(n.courseId),ch=chapter(n.courseId,n.chapterId);
    return !q||[n.title,n.content,(n.tags||[]).join(" "),c&&c.name,ch&&ch.name].join(" ").toLowerCase().includes(q)
  });
  const box=$("#notesList");
  if(!notes.length){box.innerHTML=empty("No notes match your search.");return}
  box.innerHTML=notes.map(n=>{
    const c=course(n.courseId),ch=chapter(n.courseId,n.chapterId);
    const tags=(n.tags||[]).map(t=>'<span class="tag">#'+esc(t)+'</span>').join("");
    return '<article class="note-card"><h4>'+esc(n.title)+'</h4><div class="note-meta">'+tags+'</div><div class="content">'+esc(n.content)+'</div><div class="note-footer"><span class="tag">'+esc(c?c.name:"Unassigned")+(ch?" · "+esc(ch.name):"")+'</span><button class="ghost-btn" onclick="toggleReviewed(\''+n.id+'\')">'+(n.reviewed?"Reviewed ✓":"Mark reviewed")+'</button></div></article>'
  }).join("");
}
function renderReview(){
  const notes=state.notes.filter(n=>!n.reviewed),box=$("#reviewList");
  if(!notes.length){box.innerHTML=empty("Review queue is clear. Suspiciously productive.");return}
  box.innerHTML=notes.map(n=>'<article class="review-card"><button class="primary-btn" onclick="toggleReviewed(\''+n.id+'\')">Mark reviewed</button><h4>'+esc(n.title)+'</h4><p>'+esc(n.content.slice(0,180))+(n.content.length>180?"…":"")+'</p></article>').join("");
}
function updateNoteCourses(){
  $("#noteCourse").innerHTML='<option value="">Unassigned</option>'+state.courses.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join("");
  updateChapterOptions();
}
function updateChapterOptions(){
  const c=course($("#noteCourse").value);
  $("#noteChapter").innerHTML='<option value="">Unassigned</option>'+((c&&c.chapters)||[]).map(ch=>'<option value="'+ch.id+'">'+esc(ch.name)+'</option>').join("");
}
function openChapter(cid){$("#chapterCourseId").value=cid;$("#chapterName").value="";$("#chapterDialog").showModal()}
function deleteCourse(cid){
  if(!confirm("Delete this course? Its notes will become unassigned."))return;
  state.courses=state.courses.filter(c=>c.id!==cid);
  state.notes.forEach(n=>{if(n.courseId===cid){n.courseId=null;n.chapterId=null}});
  save();
}
function toggleReviewed(nid){const n=state.notes.find(x=>x.id===nid);if(n){n.reviewed=!n.reviewed;save()}}

$$(".nav-item").forEach(btn=>btn.onclick=()=>{
  $$(".nav-item").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
  $$(".view").forEach(v=>v.classList.remove("active"));$("#"+btn.dataset.view+"View").classList.add("active");
  $("#pageTitle").textContent=btn.querySelector("span").textContent;
});
$("#addCourseBtn").onclick=$("#addCourseBtn2").onclick=()=>{$("#courseForm").reset();$("#courseDialog").showModal()};
$("#courseForm").onsubmit=e=>{
  e.preventDefault();
  state.courses.push({id:id(),name:$("#courseName").value.trim(),description:$("#courseDescription").value.trim(),chapters:[]});
  $("#courseDialog").close();save();
};
$("#chapterForm").onsubmit=e=>{
  e.preventDefault();
  const c=course($("#chapterCourseId").value);
  if(c)c.chapters.push({id:id(),name:$("#chapterName").value.trim()});
  $("#chapterDialog").close();save();
};
$("#addNoteBtn").onclick=()=>{
  if(!state.courses.length){alert("Create a course first.");return}
  $("#noteForm").reset();updateNoteCourses();$("#noteDialog").showModal();
};
$("#noteCourse").onchange=updateChapterOptions;
$("#noteForm").onsubmit=e=>{
  e.preventDefault();
  state.notes.unshift({id:id(),title:$("#noteTitle").value.trim(),courseId:$("#noteCourse").value||null,chapterId:$("#noteChapter").value||null,tags:$("#noteTags").value.split(",").map(x=>x.trim()).filter(Boolean),content:$("#noteContent").value.trim(),reviewed:false});
  $("#noteDialog").close();save();
};
$("#noteSearch").oninput=e=>renderNotes(e.target.value);
$("#searchBtn").onclick=()=>{$("#globalSearch").value="";$("#searchResults").innerHTML="";$("#searchDialog").showModal();$("#globalSearch").focus()};
$("#globalSearch").oninput=e=>{
  const q=e.target.value.toLowerCase().trim(),items=[];
  state.courses.forEach(c=>{if(!q||c.name.toLowerCase().includes(q))items.push('<div class="search-result"><strong>'+esc(c.name)+'</strong><span>Course · '+c.chapters.length+' chapters</span></div>')});
  state.notes.forEach(n=>{if(!q||[n.title,n.content].join(" ").toLowerCase().includes(q))items.push('<div class="search-result"><strong>'+esc(n.title)+'</strong><span>Note</span></div>')});
  $("#searchResults").innerHTML=items.slice(0,30).join("")||empty("Nothing found.");
};
render();