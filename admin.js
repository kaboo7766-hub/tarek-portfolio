import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const OWNER_UID = "TUcfHqJTVdVbqur8v7riZfDkJ432";
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const projectForm = document.getElementById("projectForm");
const loginMessage = document.getElementById("loginMessage");
const adminMessage = document.getElementById("adminMessage");
const adminProjects = document.getElementById("adminProjects");

function showMessage(element, message) { element.textContent = message; }
function safeURL(value) {
  if (!value) return "";
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}

onAuthStateChanged(auth, async user => {
  if (user && user.uid === OWNER_UID) {
    loginSection.hidden = true;
    dashboardSection.hidden = false;
    await loadAdminProjects();
  } else {
    dashboardSection.hidden = true;
    loginSection.hidden = false;
    if (user) {
      await signOut(auth);
      showMessage(loginMessage, "هذا الحساب ليس حساب المدير.");
    }
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  showMessage(loginMessage, "جارٍ تسجيل الدخول...");
  try { await signInWithEmailAndPassword(auth, email, password); }
  catch (error) { console.error(error); showMessage(loginMessage, "فشل تسجيل الدخول. راجع البريد وكلمة المرور وإعدادات Firebase."); }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  try { await signOut(auth); showMessage(loginMessage, "تم تسجيل الخروج."); }
  catch (error) { console.error(error); showMessage(adminMessage, "تعذر تسجيل الخروج."); }
});

projectForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!auth.currentUser || auth.currentUser.uid !== OWNER_UID) { showMessage(adminMessage, "ليس لديك صلاحية تنفيذ العملية."); return; }
  const projectId = document.getElementById("projectId").value;
  const imageUrl = document.getElementById("imageUrl").value.trim();
  const liveUrl = document.getElementById("liveUrl").value.trim();
  const githubUrl = document.getElementById("githubUrl").value.trim();
  if ((imageUrl && !safeURL(imageUrl)) || (liveUrl && !safeURL(liveUrl)) || (githubUrl && !safeURL(githubUrl))) { showMessage(adminMessage, "تأكد من صحة روابط الصورة والموقع وGitHub. يجب أن تبدأ بـ https:// أو http://"); return; }
  const project = {
    titleAr: document.getElementById("titleAr").value.trim(),
    titleEn: document.getElementById("titleEn").value.trim(),
    descriptionAr: document.getElementById("descriptionAr").value.trim(),
    descriptionEn: document.getElementById("descriptionEn").value.trim(),
    imageUrl, liveUrl, githubUrl,
    order: Math.max(0, Number(document.getElementById("order").value) || 0),
    featured: document.getElementById("featured").checked,
    updatedAt: serverTimestamp()
  };
  if (!project.titleAr) { showMessage(adminMessage, "اكتب اسم المشروع بالعربي."); return; }
  const saveButton = document.getElementById("saveButton");
  saveButton.disabled = true;
  try {
    if (projectId) {
      await updateDoc(doc(db, "projects", projectId), project);
      showMessage(adminMessage, "تم تحديث المشروع.");
    } else {
      project.createdAt = serverTimestamp();
      await addDoc(collection(db, "projects"), project);
      showMessage(adminMessage, "تمت إضافة المشروع.");
    }
    resetForm();
    await loadAdminProjects();
  } catch (error) { console.error(error); showMessage(adminMessage, "تعذر الحفظ. تحقق من قواعد Firestore والاتصال."); }
  finally { saveButton.disabled = false; }
});

async function loadAdminProjects() {
  adminProjects.textContent = "جاري تحميل المشاريع...";
  try {
    const projectsQuery = query(collection(db, "projects"), orderBy("order", "asc"));
    const snapshot = await getDocs(projectsQuery);
    adminProjects.replaceChildren();
    if (snapshot.empty) { adminProjects.textContent = "لا توجد مشاريع حتى الآن."; return; }
    snapshot.forEach(projectDoc => {
      const project = projectDoc.data();
      const card = document.createElement("article");
      card.className = "admin-project";
      card.innerHTML = `<h4>${escapeHTML(project.titleAr || "مشروع")}</h4><p>${escapeHTML(project.descriptionAr || "")}</p><p>${project.featured ? "منشور على الصفحة الرئيسية" : "غير منشور"}</p><button type="button" class="edit-button">تعديل</button><button type="button" class="delete-button">حذف</button>`;
      card.querySelector(".edit-button").addEventListener("click", () => fillForm(projectDoc.id, project));
      card.querySelector(".delete-button").addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن الحذف.")) return;
        try {
          if (!auth.currentUser || auth.currentUser.uid !== OWNER_UID) throw new Error("Unauthorized");
          await deleteDoc(doc(db, "projects", projectDoc.id));
          showMessage(adminMessage, "تم حذف المشروع.");
          await loadAdminProjects();
        } catch (error) { console.error(error); showMessage(adminMessage, "تعذر حذف المشروع."); }
      });
      adminProjects.appendChild(card);
    });
  } catch (error) { console.error(error); adminProjects.textContent = "تعذر تحميل المشاريع. تحقق من صلاحيات Firestore."; }
}

function fillForm(id, project) {
  document.getElementById("projectId").value = id;
  ["titleAr", "titleEn", "descriptionAr", "descriptionEn", "imageUrl", "liveUrl", "githubUrl", "order"].forEach(field => {
    document.getElementById(field).value = project[field] ?? "";
  });
  document.getElementById("featured").checked = !!project.featured;
  document.getElementById("formTitle").textContent = "تعديل المشروع";
  document.getElementById("saveButton").textContent = "حفظ التعديلات";
  document.getElementById("cancelEditButton").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  projectForm.reset();
  document.getElementById("projectId").value = "";
  document.getElementById("order").value = 1;
  document.getElementById("featured").checked = true;
  document.getElementById("formTitle").textContent = "إضافة مشروع جديد";
  document.getElementById("saveButton").textContent = "حفظ المشروع";
  document.getElementById("cancelEditButton").hidden = true;
}
document.getElementById("cancelEditButton").addEventListener("click", resetForm);
