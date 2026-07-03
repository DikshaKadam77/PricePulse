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
    setDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const username = document.getElementById("username");
const avatar = document.getElementById("avatar");

const income = document.getElementById("income");
const expense = document.getElementById("expense");
const balance = document.getElementById("balance");

const transactionList = document.getElementById("transactionList");
const logoutBtn = document.getElementById("logoutBtn");

const editBudgetBtn = document.getElementById("editBudgetBtn");
const budgetModal = document.getElementById("budgetModal");
const closeBudgetModal = document.getElementById("closeBudgetModal");
const cancelBudgetBtn = document.getElementById("cancelBudgetBtn");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const monthlyBudgetInput = document.getElementById("monthlyBudgetInput");

let currentUid = null;
let currentProfile = {};
let expenseChartInstance = null;

logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

function updateProfileUI({ firstName, lastName, email, monthlyBudget }) {
    if (email && email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
    }
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    profileName.textContent = fullName;
    profileEmail.textContent = email;
    profileEmail.title = email;
    username.textContent = fullName;
    avatar.textContent = firstName.charAt(0).toUpperCase();
    income.textContent = "₹" + monthlyBudget.toLocaleString();
}

function getAuthFallbackProfile(user) {
    const fallbackName = user.displayName || user.email?.split("@")[0] || "User";
    let firstName = fallbackName;
    let lastName = "";
    let monthlyBudget = 0;
    if (user.email && user.email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
        monthlyBudget = 3000;
    }

    return {
        firstName,
        lastName,
        email: user.email || "",
        monthlyBudget
    };
}

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "index.html";
        return;
    }

    currentUid = user.uid;

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            let monthlyBudget = Number(data.monthlyBudget);

            let firstName = data.firstName || "User";
            let lastName = data.lastName || "";
            let email = data.email || user.email || "";

            if (email.toLowerCase().includes("dikshakadam77199")) {
                firstName = "Diksha";
                lastName = "Kadam";
                if (!monthlyBudget || isNaN(monthlyBudget)) {
                    monthlyBudget = 3000;
                }
            } else {
                if (isNaN(monthlyBudget)) {
                    monthlyBudget = 0;
                }
            }

            currentProfile = {
                firstName,
                lastName,
                email,
                monthlyBudget
            };

            updateProfileUI(currentProfile);

            loadTransactions(currentUid, monthlyBudget);
            return;
        }
    } catch (error) {
        console.error("Failed to load user profile:", error);
    }

    currentProfile = getAuthFallbackProfile(user);
    updateProfileUI(currentProfile);
    loadTransactions(currentUid, currentProfile.monthlyBudget);
});

// Modal Logic
function openModal() {
    if (budgetModal && monthlyBudgetInput) {
        monthlyBudgetInput.value = currentProfile.monthlyBudget || 0;
        budgetModal.style.display = "flex";
        setTimeout(() => {
            budgetModal.classList.add("show");
        }, 10);
    }
}

function closeModal() {
    if (budgetModal) {
        budgetModal.classList.remove("show");
        setTimeout(() => {
            budgetModal.style.display = "none";
        }, 300);
    }
}

if (editBudgetBtn) {
    editBudgetBtn.addEventListener("click", openModal);
}
if (closeBudgetModal) {
    closeBudgetModal.addEventListener("click", closeModal);
}
if (cancelBudgetBtn) {
    cancelBudgetBtn.addEventListener("click", closeModal);
}

window.addEventListener("click", (e) => {
    if (e.target === budgetModal) {
        closeModal();
    }
});

if (saveBudgetBtn) {
    saveBudgetBtn.addEventListener("click", async () => {
        if (!currentUid) {
            alert("User not authenticated.");
            return;
        }

        const newBudgetVal = monthlyBudgetInput.value.trim();
        if (newBudgetVal === "") {
            alert("Please enter a budget amount.");
            return;
        }

        const newBudget = Number(newBudgetVal);
        if (isNaN(newBudget) || newBudget < 0) {
            alert("Please enter a valid positive number for your budget.");
            return;
        }

        try {
            saveBudgetBtn.disabled = true;
            saveBudgetBtn.textContent = "Saving...";

            const docRef = doc(db, "users", currentUid);
            await setDoc(docRef, { monthlyBudget: newBudget }, { merge: true });

            currentProfile.monthlyBudget = newBudget;
            updateProfileUI(currentProfile);
            await loadTransactions(currentUid, newBudget);

            closeModal();
        } catch (error) {
            console.error("Failed to update budget:", error);
            alert("Error updating budget: " + error.message);
        } finally {
            saveBudgetBtn.disabled = false;
            saveBudgetBtn.textContent = "Save Changes";
        }
    });
}




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

async function loadTransactions(uid, monthlyBudget) {
    try {
        const snapshot = await getDocs(
            collection(db, "users", uid, "transactions")
        );

        let totalExpense = 0;
        let totalIncome = monthlyBudget;
        transactionList.innerHTML = "";

        if (snapshot.empty) {
            transactionList.innerHTML = `
            <div class="empty">
                <i class="fa-solid fa-wallet"></i>
                <h4>No Transactions</h4>
                <p>Add your first expense to start tracking.</p>
            </div>
            `;
            income.textContent = "₹" + totalIncome.toLocaleString();
            expense.textContent = "₹0";
            balance.textContent = "₹" + totalIncome.toLocaleString();
            renderExpenseChart({});
            return;
        }

        const expensesByCategory = {};
        const transactions = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            data.id = doc.id;
            transactions.push(data);
        });

        // Sort by date descending
        transactions.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });

        // Calculate totals and group categories from all transactions
        transactions.forEach((data) => {
            const amt = Number(data.amount) || 0;
            const isIncome = String(data.category).toLowerCase().includes("income") || String(data.category).toLowerCase().includes("salary");

            if (isIncome) {
                totalIncome += amt;
            } else {
                totalExpense += amt;
                const cat = data.category || "Other";
                expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
            }
        });

        // Render at most 4 recent transactions
        const recentTransactions = transactions.slice(0, 4);
        recentTransactions.forEach((data) => {
            const amt = Number(data.amount) || 0;
            const isIncome = String(data.category).toLowerCase().includes("income") || String(data.category).toLowerCase().includes("salary");
            const details = getCategoryDetails(data.category);
            
            // Generate fallback dynamic date if missing from database record
            const dateStr = data.date ? data.date : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            transactionList.innerHTML += `
            <div class="transaction-item">
                <div class="transaction-left">
                    <div class="transaction-icon-box" style="background-color: ${details.bg}; color: ${details.color};">
                        <i class="${details.icon}"></i>
                    </div>
                    <div class="transaction-info">
                        <h4>${data.title}</h4>
                        <small>${data.category}</small>
                    </div>
                </div>
                <div class="transaction-right">
                    <h4 class="${isIncome ? 'amount-income' : 'amount-expense'}">
                        ${isIncome ? '+' : '–'}₹${amt.toLocaleString()}
                    </h4>
                    <small class="transaction-date">${dateStr}</small>
                </div>
            </div>
            `;
        });

        income.textContent = "₹" + totalIncome.toLocaleString();
        expense.textContent = "₹" + totalExpense.toLocaleString();
        balance.textContent = "₹" + (totalIncome - totalExpense).toLocaleString();
        renderExpenseChart(expensesByCategory);
    } catch (error) {
        console.error("Failed to load transactions:", error);
    }
}

function renderExpenseChart(data) {
    const canvas = document.getElementById("expenseChart");
    const emptyChartEl = document.getElementById("emptyChart");

    if (!canvas || !emptyChartEl) return;

    const categories = Object.keys(data);
    const amounts = Object.values(data);
    const total = amounts.reduce((sum, val) => sum + val, 0);

    if (total === 0) {
        canvas.style.display = "none";
        emptyChartEl.style.display = "block";
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
            expenseChartInstance = null;
        }
        return;
    }

    canvas.style.display = "block";
    emptyChartEl.style.display = "none";

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    const colors = {
        'food': '#12B1D1',          // Cyan Blue
        'entertainment': '#85a7ff', // Periwinkle Blue
        'shopping': '#5f29c7',      // Deep Purple-Blue
        'travel': '#1089d3',        // Theme Blue
        'transport': '#1089d3',     // Theme Blue
        'health': '#0ed2da',        // Vibrant Cyan
        'bills': '#854dff',         // Royal Purple-Blue
        'other': '#b392ff'          // Soft Lavender Blue
    };

    const backgroundColors = categories.map(cat => {
        const key = cat.toLowerCase();
        for (const [name, color] of Object.entries(colors)) {
            if (key.includes(name)) return color;
        }
        return '#5f29c7';
    });

    expenseChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                borderRadius: 6,
                spacing: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            family: 'Poppins',
                            size: 11
                         },
                         color: '#1E1E2F',
                         usePointStyle: true,
                         padding: 15
                     }
                 },
                 tooltip: {
                     callbacks: {
                         label: function(context) {
                             const value = context.raw || 0;
                             const percentage = ((value / total) * 100).toFixed(1);
                             return ` ₹${value.toLocaleString()} (${percentage}%)`;
                         }
                     }
                 }
             },
             cutout: '65%'
         }
     });
}

