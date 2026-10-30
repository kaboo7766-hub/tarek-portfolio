
import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// UID الخاص بحساب المدير
const OWNER_UID = "TUcfHqJTVdVbqur8v7riZfDkJ432";

// عناصر الصفحة
const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const projectForm = document.getElementById("projectForm");

const loginMessage = document.getElementById("loginMessage");
const adminMessage = document.getElementById("adminMessage");
const adminProjects = document.getElementById("adminProjects");

const loginButton = loginForm.querySelector('button[type="submit"]');
const saveButton = document.getElementById("saveButton");

let currentUser = null;

// رسائل الخطأ بالعربي
function getAuthError(error) {
  const errors = {
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/user-not-found": "هذا البريد غير مسجل في Firebase.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/invalid-credential": "بيانات الدخول غير صحيحة. راجع البريد وكلمة المرور.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
    "auth/user-disabled": "هذا الحساب معطل.",
    "auth/operation-not-allowed": "تسجيل الدخول بالبريد وكلمة المرور غير مفعل في Firebase.",
    "auth/network-request-failed": "تعذر الاتصال بالإنترنت.",
    "auth/unauthorized-domain": "رابط الموقع غير مضاف إلى Authorized domains في Firebase."
  };

  return errors[error.code] || `حدث خطأ: ${error.code || error.message}`;
}

function showMessage(element, message, type = "info") {
  element.textContent = message;
  element.style.color =
    type === "error" ? "#ff6464" :
    type === "success" ? "#4ade80" : "#38bdf8";
}

function isOwner() {
  return currentUser && currentUser.uid === OWNER_UID;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeURL(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }

    return "";
  } catch {
    return "";
  }
}

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    loginSection.hidden = false;
    dashboardSection.hidden = true;
    return;
  }

  if (user.uid !== OWNER_UID) {
    await signOut(auth);
    loginSection.hidden = false;
    dashboardSection.hidden = true;

    showMessage(
      loginMessage,
      "تم تسجيل الدخول، لكن هذا الحساب ليس حساب المدير المعتمد.",
      "error"
    );

    return;
  }

  loginSection.hidden = true;
  dashboardSection.hidden = false;

  showMessage(adminMessage, "مرحبًا بك في لوحة الإدارة.", "success");

  await loadAdminProjects();
});

// تسجيل الدخول
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage(loginMessage, "اكتب البريد الإلكتروني وكلمة المرور.", "error");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "جارٍ تسجيل الدخول...";

  showMessage(loginMessage, "جارٍ الاتصال بـ Firebase...");

  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    if (result.user.uid !== OWNER_UID) {
      await signOut(auth);

      showMessage(
        loginMessage,
        "هذا الحساب صحيح، لكنه ليس حساب المدير المحدد في الموقع.",
        "error"
      );
    }

  } catch (error) {
    console.error("Firebase Login Error:", error);

    showMessage(
      loginMessage,
      getAuthError(error),
      "error"
    );

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "دخول";
  }
});

// تسجيل الخروج
document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await signOut(auth);
    showMessage(loginMessage, "تم تسجيل الخروج.");
  } catch (error) {
    console.error(error);
    showMessage(adminMessage, "تعذر تسجيل الخروج.", "error");
  }
});

// إضافة أو تعديل مشروع
projectForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isOwner()) {
    showMessage(adminMessage, "ليس لديك صلاحية تنفيذ العملية.", "error");
    return;
  }

  const projectId = document.getElementById("projectId").value;

  const imageUrl = document.getElementById("imageUrl").value.trim();
  const liveUrl = document.getElementById("liveUrl").value.trim();
  const githubUrl = document.getElementById("githubUrl").value.trim();

  if (imageUrl && !safeURL(imageUrl)) {
    showMessage(adminMessage, "رابط الصورة غير صحيح.", "error");
    return;
  }

  if (liveUrl && !safeURL(liveUrl)) {
    showMessage(adminMessage, "رابط الموقع غير صحيح.", "error");
    return;
  }

  if (githubUrl && !safeURL(githubUrl)) {
    showMessage(adminMessage, "رابط GitHub غير صحيح.", "error");
    return;
  }

  const project = {
    titleAr: document.getElementById("titleAr").value.trim(),
    titleEn: document.getElementById("titleEn").value.trim(),
    descriptionAr: document.getElementById("descriptionAr").value.trim(),
    descriptionEn: document.getElementById("descriptionEn").value.trim(),
    imageUrl,
    liveUrl,
    githubUrl,
    order: Number(document.getElementById("order").value) || 0,
    featured: document.getElementById("featured").checked,
    updatedAt: serverTimestamp()
  };

  if (!project.titleAr) {
    showMessage(adminMessage, "اسم المشروع بالعربي مطلوب.", "error");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "جارٍ الحفظ...";

  try {
    if (projectId) {
      await updateDoc(doc(db, "projects", projectId), project);

      showMessage(adminMessage, "تم تعديل المشروع بنجاح.", "success");
    } else {
      project.createdAt = serverTimestamp();

      await addDoc(collection(db, "projects"), project);

      showMessage(adminMessage, "تمت إضافة المشروع بنجاح.", "success");
    }

    resetForm();
    await loadAdminProjects();

  } catch (error) {
    console.error("Save Project Error:", error);

    showMessage(
      adminMessage,
      error.code === "permission-denied"
        ? "ليس لديك صلاحية الكتابة. راجع قواعد Firestore وUID المدير."
        : `تعذر حفظ المشروع: ${error.code || error.message}`,
      "error"
    );

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = projectId ? "حفظ التعديلات" : "حفظ المشروع";
  }
});

// تحميل المشاريع في لوحة الإدارة
async function loadAdminProjects() {
  if (!isOwner()) return;

  adminProjects.textContent = "جارٍ تحميل المشاريع...";

  try {
    const projectsQuery = query(
      collection(db, "projects"),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(projectsQuery);

    adminProjects.innerHTML = "";

    if (snapshot.empty) {
      adminProjects.textContent = "لا توجد مشاريع حتى الآن.";
      return;
    }

    snapshot.forEach(projectDoc => {
      const project = projectDoc.data();

      const card = document.createElement("article");
      card.className = "admin-project";

      card.innerHTML = `
        <h4>${escapeHTML(project.titleAr || "مشروع بدون اسم")}</h4>
        <p>${escapeHTML(project.descriptionAr || "")}</p>
        <p>${project.featured ? "منشور على الموقع" : "غير منشور"}</p>
        <button type="button" class="edit-button">تعديل</button>
        <button type="button" class="delete-button">حذف</button>
      `;

      card.querySelector(".edit-button").addEventListener("click", () => {
        fillForm(projectDoc.id, project);
      });

      card.querySelector(".delete-button").addEventListener("click", async () => {
        if (!confirm("هل أنت متأكد من حذف هذا المشروع نهائيًا؟")) return;

        if (!isOwner()) {
          showMessage(adminMessage, "ليس لديك صلاحية الحذف.", "error");
          return;
        }

        try {
          await deleteDoc(doc(db, "projects", projectDoc.id));

          showMessage(adminMessage, "تم حذف المشروع بنجاح.", "success");

          await loadAdminProjects();

        } catch (error) {
          console.error("Delete Project Error:", error);

          showMessage(
            adminMessage,
            `تعذر حذف المشروع: ${error.code || error.message}`,
            "error"
          );
        }
      });

      adminProjects.appendChild(card);
    });

  } catch (error) {
    console.error("Load Admin Projects Error:", error);

    adminProjects.textContent =
      `تعذر تحميل المشاريع: ${error.code || error.message}`;
  }
}

// وضع بيانات المشروع في النموذج للتعديل
function fillForm(id, project) {
  if (!isOwner()) return;

  document.getElementById("projectId").value = id;

  const fields = [
    "titleAr",
    "titleEn",
    "descriptionAr",
    "descriptionEn",
    "imageUrl",
    "liveUrl",
    "githubUrl",
    "order"
  ];

  fields.forEach(field => {
    document.getElementById(field).value = project[field] ?? "";
  });

  document.getElementById("featured").checked = !!project.featured;

  document.getElementById("formTitle").textContent = "تعديل المشروع";
  document.getElementById("saveButton").textContent = "حفظ التعديلات";
  document.getElementById("cancelEditButton").hidden = false;

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// إعادة النموذج لوضع الإضافة
function resetForm() {
  projectForm.reset();

  document.getElementById("projectId").value = "";
  document.getElementById("order").value = 1;
  document.getElementById("featured").checked = true;

  document.getElementById("formTitle").textContent = "إضافة مشروع جديد";
  document.getElementById("saveButton").textContent = "حفظ المشروع";
  document.getElementById("cancelEditButton").hidden = true;
}

// إلغاء التعديل
document.getElementById("cancelEditButton").addEventListener("click", resetForm);
