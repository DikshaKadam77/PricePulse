import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    // signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const avatar = document.getElementById("avatar")

const expenseForm = document.getElementById("expenseForm");
const saveExpenseBtn = document.getElementById("saveExpenseBtn");

let currentUser = null;

onAuthStateChanged(auth, async(user) => {

    if(!user) {
        window.location.href = "../index.html";
        return;
    }

    currentUser = user;

    let firstName = "User";
    let lastName = "";
    let email = user.email || "";

    if (email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
    } else {
        const fallbackName = user.displayName || user.email?.split("@")[0] || "User";
        firstName = fallbackName;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if(userSnap.exists()) {
            const data = userSnap.data();
            firstName = data.firstName || firstName;
            lastName = data.lastName || lastName;
            email = data.email || email;

            if (email.toLowerCase().includes("dikshakadam77199")) {
                firstName = "Diksha";
                lastName = "Kadam";
            }
        }
    } catch(error) {
        console.log(error);
    }

    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    profileName.textContent = fullName;
    profileEmail.textContent = email;
    profileEmail.title = email;
    avatar.textContent = firstName.charAt(0).toUpperCase();
});


// to save expense

expenseForm.addEventListener("submit", async(e) => {

    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const category = document.getElementById("category").value;
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value.trim();

    if (!title || amount <= 0 || !category || !date) {
        alert("Please fill all the required fields");
        return;
    }

    // Date validation: prevent future dates
    const [year, month, day] = date.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate > today) {
        alert("You cannot add an expense for a future date.");
        return;
    }

    try {
        if (!currentUser) {
            alert("User not authenticated.");
            return;
        }

        saveExpenseBtn.disabled = true;
        saveExpenseBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

        // 1. Fetch user profile for monthly budget
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        let monthlyBudget = 0;

        if (userSnap.exists()) {
            const data = userSnap.data();
            monthlyBudget = Number(data.monthlyBudget) || 0;
            const email = data.email || currentUser.email || "";
            if (email.toLowerCase().includes("dikshakadam77199") && !monthlyBudget) {
                monthlyBudget = 3000;
            }
        }

        // 2. Fetch all transactions to calculate current balance
        const transactionsSnap = await getDocs(
            collection(db, "users", currentUser.uid, "transactions")
        );

        let totalExpense = 0;
        let totalIncome = monthlyBudget;

        transactionsSnap.forEach((doc) => {
            const data = doc.data();
            const amt = Number(data.amount) || 0;
            const isIncome = String(data.category).toLowerCase().includes("income") || String(data.category).toLowerCase().includes("salary");
            const isBudgetAdjustment = String(data.title).toLowerCase().includes("budget increase") || String(data.title).toLowerCase().includes("budget decrease");

            if (!isBudgetAdjustment) {
                if (isIncome) {
                    totalIncome += amt;
                } else {
                    totalExpense += amt;
                }
            }
        });

        const availableBalance = totalIncome - totalExpense;

        if (amount > availableBalance) {
            alert(`Insufficient balance! Your available balance is ₹${availableBalance.toLocaleString()}, but the expense amount is ₹${amount.toLocaleString()}.`);
            saveExpenseBtn.disabled = false;
            saveExpenseBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Expense`;
            return;
        }

        // 3. Write expense to Firestore
        await addDoc(
            collection(
                db,
                "users",
                currentUser.uid,
                "transactions"
            ),
            {
                title: title,
                amount: amount,
                category: category,
                date: date,
                notes: notes,
                createdAt: serverTimestamp()
            }
        );

        alert("Expense added successfully!");
        expenseForm.reset();
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error(error);
        alert(error.message);
        saveExpenseBtn.disabled = false;
        saveExpenseBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Expense`;
    }
});