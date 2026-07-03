import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const LOADER_DURATION = 3500;

let currentUser = undefined;
let loaderFinished = false;

let isSigningUp = false;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  showPageAfterLoader();
});

function showPageAfterLoader() {
  if (!loaderFinished || currentUser === undefined || isSigningUp) return;

  if (currentUser) {
    window.location.href = "pages/dashboard.html";
    return;
  }

  const loaderPage = document.getElementById("loaderPage");
  const authPage = document.getElementById("authPage");

  if (loaderPage) loaderPage.style.display = "none";
  if (authPage) authPage.style.display = "flex";
}

window.addEventListener("load", () => {
  setTimeout(() => {
    loaderFinished = true;
    showPageAfterLoader();
  }, LOADER_DURATION);
});

// Auth pages

const signinForm = document.getElementById("signinForm");
const signupForm = document.getElementById("signupForm");

document
.getElementById("showSignup")
.addEventListener("click", (e) => {
    e.preventDefault();

    signinForm.style.display = "none";
    signupForm.style.display = "block";
});

document
.getElementById("showSignin")
.addEventListener("click", (e) => {
    e.preventDefault();

    signupForm.style.display = "none";
    signinForm.style.display = "block";
});

const signupBtn = document.getElementById("signupBtn");

signupBtn.addEventListener("click", async (e) => {

  e.preventDefault();
  isSigningUp = true;

  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const monthlyBudget = document.getElementById("monthlyBudget").value;

  try {

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {

      firstName,
      lastName,
      email,
      monthlyBudget: Number(monthlyBudget),
      createdAt: serverTimestamp()

    });


    alert("Account Created Successfully!");

    window.location.href = "pages/dashboard.html";

  }
  catch(error) {
    isSigningUp = false;

    console.error(error);
    alert(error.message);

  }

});



// Sign In

const signinBtn = document.getElementById("signinBtn");

signinBtn.addEventListener("click", async (e) => {
  e.preventDefault()

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    alert("Login Successful!");

    window.location.href = "pages/dashboard.html";
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
});

// Forgot Password
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    if (!email) {
      alert("Please enter your email address in the E-mail input field first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Forgot password failed:", error);
      alert(error.message);
    }
  });
}