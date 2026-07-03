import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAOeKJS0EzP7qzGCxqZCmMtmyHIShNAJuU",
  authDomain: "pricepulse-e9e1f.firebaseapp.com",
  projectId: "pricepulse-e9e1f",
  storageBucket: "pricepulse-e9e1f.firebasestorage.app",
  messagingSenderId: "155875418086",
  appId: "1:155875418086:web:9a216e7c9ca7b07ddfc027"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);