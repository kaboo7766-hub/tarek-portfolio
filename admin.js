import{auth,db,ADMIN_EMAIL}from"./firebase-config.js";
import{GoogleAuthProvider,signInWithPopup,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import{collection,addDoc,getDocs,doc,updateDoc,deleteDoc,getDoc,setDoc,serverTimestamp,query,orderBy}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const $=id=>document.getElementById(id),provider=new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});
let user=null,profilePath="",profileFile=null,projectFile=null;
let editorBitmap=null,editorSource=null,editorKind="",editorObjectUrl="";

const owner=()=>!!user&&user.emailVerified&&user.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase();
function msg(id,s,error=false){$(id).textContent=s;$(id).classList.toggle("error",error)}
function valid(f){
  if(!f)return"اختر صورة أولًا";
  if(!/^image\/(jpeg|png|webp|avif|heic|heif)$/i.test(f.type))return"استخدم صورة JPG أو PNG أو WEBP أو AVIF";
  if(f.size>50*1024*1024)return"حجم الصورة أكبر من 50 ميجابايت";
  return"";
}
function aspectValue(){
  const value=$("cropAspect").value;
  if(value==="4:5")return 4/5;
  if(value==="1:1")return 1;
  if(value==="16:9")return 16/9;
  return editorBitmap.width/editorBitmap.height;
}
function cropRect(){
  const imageW=editorBitmap.width,imageH=editorBitmap.height,ratio=aspectValue();
  let w=imageW,h=imageH;
  if(w/h>ratio)w=h*ratio;else h=w/ratio;
  const zoom=Number($("cropZoom").value)||1;
  w/=zoom;h/=zoom;
  const maxX=Math.max(0,(imageW-w)/2),maxY=Math.max(0,(imageH-h)/2);
  const px=(Number($("cropX").value)-50)/50,py=(Number($("cropY").value)-50)/50;
  const cx=imageW/2+px*maxX,cy=imageH/2+py*maxY;
  return{x:Math.max(0,Math.min(imageW-w,cx-w/2)),y:Math.max(0,Math.min(imageH-h,cy-h/2)),w,h};
}
function drawCrop(){
  if(!editorBitmap)return;
  const rect=cropRect(),canvas=$("cropCanvas"),ratio=rect.w/rect.h;
  let width=720,height=Math.round(width/ratio);
  if(height>720){height=720;width=Math.round(height*ratio)}
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  ctx.fillStyle="#071727";ctx.fillRect(0,0,width,height);
  ctx.drawImage(editorBitmap,rect.x,rect.y,rect.w,rect.h,0,0,width,height);
  $("cropZoomValue").textContent=Number($("cropZoom").value).toFixed(1)+"×";
}
function closeEditor(){
  $("imageEditor").hidden=true;
  editorBitmap?.close?.();editorBitmap=null;
  if(editorObjectUrl)URL.revokeObjectURL(editorObjectUrl);
  editorObjectUrl="";
}
async function openEditor(file,kind){
  const error=valid(file);if(error)throw Error(error);
  editorSource=file;editorKind=kind;
  editorBitmap=await createImageBitmap(file);
  $("cropAspect").value=kind==="profile"?"4:5":"16:9";
  $("cropZoom").value=1;$("cropX").value=50;$("cropY").value=50;
  $("cropFileInfo").textContent=file.name+" — "+(file.size/1024/1024).toFixed(2)+" ميجابايت";
  $("imageEditor").hidden=false;drawCrop();
}
async function applyCrop(){
  if(!editorBitmap)return;
  const rect=cropRect(),canvas=document.createElement("canvas");
  const ratio=rect.w/rect.h;
  let width=1800,height=Math.round(width/ratio);
  if(height>1800){height=1800;width=Math.round(height*ratio)}
  canvas.width=width;canvas.height=height;
  canvas.getContext("2d",{alpha:false}).drawImage(editorBitmap,rect.x,rect.y,rect.w,rect.h,0,0,width,height);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error("تعذر تجهيز الصورة")),"image/webp",.92));
  const cropped=new File([blob],"portfolio-image.webp",{type:"image/webp"});
  if(editorKind==="profile"){
    profileFile=cropped;$("adminProfilePreview").src=URL.createObjectURL(cropped);$("adminProfilePreview").hidden=false;$("adminProfileFallback").hidden=true;
    msg("profileMessage","تم تجهيز الصورة. اضغط رفع وحفظ الصورة.");
  }else{
    projectFile=cropped;$("projectImagePreview").src=URL.createObjectURL(cropped);$("projectImagePreview").hidden=false;$("removeProjectImage").checked=false;
    msg("adminMessage","تم تجهيز صورة المشروع. احفظ المشروع لاعتمادها.");
  }
  closeEditor();
}
async function compress(f){
  const bitmap=await createImageBitmap(f);
  let scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height)),blob=null;
  for(let attempt=0;attempt<8;attempt++){
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext("2d",{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);
    blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error("تعذر ضغط الصورة")),"image/webp",Math.max(.48,.86-attempt*.06)));
    if(blob.size<=2.5*1024*1024)break;
    scale*=.78;
  }
  bitmap.close?.();
  if(!blob||blob.size>2.5*1024*1024)throw Error("تعذر الوصول بحجم الصورة النهائي إلى الحد المسموح. قلّل القص أو اختر صورة أخرى.");
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
$("profileFile").onchange=async event=>{
  const file=event.target.files[0]||null;if(!file)return;
  try{await openEditor(file,"profile")}catch(error){msg("profileMessage",error.message,true);event.target.value=""}
};
$("uploadProfileButton").onclick=async()=>{
  if(!owner()||!profileFile){msg("profileMessage","اختر صورة وجهّزها أولًا",true);return}
  const button=$("uploadProfileButton");button.disabled=true;
  try{
    const result=await upload(profileFile,"profile");
    await setDoc(doc(db,"settings","profile"),{photoUrl:result.url,photoPath:result.path,updatedAt:serverTimestamp()},{merge:true});
    await del(profilePath);profilePath=result.path;profileFile=null;$("profileFile").value="";
    msg("profileMessage","تم رفع الصورة وحفظها على GitHub بنجاح");
  }catch(error){msg("profileMessage",error.message,true)}finally{button.disabled=false}
};
$("projectImageFile").onchange=async event=>{
  const file=event.target.files[0]||null;if(!file)return;
  try{await openEditor(file,"project")}catch(error){msg("adminMessage",error.message,true);event.target.value=""}
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
$("cropAspect").onchange=drawCrop;
["cropZoom","cropX","cropY"].forEach(id=>$(id).oninput=drawCrop);
$("applyCropButton").onclick=async()=>{const button=$("applyCropButton");button.disabled=true;try{await applyCrop()}catch(error){msg("cropMessage",error.message,true)}finally{button.disabled=false}};
$("cancelCropButton").onclick=()=>{closeEditor();if(editorKind==="profile")$("profileFile").value="";else $("projectImageFile").value=""};
