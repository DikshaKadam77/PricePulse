import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const username = document.getElementById("username");
const avatar = document.getElementById("avatar");

const transactionsList = document.getElementById("transactionsList");
const searchBar = document.getElementById("searchBar");
const categorySelect = document.getElementById("categorySelect");
const logoutBtn = document.getElementById("logoutBtn");

let currentUid = null;
let allTransactions = [];

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

function updateProfileUI({ firstName, lastName, email }) {
    if (email && email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
    }
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    profileName.textContent = fullName;
    profileEmail.textContent = email;
    profileEmail.title = email;
    avatar.textContent = firstName.charAt(0).toUpperCase();
}

function getAuthFallbackProfile(user) {
    const fallbackName = user.displayName || user.email?.split("@")[0] || "User";
    let firstName = fallbackName;
    let lastName = "";
    if (user.email && user.email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
    }

    return {
        firstName,
        lastName,
        email: user.email || ""
    };
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    currentUid = user.uid;

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            let firstName = data.firstName || "User";
            let lastName = data.lastName || "";
            let email = data.email || user.email || "";

            if (email.toLowerCase().includes("dikshakadam77199")) {
                firstName = "Diksha";
                lastName = "Kadam";
            }

            updateProfileUI({ firstName, lastName, email });
            loadTransactions(user.uid);
            return;
        }
    } catch (error) {
        console.error("Failed to load user profile:", error);
    }

    const fallbackProfile = getAuthFallbackProfile(user);
    updateProfileUI(fallbackProfile);
    loadTransactions(user.uid);
});

function getCategoryDetails(category) {
    const cat = String(category).toLowerCase().trim();
    
    // 1. Food
    if (cat.includes("food")) {
        return { icon: "fa-solid fa-utensils", bg: "#E2F6EA", color: "#36C98D" };
    } 
    // 2. Shopping 
    else if (cat.includes("shopping")) {
        return { icon: "fa-solid fa-bag-shopping", bg: "#F3E5F5", color: "#9C27B0" };
    } 
    // 3. Travel 
    else if (cat.includes("travel")) {
        return { icon: "fa-solid fa-route", bg: "#FFF4E5", color: "#FF9F43" };
    } 
    // 4. Entertainment 
    else if (cat.includes("entertainment")) {
        return { icon: "fa-solid fa-film", bg: "#FFEAEA", color: "#FF6B6B" };
    } 
    // 5. Education
    else if (cat.includes("education")) {
        return { icon: "fa-solid fa-graduation-cap", bg: "#E8F0FE", color: "#4F7CFF" };
    } 
    // 6. Health 
    else if (cat.includes("health")) {
        return { icon: "fa-solid fa-heart-pulse", bg: "#E0F7FA", color: "#00BCD4" };
    } 
    // 7. Bills 
    else if (cat.includes("bills") || cat.includes("bill")) {
        return { icon: "fa-solid fa-receipt", bg: "#F0F0F0", color: "#607D8B" };
    } 
    // 8. Other / Default Fallback 
    else {
        return { icon: "fa-solid fa-ellipsis", bg: "#EAEBFF", color: "#7A82FF" };
    }
}


async function loadTransactions(uid) {
    try {
        const snapshot = await getDocs(
            collection(db, "users", uid, "transactions")
        );

        allTransactions = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allTransactions.push(data);
        });

        // Sort by date descending
        allTransactions.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });

        renderFilteredTransactions();
    } catch (error) {
        console.error("Failed to load transactions:", error);
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation" style="color: #FF6B6B;"></i>
                <p>Failed to load transactions. Please try again.</p>
            </div>
        `;
    }
}

function renderFilteredTransactions() {
    const query = searchBar.value.toLowerCase().trim();
    const selectedCat = categorySelect.value.toLowerCase();

    const filtered = allTransactions.filter((t) => {
        const matchesSearch = String(t.title).toLowerCase().includes(query);
        
        let matchesCategory = false;
        if (selectedCat === "") {
            matchesCategory = true;
        } else if (selectedCat === "income") {
            matchesCategory = String(t.category).toLowerCase().includes("income") || String(t.category).toLowerCase().includes("salary");
        } else {
            matchesCategory = String(t.category).toLowerCase() === selectedCat;
        }

        return matchesSearch && matchesCategory;
    });

    transactionsList.innerHTML = "";

    if (filtered.length === 0) {
        transactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-receipt"></i>
                <p>No matching transactions found.</p>
            </div>
        `;
        return;
    }

    filtered.forEach((t) => {
        const amt = Number(t.amount) || 0;
        const isIncome = String(t.category).toLowerCase().includes("income") || String(t.category).toLowerCase().includes("salary");
        const details = getCategoryDetails(t.category);
        const dateStr = t.date ? t.date : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        transactionsList.innerHTML += `
        <div class="transaction-row">
            <div class="transaction-left">
                <div class="transaction-icon-box" style="background-color: ${details.bg}; color: ${details.color}; margin-right: 16px;">
                    <i class="${details.icon}"></i>
                </div>
                <div class="transaction-info">
                    <h4>${t.title}</h4>
                    <small>${t.category}</small>
                </div>
            </div>
            
            <div class="transaction-right-controls">
                <div class="transaction-amount-box">
                    <h4 class="${isIncome ? 'amount-income' : 'amount-expense'}">
                        ${isIncome ? '+' : '–'}₹${amt.toLocaleString()}
                    </h4>
                    <small class="transaction-date">${dateStr}</small>
                </div>
                
                <button type="button" class="delete-btn" data-id="${t.id}" title="Delete Transaction">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
        `;
    });

    // Wire up delete buttons
    const deleteButtons = transactionsList.querySelectorAll(".delete-btn");
    deleteButtons.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            const id = btn.getAttribute("data-id");
            if (confirm("Are you sure you want to delete this transaction?")) {
                try {
                    btn.disabled = true;
                    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
                    
                    await deleteDoc(doc(db, "users", currentUid, "transactions", id));
                    alert("Transaction deleted successfully!");
                    loadTransactions(currentUid);
                } catch (error) {
                    console.error("Failed to delete transaction:", error);
                    alert("Failed to delete transaction: " + error.message);
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid fa-trash-can"></i>`;
                }
            }
        });
    });
}

searchBar.addEventListener("input", renderFilteredTransactions);
categorySelect.addEventListener("change", renderFilteredTransactions);
