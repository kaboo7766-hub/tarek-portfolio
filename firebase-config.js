import{initializeApp}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import{getAuth}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import{getFirestore}from"https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const config={
  apiKey:"AIzaSyCOEGFTA36rt6PpB_EoLKLd5yLGYBfpGPI",
  authDomain:"tarek-portfolio-fa40d.firebaseapp.com",
  projectId:"tarek-portfolio-fa40d",
  messagingSenderId:"887872733288",
  appId:"1:887872733288:web:1dd38d2b37a0f4fead7bdd",
  measurementId:"G-GYRB5VVP00"
};
const app=initializeApp(config);
export const auth=getAuth(app);
export const db=getFirestore(app);
export const ADMIN_EMAIL="kaboo7766@gmail.com";
