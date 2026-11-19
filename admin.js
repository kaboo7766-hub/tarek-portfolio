import{auth,db,ADMIN_EMAIL}from"./firebase-config.js";
import{GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import{collection,addDoc,getDocs,doc,updateDoc,deleteDoc,getDoc,setDoc,serverTimestamp,query,orderBy}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const $=id=>document.getElementById(id),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});
let user=null,profilePath="",profileFile=null,projectFile=null;

const owner=()=>!!user&&user.emailVerified&&user.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase();
function msg(id,s,error=false){$(id).textContent=s;$(id).classList.toggle("error",error)}
function valid(f){
  if(!f)return"اختر صورة أولًا";
  if(!["image/jpeg","image/png","image/webp"].includes(f.type))return"استخدم JPG أو PNG أو WEBP";
  if(f.size>8*1024*1024)return"حجم الصورة الأصلية أكبر من 8 ميجابايت";
  return"";
}
async function compress(f){
  const error=valid(f);if(error)throw Error(error);
  const bitmap=await createImageBitmap(f);
  let scale=1,blob=null;
  for(let attempt=0;attempt<6;attempt++){
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);
    blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error("تعذر ضغط الصورة")),"image/webp",Math.max(0.32,0.78-attempt*0.09)));
    if(blob.size<=2.5*1024*1024)break;
  }
  bitmap.close?.();
  if(!blob||blob.size>2.5*1024*1024)throw Error("الصورة كبيرة جدًا بعد الضغط. اختر صورة أصغر.");
  return blob;
}
async function api(action,payload={}){
  if(!user)throw Error("سجّل الدخول أولًا");
  const token=await user.getIdToken();
  const response=await fetch("/api/upload-image",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},
    body:JSON.stringify({action,...payload})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"تعذر تنفيذ عملية الصور");
  return data;
}
async function upload(file,kind){
  const blob=await compress(file);
  const base64=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result).split(",")[1]||"");
    reader.onerror=()=>reject(Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(blob);
  });
  return api("upload",{kind,contentBase64:base64});
}
async function del(path){
  // Ignore legacy Firebase Storage paths; only GitHub-hosted portfolio assets are deleted here.
  if(path&&path.startsWith("uploads/"))try{await api("delete",{path})}catch(error){console.warn("Image cleanup failed:",error)}
}
async function loadProfile(){
  const s=await getDoc(doc(db,"settings","profile"));if(!s.exists())return;
  const d=s.data();profilePath=d.photoPath||"";
  if(d.photoUrl){$("adminProfilePreview").src=d.photoUrl;$("adminProfilePreview").hidden=false;$("adminProfileFallback").hidden=true}
}
function reset(){
  $("projectForm").reset();$("projectId").value="";$("oldImagePath").value="";$("order").value=1;
  $("featured").checked=true;$("formTitle").textContent="إضافة مشروع جديد";$("saveButton").textContent="حفظ المشروع";
  $("cancelEditButton").hidden=true;$("projectImagePreview").hidden=true;$("removeProjectImage").checked=false;projectFile=null;
}
async function load(){
  if(!owner())return;
  const root=$("adminProjects");root.textContent="جارٍ التحميل...";
  try{
    const snapshot=await getDocs(query(collection(db,"projects"),orderBy("order","asc")));
    root.replaceChildren();
    if(snapshot.empty){root.textContent="لا توجد مشاريع بعد.";return}
    snapshot.forEach(item=>{
      const p=item.data(),box=document.createElement("article"),info=document.createElement("div"),h=document.createElement("h3"),small=document.createElement("p"),actions=document.createElement("div"),edit=document.createElement("button"),remove=document.createElement("button");
      box.className="admin-project";h.textContent=p.titleAr||"مشروع";small.textContent=p.featured?"منشور":"غير منشور";
      info.append(h,small);edit.textContent="تعديل";remove.textContent="حذف";remove.className="delete";
      edit.onclick=()=>fill(item.id,p);
      remove.onclick=async()=>{
        if(!owner()||!confirm("تأكيد حذف المشروع؟"))return;
        try{await deleteDoc(doc(db,"projects",item.id));await del(p.imagePath);msg("adminMessage","تم الحذف بنجاح");load()}
        catch(error){msg("adminMessage",error.message,true)}
      };
      actions.append(edit,remove);box.append(info,actions);root.append(box);
    });
  }catch(error){msg("adminProjects",error.message,true)}
}
function fill(id,p){
  $("projectId").value=id;$("oldImagePath").value=p.imagePath||"";
  ["titleAr","titleEn","descriptionAr","descriptionEn","category","order","liveUrl","githubUrl"].forEach(key=>$(key).value=p[key]??"");
  $("featured").checked=!!p.featured;$("formTitle").textContent="تعديل المشروع";$("saveButton").textContent="حفظ التعديلات";
  $("cancelEditButton").hidden=false;
  if(p.imageUrl){$("projectImagePreview").src=p.imageUrl;$("projectImagePreview").hidden=false}else $("projectImagePreview").hidden=true;
  window.scrollTo({top:0,behavior:"smooth"});
}
onAuthStateChanged(auth,async current=>{
  user=current;
  if(!current){$("loginSection").hidden=false;$("dashboardSection").hidden=true;return}
  if(!owner()){
    await signOut(auth);$("loginSection").hidden=false;$("dashboardSection").hidden=true;
    msg("loginMessage","الحساب غير مصرح له بالدخول",true);return;
  }
  $("loginSection").hidden=true;$("dashboardSection").hidden=false;$("adminEmail").textContent=current.email;
  try{await loadProfile();await load()}catch(error){msg("adminMessage",error.message,true)}
});
$("googleLoginButton").onclick=async()=>{try{await signInWithPopup(auth,provider)}catch(error){msg("loginMessage",error.code||error.message,true)}};
$("logoutButton").onclick=()=>signOut(auth);
$("profileFile").onchange=event=>{
  profileFile=event.target.files[0]||null;if(!profileFile)return;
  const error=valid(profileFile);if(error){msg("profileMessage",error,true);profileFile=null;return}
  $("adminProfilePreview").src=URL.createObjectURL(profileFile);$("adminProfilePreview").hidden=false;$("adminProfileFallback").hidden=true;
};
$("uploadProfileButton").onclick=async()=>{
  if(!owner()||!profileFile){msg("profileMessage","اختر صورة صالحة أولًا",true);return}
  const button=$("uploadProfileButton");button.disabled=true;
  try{
    const result=await upload(profileFile,"profile");
    await setDoc(doc(db,"settings","profile"),{photoUrl:result.url,photoPath:result.path,updatedAt:serverTimestamp()},{merge:true});
    await del(profilePath);profilePath=result.path;profileFile=null;$("profileFile").value="";
    msg("profileMessage","تم رفع الصورة وحفظها على GitHub بنجاح");
  }catch(error){msg("profileMessage",error.message,true)}finally{button.disabled=false}
};
$("projectImageFile").onchange=event=>{
  projectFile=event.target.files[0]||null;if(!projectFile)return;
  const error=valid(projectFile);if(error){msg("adminMessage",error,true);projectFile=null;return}
  $("projectImagePreview").src=URL.createObjectURL(projectFile);$("projectImagePreview").hidden=false;$("removeProjectImage").checked=false;
};
$("removeProjectImage").onchange=event=>{
  if(event.target.checked){projectFile=null;$("projectImageFile").value="";$("projectImagePreview").hidden=true}
};
$("projectForm").onsubmit=async event=>{
  event.preventDefault();if(!owner())return;
  const id=$("projectId").value,live=$("liveUrl").value.trim(),git=$("githubUrl").value.trim();
  const validUrl=value=>{if(!value)return true;try{return["https:","http:"].includes(new URL(value).protocol)}catch{return false}};
  if(!validUrl(live)||!validUrl(git)){msg("adminMessage","الروابط غير صحيحة",true);return}
  const button=$("saveButton");button.disabled=true;button.textContent="جارٍ الحفظ...";
  let imageUrl="",imagePath=$("oldImagePath").value;
  try{
    if(projectFile){
      const result=await upload(projectFile,"projects");imageUrl=result.url;imagePath=result.path;
    }else if(id&&!$("removeProjectImage").checked){
      const old=await getDoc(doc(db,"projects",id));imageUrl=old.exists()?old.data().imageUrl||"":"";
    }
    if($("removeProjectImage").checked){imageUrl="";imagePath=""}
    const data={
      titleAr:$("titleAr").value.trim(),titleEn:$("titleEn").value.trim(),
      descriptionAr:$("descriptionAr").value.trim(),descriptionEn:$("descriptionEn").value.trim(),
      category:$("category").value.trim(),order:Number($("order").value)||0,
      liveUrl:live,githubUrl:git,featured:$("featured").checked,imageUrl,imagePath,updatedAt:serverTimestamp()
    };
    if(!data.titleAr)throw Error("اسم المشروع بالعربي مطلوب");
    if(id){
      await updateDoc(doc(db,"projects",id),data);
      if($("oldImagePath").value&&$("oldImagePath").value!==imagePath)await del($("oldImagePath").value);
    }else{data.createdAt=serverTimestamp();await addDoc(collection(db,"projects"),data)}
    msg("adminMessage","تم حفظ المشروع بنجاح");reset();await load();
  }catch(error){msg("adminMessage","تعذر الحفظ: "+error.message,true)}
  finally{button.disabled=false;button.textContent=$("projectId").value?"حفظ التعديلات":"حفظ المشروع"}
};
$("cancelEditButton").onclick=reset;
$("refreshProjects").onclick=load;
