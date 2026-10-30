import { db } from "./firebase-config.js";
import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const container = document.getElementById("projectsContainer");
let currentLanguage = "ar";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
}
function safeURL(value) {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; }
  catch { return ""; }
}

async function loadProjects() {
  container.textContent = currentLanguage === "en" ? "Loading projects..." : "جاري تحميل المشاريع...";
  try {
    const projectsQuery = query(collection(db, "projects"), where("featured", "==", true), orderBy("order", "asc"));
    const snapshot = await getDocs(projectsQuery);
    if (snapshot.empty) {
      container.textContent = currentLanguage === "en" ? "No published projects yet." : "لا توجد مشاريع منشورة حاليًا.";
      return;
    }
    container.replaceChildren();
    snapshot.forEach(projectDoc => {
      const project = projectDoc.data();
      const title = currentLanguage === "en" ? (project.titleEn || project.titleAr) : project.titleAr;
      const description = currentLanguage === "en" ? (project.descriptionEn || project.descriptionAr) : project.descriptionAr;
      const image = safeURL(project.imageUrl), live = safeURL(project.liveUrl), github = safeURL(project.githubUrl);
      const card = document.createElement("article");
      card.className = "project-card";
      card.innerHTML = `${image ? `<img class="project-image" src="${escapeHTML(image)}" alt="${escapeHTML(title || "Project")}" loading="lazy">` : ""}<h3>${escapeHTML(title || "Project")}</h3><p>${escapeHTML(description || "")}</p><div class="project-links">${live ? `<a href="${escapeHTML(live)}" target="_blank" rel="noopener noreferrer">${currentLanguage === "en" ? "Visit project" : "زيارة المشروع"}</a>` : ""}${github ? `<a href="${escapeHTML(github)}" target="_blank" rel="noopener noreferrer">GitHub</a>` : ""}</div>`;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Projects loading error:", error);
    container.textContent = currentLanguage === "en" ? "Could not load projects. Check Firebase configuration and Firestore rules." : "تعذر تحميل المشاريع. تحقق من إعدادات Firebase وقواعد Firestore.";
  }
}

document.getElementById("currentYear").textContent = new Date().getFullYear();
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  document.getElementById("themeToggle").textContent = document.body.classList.contains("light") ? "🌙" : "☀️";
});
document.getElementById("languageToggle").addEventListener("click", () => {
  currentLanguage = currentLanguage === "ar" ? "en" : "ar";
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-ar][data-en]").forEach(element => { element.textContent = element.dataset[currentLanguage]; });
  document.getElementById("languageToggle").textContent = currentLanguage === "ar" ? "EN" : "عربي";
  loadProjects();
});
loadProjects();
