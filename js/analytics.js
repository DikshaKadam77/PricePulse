import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// DOM Elements
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const avatar = document.getElementById("avatar");
const logoutBtn = document.getElementById("logoutBtn");

const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");
const loadingOverlay = document.getElementById("loadingOverlay");

const incomeEl = document.getElementById("income");
const expenseEl = document.getElementById("expense");
const balanceEl = document.getElementById("balance");

const usagePercentage = document.getElementById("usagePercentage");
const usageProgressBar = document.getElementById("usageProgressBar");
const usageFooterText = document.getElementById("usageFooterText");

const topExpenseList = document.getElementById("topExpenseList");

// Global states
let currentUid = null;
let profileBudget = 0;
let allTransactions = [];

// Chart instances
let categoryChartInstance = null;
let dailyChartInstance = null;
let historyChartInstance = null;

// Logout handler
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });
}

// Category design mapping
function getCategoryDetails(category) {
    const cat = String(category).toLowerCase().trim();
    if (cat.includes("food")) {
        return { icon: "fa-solid fa-utensils", bg: "#E2F6EA", color: "#36C98D" };
    } else if (cat.includes("shopping")) {
        return { icon: "fa-solid fa-bag-shopping", bg: "#F3E5F5", color: "#9C27B0" };
    } else if (cat.includes("travel")) {
        return { icon: "fa-solid fa-route", bg: "#FFF4E5", color: "#FF9F43" };
    } else if (cat.includes("entertainment")) {
        return { icon: "fa-solid fa-film", bg: "#FFEAEA", color: "#FF6B6B" };
    } else if (cat.includes("education")) {
        return { icon: "fa-solid fa-graduation-cap", bg: "#E8F0FE", color: "#4F7CFF" };
    } else if (cat.includes("health")) {
        return { icon: "fa-solid fa-heart-pulse", bg: "#E0F7FA", color: "#00BCD4" };
    } else if (cat.includes("bills") || cat.includes("bill")) {
        return { icon: "fa-solid fa-receipt", bg: "#F0F0F0", color: "#607D8B" };
    } else {
        return { icon: "fa-solid fa-ellipsis", bg: "#EAEBFF", color: "#7A82FF" };
    }
}

// Profile UI Loading
function updateProfileUI({ firstName, lastName, email, monthlyBudget }) {
    if (email && email.toLowerCase().includes("dikshakadam77199")) {
        firstName = "Diksha";
        lastName = "Kadam";
    }
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    if (profileName) profileName.textContent = fullName;
    if (profileEmail) {
        profileEmail.textContent = email;
        profileEmail.title = email;
    }
    if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
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

// Firebase Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }

    currentUid = user.uid;

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        let userProfile = {};
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

            profileBudget = monthlyBudget;
            userProfile = { firstName, lastName, email, monthlyBudget };
        } else {
            userProfile = getAuthFallbackProfile(user);
            profileBudget = userProfile.monthlyBudget;
        }

        updateProfileUI(userProfile);
        await initAnalytics();
    } catch (error) {
        console.error("Failed to initialize user analytics:", error);
        if (loadingOverlay) loadingOverlay.style.display = "none";
    }
});

// Load & Process Data
async function initAnalytics() {
    try {
        const snapshot = await getDocs(
            collection(db, "users", currentUid, "transactions")
        );

        allTransactions = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allTransactions.push(data);
        });

        // Initialize selectors
        populateSelectors();
        
        // Listeners for month/year changes
        monthSelect.addEventListener("change", updateMonthlyData);
        yearSelect.addEventListener("change", updateMonthlyData);

        // First render
        updateMonthlyData();
    } catch (error) {
        console.error("Error loading transactions for analytics:", error);
    } finally {
        if (loadingOverlay) {
            loadingOverlay.style.opacity = "0";
            setTimeout(() => {
                loadingOverlay.style.display = "none";
            }, 300);
        }
    }
}

function populateSelectors() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Months dropdown
    monthSelect.value = currentMonth;

    // Years set
    const years = new Set();
    years.add(currentYear); // default current year

    allTransactions.forEach(t => {
        if (t.date) {
            const y = Number(t.date.split('-')[0]);
            if (y && !isNaN(y)) {
                years.add(y);
            }
        }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    yearSelect.innerHTML = "";
    sortedYears.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
    });

    // Default select current year if available
    yearSelect.value = currentYear;
}

function updateMonthlyData() {
    const selectedMonth = Number(monthSelect.value); // 0 to 11
    const selectedYear = Number(yearSelect.value);

    let totalIncome = profileBudget;
    let totalExpense = 0;
    const categoryMap = {};
    const dailyMap = {};

    // Get number of days in selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        dailyMap[d] = 0;
    }

    const monthlyExpenses = [];

    // Filter and compute
    allTransactions.forEach(t => {
        if (!t.date) return;

        const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
        
        if (tYear === selectedYear && (tMonth - 1) === selectedMonth) {
            const amt = Number(t.amount) || 0;
            const isIncome = String(t.category).toLowerCase().includes("income") || String(t.category).toLowerCase().includes("salary");
            const isBudgetAdjustment = String(t.title).toLowerCase().includes("budget increase") || String(t.title).toLowerCase().includes("budget decrease");

            if (!isBudgetAdjustment) {
                if (isIncome) {
                    totalIncome += amt;
                } else {
                    totalExpense += amt;
                    const cat = t.category || "Other";
                    categoryMap[cat] = (categoryMap[cat] || 0) + amt;
                    
                    if (tDay >= 1 && tDay <= daysInMonth) {
                        dailyMap[tDay] = (dailyMap[tDay] || 0) + amt;
                    }
                    monthlyExpenses.push(t);
                }
            }
        }
    });

    // Render Metrics
    incomeEl.textContent = "₹" + totalIncome.toLocaleString();
    expenseEl.textContent = "₹" + totalExpense.toLocaleString();
    
    const balance = totalIncome - totalExpense;
    balanceEl.textContent = "₹" + balance.toLocaleString();

    // Budget Progress Status
    const spentPercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;
    usagePercentage.textContent = `${spentPercent}% Spent`;
    
    usageProgressBar.className = "progress-bar";
    if (spentPercent < 75) {
        usageProgressBar.classList.add("progress-safe");
    } else if (spentPercent < 90) {
        usageProgressBar.classList.add("progress-warning");
    } else {
        usageProgressBar.classList.add("progress-danger");
    }
    usageProgressBar.style.width = `${Math.min(spentPercent, 100)}%`;

    const remaining = totalIncome - totalExpense;
    if (remaining >= 0) {
        usageFooterText.textContent = `You have ₹${remaining.toLocaleString()} remaining of your ₹${totalIncome.toLocaleString()} monthly budget.`;
    } else {
        usageFooterText.textContent = `You have exceeded your monthly budget by ₹${Math.abs(remaining).toLocaleString()}! (Total budget: ₹${totalIncome.toLocaleString()})`;
    }

    // Render Visual Charts & Lists
    renderCategoryChart(categoryMap, totalExpense);
    renderDailyChart(dailyMap, totalExpense, selectedMonth, selectedYear);
    renderHistoryChart(selectedMonth, selectedYear);
    renderTopExpenses(monthlyExpenses);
}

// 1. Category Chart Rendering
function renderCategoryChart(categoryMap, totalExpense) {
    const canvas = document.getElementById("categoryChart");
    const emptyEl = document.getElementById("categoryEmpty");

    if (!canvas || !emptyEl) return;

    if (totalExpense === 0) {
        canvas.style.display = "none";
        emptyEl.style.display = "block";
        if (categoryChartInstance) {
            categoryChartInstance.destroy();
            categoryChartInstance = null;
        }
        return;
    }

    canvas.style.display = "block";
    emptyEl.style.display = "none";

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const categories = Object.keys(categoryMap);
    const amounts = Object.values(categoryMap);

    const colors = {
        'food': '#12B1D1',
        'entertainment': '#85a7ff',
        'shopping': '#5f29c7',
        'travel': '#1089d3',
        'transport': '#1089d3',
        'health': '#0ed2da',
        'bills': '#854dff',
        'other': '#b392ff'
    };

    const backgroundColors = categories.map(cat => {
        const key = cat.toLowerCase();
        for (const [name, color] of Object.entries(colors)) {
            if (key.includes(name)) return color;
        }
        return '#5f29c7';
    });

    categoryChartInstance = new Chart(canvas, {
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
                        font: { family: 'Poppins', size: 11 },
                        color: '#1E1E2F',
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw || 0;
                            const percentage = ((value / totalExpense) * 100).toFixed(1);
                            return ` ₹${value.toLocaleString()} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });
}

// 2. Daily Line Chart Rendering
function renderDailyChart(dailyMap, totalExpense, selectedMonth, selectedYear) {
    const canvas = document.getElementById("dailyChart");
    const emptyEl = document.getElementById("dailyEmpty");

    if (!canvas || !emptyEl) return;

    if (totalExpense === 0) {
        canvas.style.display = "none";
        emptyEl.style.display = "block";
        if (dailyChartInstance) {
            dailyChartInstance.destroy();
            dailyChartInstance = null;
        }
        return;
    }

    canvas.style.display = "block";
    emptyEl.style.display = "none";

    if (dailyChartInstance) {
        dailyChartInstance.destroy();
    }

    const days = Object.keys(dailyMap);
    const amounts = Object.values(dailyMap);

    dailyChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: days.map(d => `Day ${d}`),
            datasets: [{
                label: 'Daily Expense',
                data: amounts,
                borderColor: '#12B1D1',
                backgroundColor: 'rgba(18, 177, 209, 0.1)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#12B1D1',
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Spend: ₹${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Poppins', size: 9 },
                        color: '#8A8FA3',
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: { color: '#F4F7FB' },
                    ticks: {
                        font: { family: 'Poppins', size: 9 },
                        color: '#8A8FA3',
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 3. Historical Month-over-Month Bar Chart
function renderHistoryChart(selectedMonth, selectedYear) {
    const canvas = document.getElementById("historyChart");
    if (!canvas) return;

    if (historyChartInstance) {
        historyChartInstance.destroy();
    }

    const labels = [];
    const budgetData = [];
    const expenseData = [];

    // Calculate last 6 months ending in the selected month
    for (let i = 5; i >= 0; i--) {
        const dateObj = new Date(selectedYear, selectedMonth - i, 1);
        const mYear = dateObj.getFullYear();
        const mMonth = dateObj.getMonth();

        const monthLabel = dateObj.toLocaleString('default', { month: 'short' }) + ' ' + mYear;
        labels.push(monthLabel);

        let mIncome = profileBudget;
        let mExpense = 0;

        allTransactions.forEach(t => {
            if (!t.date) return;
            const [tYear, tMonth] = t.date.split('-').map(Number);
            
            if (tYear === mYear && (tMonth - 1) === mMonth) {
                const amt = Number(t.amount) || 0;
                const isIncome = String(t.category).toLowerCase().includes("income") || String(t.category).toLowerCase().includes("salary");
                const isBudgetAdjustment = String(t.title).toLowerCase().includes("budget increase") || String(t.title).toLowerCase().includes("budget decrease");

                if (!isBudgetAdjustment) {
                    if (isIncome) {
                        mIncome += amt;
                    } else {
                        mExpense += amt;
                    }
                }
            }
        });

        budgetData.push(mIncome);
        expenseData.push(mExpense);
    }

    historyChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Budget/Income',
                    data: budgetData,
                    backgroundColor: '#36C98D',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#FF6B6B',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: 'Poppins', size: 10 },
                        usePointStyle: true,
                        padding: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ₹${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Poppins', size: 9 },
                        color: '#8A8FA3'
                    }
                },
                y: {
                    grid: { color: '#F4F7FB' },
                    ticks: {
                        font: { family: 'Poppins', size: 9 },
                        color: '#8A8FA3',
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

// 4. Render Top Expenses
function renderTopExpenses(monthlyExpenses) {
    if (!topExpenseList) return;

    // Filter to only expenses (though monthlyExpenses is already filtered)
    const expensesOnly = monthlyExpenses.filter(t => {
        const isIncome = String(t.category).toLowerCase().includes("income") || String(t.category).toLowerCase().includes("salary");
        return !isIncome;
    });

    // Sort descending by amount
    expensesOnly.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

    // Get top 5
    const top5 = expensesOnly.slice(0, 5);

    topExpenseList.innerHTML = "";

    if (top5.length === 0) {
        topExpenseList.innerHTML = `<div class="chart-empty">No expenses recorded for this month.</div>`;
        return;
    }

    top5.forEach(t => {
        const amt = Number(t.amount) || 0;
        const details = getCategoryDetails(t.category);
        
        // Pretty date format e.g., "July 3" or standard fallback
        let dateStr = t.date;
        try {
            const [y, m, d] = t.date.split('-').map(Number);
            const dateObj = new Date(y, m - 1, d);
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) {
            // fallback to original date string
        }

        topExpenseList.innerHTML += `
        <div class="top-expense-item">
            <div class="expense-left">
                <div class="expense-icon-box" style="background-color: ${details.bg}; color: ${details.color};">
                    <i class="${details.icon}"></i>
                </div>
                <div class="expense-info">
                    <h4>${t.title}</h4>
                    <small>${t.category}</small>
                </div>
            </div>
            <div class="expense-right">
                <h4>₹${amt.toLocaleString()}</h4>
                <small>${dateStr}</small>
            </div>
        </div>
        `;
    });
}
