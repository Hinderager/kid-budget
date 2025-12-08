// Family Budget App
// Data Management

const STORAGE_KEY = 'familyBudgetData';

// Supabase Configuration
const SUPABASE_URL = 'https://vxenhaapccmqhvdfkbja.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4ZW5oYWFwY2NtcWh2ZGZrYmphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4ODYyNjEsImV4cCI6MjA4MDQ2MjI2MX0.SSA7QiVgMkw1R9VDbQ7Qf8O-qsX1Cq1RBDGwzYs6wRo';
let syncInProgress = false;

// N8N Webhooks
const N8N_RECIPE_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/recipe-search';
const N8N_ORDER_URL = 'https://n8n.srv768302.hstgr.cloud/webhook/fred-meyer-order';
let currentRecipeMealId = null;
let currentRecipeMealName = null;
let currentRecipeIngredients = [];

// Default data structure
const defaultData = {
    users: {
        kylie: {
            balance: 0,
            allowance: 5,
            transactions: [],
            lastAllowanceWeek: null,
            savingsGoals: [],
            choreCompletions: {},
            bankPercent: 50,
            pendingBankTransfer: 0
        },
        parker: {
            balance: 0,
            allowance: 5,
            transactions: [],
            lastAllowanceWeek: null,
            savingsGoals: [],
            choreCompletions: {},
            bankPercent: 50,
            pendingBankTransfer: 0
        },
        mom: {
            choreCompletions: {}
        },
        dad: {
            choreCompletions: {}
        }
    },
    chores: [
        { id: 1, name: 'Make bed', assignedTo: ['kylie', 'parker'] },
        { id: 2, name: 'Clean room', assignedTo: ['kylie', 'parker'] },
        { id: 3, name: 'Take out trash', assignedTo: ['dad'] },
        { id: 4, name: 'Do dishes', assignedTo: ['mom', 'kylie', 'parker'] },
        { id: 5, name: 'Vacuum', assignedTo: ['mom'] },
        { id: 6, name: 'Clean main bathroom', assignedTo: [] },
        { id: 7, name: 'Clean parent bathroom', assignedTo: [] },
        { id: 8, name: 'Clean bedrooms', assignedTo: [] },
        { id: 9, name: 'Do laundry', assignedTo: [] }
    ],
    options: [
        { id: 1, name: 'Mow Lawn', value: 10.00 }
    ],
    meals: [],
    nextChoreId: 10,
    nextOptionId: 2,
    nextMealId: 1
};

// State
let appData = null;
let currentPerson = null;
let editingChoreId = null;
let currentSavingsGoalId = null;
let currentTransactionId = null;

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatCurrency(amount) {
    return '$' + Math.abs(amount).toFixed(2);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const options = {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    };

    if (!isCurrentYear) {
        options.year = 'numeric';
    }

    return date.toLocaleDateString('en-US', options);
}

function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo}`;
}

// Data Persistence
function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        appData = JSON.parse(stored);
        // Ensure all required fields exist (for backwards compatibility)
        if (!appData.nextChoreId) appData.nextChoreId = 10;
        if (!appData.options) appData.options = [{ id: 1, name: 'Mow Lawn', value: 10.00 }];
        if (!appData.nextOptionId) appData.nextOptionId = 2;
        if (!appData.meals) appData.meals = [];
        if (!appData.nextMealId) appData.nextMealId = 1;
        ['kylie', 'parker'].forEach(kid => {
            if (!appData.users[kid].lastAllowanceWeek) {
                appData.users[kid].lastAllowanceWeek = null;
            }
            if (!appData.users[kid].savingsGoals) {
                appData.users[kid].savingsGoals = [];
            }
            if (!appData.users[kid].choreCompletions) {
                appData.users[kid].choreCompletions = {};
            }
            if (appData.users[kid].bankPercent === undefined) {
                appData.users[kid].bankPercent = 50;
            }
            if (appData.users[kid].pendingBankTransfer === undefined) {
                appData.users[kid].pendingBankTransfer = 0;
            }
        });
        // Ensure parent users exist for chore completions
        ['mom', 'dad'].forEach(parent => {
            if (!appData.users[parent]) {
                appData.users[parent] = { choreCompletions: {} };
            }
            if (!appData.users[parent].choreCompletions) {
                appData.users[parent].choreCompletions = {};
            }
        });
    } else {
        appData = JSON.parse(JSON.stringify(defaultData));
    }
    return appData;
}

function ensureDataIntegrity() {
    // Ensure all required fields exist (for backwards compatibility)
    if (!appData.nextChoreId) appData.nextChoreId = 10;
    if (!appData.options) appData.options = [{ id: 1, name: 'Mow Lawn', value: 10.00 }];
    if (!appData.nextOptionId) appData.nextOptionId = 2;
    if (!appData.meals) appData.meals = [];
    if (!appData.nextMealId) appData.nextMealId = 1;
    ['kylie', 'parker'].forEach(kid => {
        if (!appData.users[kid].lastAllowanceWeek) {
            appData.users[kid].lastAllowanceWeek = null;
        }
        if (!appData.users[kid].savingsGoals) {
            appData.users[kid].savingsGoals = [];
        }
        if (!appData.users[kid].choreCompletions) {
            appData.users[kid].choreCompletions = {};
        }
        if (appData.users[kid].bankPercent === undefined) {
            appData.users[kid].bankPercent = 50;
        }
        if (appData.users[kid].pendingBankTransfer === undefined) {
            appData.users[kid].pendingBankTransfer = 0;
        }
    });
    // Ensure parent users exist for chore completions
    ['mom', 'dad'].forEach(parent => {
        if (!appData.users[parent]) {
            appData.users[parent] = { choreCompletions: {} };
        }
        if (!appData.users[parent].choreCompletions) {
            appData.users[parent].choreCompletions = {};
        }
    });
}

// Savings calculations
function getTotalSavings(kid) {
    const user = appData.users[kid];
    if (!user.savingsGoals) return 0;
    return user.savingsGoals.reduce((sum, goal) => sum + goal.savedAmount, 0);
}

function getAvailableBalance(kid) {
    const user = appData.users[kid];
    return user.balance - getTotalSavings(kid);
}

// Chore completion helpers
function getChoreCompletion(person, choreId) {
    const user = appData.users[person];
    if (!user || !user.choreCompletions) return null;
    return user.choreCompletions[choreId] || null;
}

function formatCompletionDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function toggleChoreCompletion(person, choreId) {
    const user = appData.users[person];
    if (!user) return;

    if (user.choreCompletions[choreId]) {
        // Already completed, remove completion
        delete user.choreCompletions[choreId];
    } else {
        // Mark as completed
        user.choreCompletions[choreId] = new Date().toISOString();
    }

    saveData();

    // Update the appropriate screen
    if (['kylie', 'parker'].includes(person)) {
        updateKidScreen();
    } else {
        updateParentScreen();
    }
}

function clearChoreCompletion(person, choreId) {
    const user = appData.users[person];
    if (!user || !user.choreCompletions) return;

    delete user.choreCompletions[choreId];
    saveData();

    // Update the appropriate screen
    if (['kylie', 'parker'].includes(person)) {
        updateKidScreen();
    } else {
        updateParentScreen();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    // Sync to cloud in background
    syncToCloud();
}

// Cloud Sync Functions
async function syncToCloud() {
    if (syncInProgress) return;
    syncInProgress = true;
    updateSyncStatus('syncing');

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/family_budget?id=eq.main`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const existing = await response.json();

        if (existing.length === 0) {
            // Insert new record
            await fetch(`${SUPABASE_URL}/rest/v1/family_budget`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    id: 'main',
                    data: appData,
                    updated_at: new Date().toISOString()
                })
            });
        } else {
            // Update existing record
            await fetch(`${SUPABASE_URL}/rest/v1/family_budget?id=eq.main`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    data: appData,
                    updated_at: new Date().toISOString()
                })
            });
        }

        updateSyncStatus('synced');
    } catch (error) {
        console.error('Cloud sync error:', error);
        updateSyncStatus('error');
    }

    syncInProgress = false;
}

async function loadFromCloud() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/family_budget?id=eq.main`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.length > 0 && data[0].data) {
            return data[0].data;
        }
    } catch (error) {
        console.error('Cloud load error:', error);
    }

    return null;
}

function updateSyncStatus(status) {
    const indicator = document.getElementById('sync-status');
    if (!indicator) return;

    indicator.className = 'sync-status ' + status;

    switch (status) {
        case 'syncing':
            indicator.textContent = '↻ Syncing...';
            break;
        case 'synced':
            indicator.textContent = '✓ Synced';
            setTimeout(() => {
                if (indicator.className.includes('synced')) {
                    indicator.textContent = '';
                }
            }, 2000);
            break;
        case 'error':
            indicator.textContent = '✕ Sync failed';
            break;
        default:
            indicator.textContent = '';
    }
}

// Allowance System
function checkAndAddAllowance() {
    const now = new Date();
    const currentWeek = getWeekNumber(now);
    const dayOfWeek = now.getDay(); // 0 = Sunday

    // Only add allowance on Sunday or later in the week if not already added
    ['kylie', 'parker'].forEach(kid => {
        const user = appData.users[kid];
        if (user.lastAllowanceWeek !== currentWeek && user.allowance > 0) {
            // Check if it's Sunday or if we missed Sunday this week
            if (dayOfWeek === 0 || (user.lastAllowanceWeek !== currentWeek)) {
                // Calculate bank portion
                const bankPercent = user.bankPercent || 0;
                const bankAmount = (user.allowance * bankPercent) / 100;
                const keepAmount = user.allowance - bankAmount;

                user.balance += user.allowance;
                user.pendingBankTransfer = (user.pendingBankTransfer || 0) + bankAmount;

                let description = 'Weekly Allowance';
                if (bankPercent > 0) {
                    description = `Weekly Allowance (${formatCurrency(bankAmount)} to bank)`;
                }

                user.transactions.unshift({
                    id: generateId(),
                    type: 'allowance',
                    amount: user.allowance,
                    description: description,
                    date: now.toISOString(),
                    bankPortion: bankAmount
                });
                user.lastAllowanceWeek = currentWeek;
            }
        }
    });

    saveData();
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Update UI
function updateHomeScreen() {
    document.getElementById('kylie-balance-preview').textContent = formatCurrency(getAvailableBalance('kylie'));
    document.getElementById('parker-balance-preview').textContent = formatCurrency(getAvailableBalance('parker'));

    // Update home meal list
    updateHomeMealList();
}

function updateHomeMealList() {
    const mealsList = document.getElementById('home-meal-list');
    if (!mealsList) return;

    if (!appData.meals || appData.meals.length === 0) {
        mealsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">🍽️</div>
                <p>No meal ideas yet. Add some!</p>
            </div>
        `;
    } else {
        mealsList.innerHTML = appData.meals.map(m => {
            const isSelected = currentRecipeMealId === m.id;
            return `
            <div class="meal-item ${isSelected ? 'selected' : ''}" data-meal-id="${m.id}" data-meal-name="${escapeHtml(m.name)}">
                <span class="meal-name">${escapeHtml(m.name)}</span>
                <button class="delete-meal-btn" onclick="event.stopPropagation(); handleDeleteMeal(${m.id})">×</button>
            </div>
        `}).join('');
    }
}

function updateKidScreen() {
    if (!currentPerson || !['kylie', 'parker'].includes(currentPerson)) return;

    const user = appData.users[currentPerson];
    const availableBalance = getAvailableBalance(currentPerson);
    const totalSavings = getTotalSavings(currentPerson);

    document.getElementById('kid-name').textContent = currentPerson.charAt(0).toUpperCase() + currentPerson.slice(1);
    document.getElementById('kid-balance').textContent = formatCurrency(availableBalance);

    // Show allowance info and bank transfer info
    let allowanceText = `Allowance: ${formatCurrency(user.allowance)}/week`;
    if (totalSavings > 0) {
        allowanceText += ` • Total: ${formatCurrency(user.balance)}`;
    }
    document.getElementById('allowance-info').textContent = allowanceText;

    // Show pending bank transfer
    const bankTransferEl = document.getElementById('bank-transfer-info');
    if (bankTransferEl) {
        if (user.pendingBankTransfer > 0) {
            bankTransferEl.textContent = `Transfer to bank: ${formatCurrency(user.pendingBankTransfer)}`;
            bankTransferEl.classList.remove('hidden');
        } else {
            bankTransferEl.classList.add('hidden');
        }
    }

    // Update savings goals list
    const savingsGoalsList = document.getElementById('savings-goals-list');
    if (!user.savingsGoals || user.savingsGoals.length === 0) {
        savingsGoalsList.innerHTML = `<div class="savings-empty">No savings goals yet</div>`;
    } else {
        savingsGoalsList.innerHTML = user.savingsGoals.map(goal => {
            const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
            const isCompleted = goal.savedAmount >= goal.targetAmount;
            return `
                <div class="savings-goal-item ${isCompleted ? 'completed' : ''}" data-goal-id="${goal.id}">
                    <div class="goal-info">
                        <span class="goal-name">${escapeHtml(goal.name)}</span>
                        <span class="goal-amounts">
                            <span class="saved">${formatCurrency(goal.savedAmount)}</span> / ${formatCurrency(goal.targetAmount)}
                        </span>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Update transaction list
    const transactionList = document.getElementById('transaction-list');
    if (user.transactions.length === 0) {
        transactionList.innerHTML = `
            <div class="empty-state">
                <div class="icon">📊</div>
                <p>No transactions yet</p>
            </div>
        `;
    } else {
        transactionList.innerHTML = user.transactions.map(t => `
            <div class="transaction-item ${t.type}" data-transaction-id="${t.id}">
                <div class="transaction-icon">
                    ${t.type === 'earning' ? '💰' : t.type === 'expense' ? '🛒' : '📅'}
                </div>
                <div class="transaction-details">
                    <div class="transaction-description">${escapeHtml(t.description)}</div>
                    <div class="transaction-date">${formatDate(t.date)}</div>
                </div>
                <div class="transaction-amount">
                    ${t.type === 'expense' ? '-' : '+'}${formatCurrency(t.amount)}
                </div>
            </div>
        `).join('');
    }

    // Update kid's chores
    const kidChores = appData.chores.filter(c => c.assignedTo.includes(currentPerson));
    const kidChoreList = document.getElementById('kid-chore-list');
    if (kidChores.length === 0) {
        kidChoreList.innerHTML = `
            <div class="empty-state">
                <div class="icon">✨</div>
                <p>No chores assigned</p>
            </div>
        `;
    } else {
        kidChoreList.innerHTML = kidChores.map(c => {
            const completion = getChoreCompletion(currentPerson, c.id);
            const isCompleted = !!completion;
            return `
                <div class="chore-item ${isCompleted ? 'completed' : ''}" data-chore-id="${c.id}">
                    <button class="chore-check ${isCompleted ? 'checked' : ''}" data-action="toggle">
                        ${isCompleted ? '✓' : ''}
                    </button>
                    <div class="chore-info">
                        <span class="chore-name">${escapeHtml(c.name)}</span>
                        ${isCompleted ? `<span class="chore-completed-date">Done ${formatCompletionDate(completion)}</span>` : ''}
                    </div>
                    ${isCompleted ? `<button class="chore-clear" data-action="clear">×</button>` : ''}
                </div>
            `;
        }).join('');
    }

    // Update earning options dropdown
    const optionSelect = document.getElementById('earning-option');
    optionSelect.innerHTML = '<option value="">Select an option (or enter custom amount)</option>' +
        appData.options.map(o => `<option value="${o.id}" data-value="${o.value}">${escapeHtml(o.name)} (${formatCurrency(o.value)})</option>`).join('');
}

function updateParentScreen() {
    if (!currentPerson || !['mom', 'dad'].includes(currentPerson)) return;

    document.getElementById('parent-name').textContent = currentPerson.charAt(0).toUpperCase() + currentPerson.slice(1);

    const parentChores = appData.chores.filter(c => c.assignedTo.includes(currentPerson));
    const parentChoreList = document.getElementById('parent-chore-list');
    if (parentChores.length === 0) {
        parentChoreList.innerHTML = `
            <div class="empty-state">
                <div class="icon">✨</div>
                <p>No chores assigned</p>
            </div>
        `;
    } else {
        parentChoreList.innerHTML = parentChores.map(c => {
            const completion = getChoreCompletion(currentPerson, c.id);
            const isCompleted = !!completion;
            return `
                <div class="chore-item ${isCompleted ? 'completed' : ''}" data-chore-id="${c.id}">
                    <button class="chore-check ${isCompleted ? 'checked' : ''}" data-action="toggle">
                        ${isCompleted ? '✓' : ''}
                    </button>
                    <div class="chore-info">
                        <span class="chore-name">${escapeHtml(c.name)}</span>
                        ${isCompleted ? `<span class="chore-completed-date">Done ${formatCompletionDate(completion)}</span>` : ''}
                    </div>
                    ${isCompleted ? `<button class="chore-clear" data-action="clear">×</button>` : ''}
                </div>
            `;
        }).join('');
    }
}

function updateManageScreen() {
    // Update current balances
    document.getElementById('kylie-current-balance').textContent = formatCurrency(appData.users.kylie.balance);
    document.getElementById('parker-current-balance').textContent = formatCurrency(appData.users.parker.balance);

    // Update allowance inputs
    document.getElementById('kylie-allowance').value = appData.users.kylie.allowance;
    document.getElementById('parker-allowance').value = appData.users.parker.allowance;

    // Update bank percent inputs
    document.getElementById('kylie-bank-percent').value = appData.users.kylie.bankPercent || 0;
    document.getElementById('parker-bank-percent').value = appData.users.parker.bankPercent || 0;

    // Update pending bank transfers
    document.getElementById('kylie-pending-transfer').textContent = formatCurrency(appData.users.kylie.pendingBankTransfer || 0);
    document.getElementById('parker-pending-transfer').textContent = formatCurrency(appData.users.parker.pendingBankTransfer || 0);

    // Update chore grid
    const choreGridBody = document.getElementById('chore-grid-body');
    if (appData.chores.length === 0) {
        choreGridBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <div class="icon">📋</div>
                    <p>No chores yet. Add some!</p>
                </td>
            </tr>
        `;
    } else {
        choreGridBody.innerHTML = appData.chores.map(c => `
            <tr data-chore-id="${c.id}">
                <td class="chore-name-cell">${escapeHtml(c.name)}</td>
                <td><input type="checkbox" ${c.assignedTo.includes('kylie') ? 'checked' : ''}
                           onchange="handleChoreAssignmentChange(${c.id}, 'kylie', this.checked)"></td>
                <td><input type="checkbox" ${c.assignedTo.includes('parker') ? 'checked' : ''}
                           onchange="handleChoreAssignmentChange(${c.id}, 'parker', this.checked)"></td>
                <td><input type="checkbox" ${c.assignedTo.includes('dad') ? 'checked' : ''}
                           onchange="handleChoreAssignmentChange(${c.id}, 'dad', this.checked)"></td>
                <td><input type="checkbox" ${c.assignedTo.includes('mom') ? 'checked' : ''}
                           onchange="handleChoreAssignmentChange(${c.id}, 'mom', this.checked)"></td>
                <td><button class="delete-chore-btn" onclick="handleDeleteChoreFromGrid(${c.id})">×</button></td>
            </tr>
        `).join('');
    }

    // Update options list
    const optionsList = document.getElementById('options-list');
    if (appData.options.length === 0) {
        optionsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">💰</div>
                <p>No options yet. Add some!</p>
            </div>
        `;
    } else {
        optionsList.innerHTML = appData.options.map(o => `
            <div class="option-item" data-option-id="${o.id}">
                <span class="option-name">${escapeHtml(o.name)}</span>
                <span class="option-value">${formatCurrency(o.value)}</span>
                <button class="delete-option-btn" onclick="handleDeleteOption(${o.id})">×</button>
            </div>
        `).join('');
    }

    // Update meals list
    const mealsList = document.getElementById('meal-list');
    if (appData.meals.length === 0) {
        mealsList.innerHTML = `
            <div class="empty-state">
                <div class="icon">🍽️</div>
                <p>No meal ideas yet. Add some!</p>
            </div>
        `;
    } else {
        mealsList.innerHTML = appData.meals.map(m => {
            const isSelected = currentRecipeMealId === m.id;
            return `
            <div class="meal-item ${isSelected ? 'selected' : ''}" data-meal-id="${m.id}" data-meal-name="${escapeHtml(m.name)}">
                <span class="meal-name">${escapeHtml(m.name)}</span>
                <button class="delete-meal-btn" onclick="event.stopPropagation(); handleDeleteMeal(${m.id})">×</button>
            </div>
        `}).join('');
    }
}

// Chore grid handlers
function handleChoreAssignmentChange(choreId, person, isAssigned) {
    const chore = appData.chores.find(c => c.id === choreId);
    if (chore) {
        if (isAssigned && !chore.assignedTo.includes(person)) {
            chore.assignedTo.push(person);
        } else if (!isAssigned) {
            chore.assignedTo = chore.assignedTo.filter(p => p !== person);
        }
        saveData();
    }
}

function handleDeleteChoreFromGrid(choreId) {
    if (confirm('Delete this chore?')) {
        appData.chores = appData.chores.filter(c => c.id !== choreId);
        saveData();
        updateManageScreen();
    }
}

// Option handlers
function handleDeleteOption(optionId) {
    if (confirm('Delete this option?')) {
        appData.options = appData.options.filter(o => o.id !== optionId);
        saveData();
        updateManageScreen();
    }
}

function handleSaveOption() {
    const name = document.getElementById('option-name').value.trim();
    const value = parseFloat(document.getElementById('option-value').value) || 0;

    if (!name) {
        alert('Please enter an option name');
        return;
    }

    if (value <= 0) {
        alert('Please enter a value greater than 0');
        return;
    }

    appData.options.push({
        id: appData.nextOptionId++,
        name: name,
        value: value
    });

    saveData();
    updateManageScreen();
    closeModal('option-modal');

    // Reset form
    document.getElementById('option-name').value = '';
    document.getElementById('option-value').value = '';
}

// Meal handlers
function handleSaveMeal() {
    const name = document.getElementById('meal-name').value.trim();

    if (!name) {
        alert('Please enter a meal name');
        return;
    }

    appData.meals.push({
        id: appData.nextMealId++,
        name: name,
        quantity: 1
    });

    saveData();
    updateManageScreen();
    updateHomeMealList();
    closeModal('meal-modal');

    // Reset form
    document.getElementById('meal-name').value = '';
}

function handleDeleteMeal(mealId) {
    appData.meals = appData.meals.filter(m => m.id !== mealId);
    saveData();
    updateManageScreen();
    updateHomeMealList();
}

function handleMealQuantityChange(mealId, delta) {
    const meal = appData.meals.find(m => m.id === mealId);
    if (meal) {
        meal.quantity = Math.max(1, (meal.quantity || 1) + delta);
        saveData();
        updateManageScreen();
    }
}

async function handleGetRecipe(mealId, mealName, isHomePage = false) {
    currentRecipeMealId = mealId;
    currentRecipeMealName = mealName;

    // Get the right elements based on which page we're on
    const prefix = isHomePage ? 'home-' : '';
    const recipeDisplay = document.getElementById(prefix + 'recipe-display');
    const recipeTitle = document.getElementById(prefix + 'recipe-title');
    const recipeContent = document.getElementById(prefix + 'recipe-content');
    const tryAgainBtn = document.getElementById(prefix + 'try-again-btn');

    if (!recipeDisplay) return;

    recipeDisplay.classList.remove('hidden');
    recipeTitle.textContent = `Loading ${mealName} Recipe...`;
    recipeContent.innerHTML = '<div class="recipe-loading">🍳 Finding a great recipe...</div>';
    if (tryAgainBtn) tryAgainBtn.disabled = true;

    // Update meal list to show selected state
    if (isHomePage) {
        updateHomeMealList();
    } else {
        updateManageScreen();
    }

    try {
        const response = await fetch(N8N_RECIPE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mealName: mealName })
        });

        const recipe = await response.json();

        // Store ingredients for ordering
        currentRecipeIngredients = recipe.ingredients || [];

        // Display the recipe
        recipeTitle.textContent = recipe.title || mealName;
        recipeContent.innerHTML = `
            ${recipe.prepTime ? `<div class="recipe-prep-time">⏱️ ${recipe.prepTime}</div>` : ''}
            <div class="recipe-ingredients">
                <h3>Ingredients</h3>
                <ul>
                    ${recipe.ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
                </ul>
            </div>
            <div class="recipe-instructions">
                <h3>Instructions</h3>
                <ol>
                    ${recipe.instructions.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
                </ol>
            </div>
            <div class="fred-meyer-products hidden" id="${prefix}fred-meyer-products">
                <!-- Products will be loaded here -->
            </div>
        `;

        if (tryAgainBtn) tryAgainBtn.disabled = false;

        // Scroll to recipe
        recipeDisplay.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Recipe fetch error:', error);
        recipeContent.innerHTML = '<div class="recipe-error">Failed to load recipe. Please try again.</div>';
        if (tryAgainBtn) tryAgainBtn.disabled = false;
    }
}

let isHomePageRecipe = false;

function handleTryAgain(isHomePage = false) {
    if (currentRecipeMealId && currentRecipeMealName) {
        handleGetRecipe(currentRecipeMealId, currentRecipeMealName, isHomePage);
    }
}

async function handleOrderCurrentMeal(isHomePage = false) {
    if (!currentRecipeIngredients || currentRecipeIngredients.length === 0) {
        alert('Please get a recipe first before ordering ingredients.');
        return;
    }

    const prefix = isHomePage ? 'home-' : '';
    const orderBtn = document.getElementById(prefix + 'order-btn') || document.getElementById('order-recipe-btn');
    const productsDiv = document.getElementById(prefix + 'fred-meyer-products');

    orderBtn.textContent = 'Finding products...';
    orderBtn.disabled = true;

    if (productsDiv) {
        productsDiv.classList.remove('hidden');
        productsDiv.innerHTML = '<div class="products-loading">🛒 Searching Fred Meyer for ingredients...</div>';
    }

    try {
        const response = await fetch(N8N_ORDER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients: currentRecipeIngredients })
        });

        const result = await response.json();

        if (result.products && result.products.length > 0) {
            const foundProducts = result.products.filter(p => p.found);
            const notFound = result.products.filter(p => !p.found);
            const totalPrice = foundProducts.reduce((sum, p) => sum + (p.price || 0), 0);

            productsDiv.innerHTML = `
                <h3>🛒 Fred Meyer Products</h3>
                <div class="products-summary">
                    Found ${foundProducts.length} of ${result.products.length} items
                    ${totalPrice > 0 ? `• Est. Total: $${totalPrice.toFixed(2)}` : ''}
                </div>
                <div class="products-list">
                    ${foundProducts.map(p => `
                        <div class="product-item">
                            ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" class="product-image">` : '<div class="product-image-placeholder">🥫</div>'}
                            <div class="product-info">
                                <div class="product-name">${escapeHtml(p.name)}</div>
                                <div class="product-details">
                                    ${p.brand ? `<span class="product-brand">${escapeHtml(p.brand)}</span>` : ''}
                                    ${p.size ? `<span class="product-size">${escapeHtml(p.size)}</span>` : ''}
                                </div>
                                <div class="product-ingredient">For: ${escapeHtml(p.ingredient)}</div>
                            </div>
                            <div class="product-price">${p.price ? `$${p.price.toFixed(2)}` : '-'}</div>
                        </div>
                    `).join('')}
                </div>
                ${notFound.length > 0 ? `
                    <div class="products-not-found">
                        <strong>Not found:</strong> ${notFound.map(p => escapeHtml(p.ingredient)).join(', ')}
                    </div>
                ` : ''}
                <a href="https://www.fredmeyer.com" target="_blank" class="fred-meyer-link">
                    Open Fred Meyer Website →
                </a>
            `;
        } else {
            productsDiv.innerHTML = '<div class="products-error">No products found. Try a different recipe.</div>';
        }

        orderBtn.textContent = 'Order';
        orderBtn.disabled = false;

        productsDiv.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Fred Meyer order error:', error);
        if (productsDiv) {
            productsDiv.innerHTML = '<div class="products-error">Failed to search products. Please try again.</div>';
        }
        orderBtn.textContent = 'Order';
        orderBtn.disabled = false;
    }
}

function handleOrderMeal(mealName) {
    const searchQuery = encodeURIComponent(mealName + ' delivery near me');
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
}

// Balance adjustment handler
function handleBalanceAdjustment(kid, action) {
    const inputId = `${kid}-adjustment`;
    const amount = parseFloat(document.getElementById(inputId).value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const user = appData.users[kid];
    const kidName = kid.charAt(0).toUpperCase() + kid.slice(1);

    if (action === 'add') {
        user.balance += amount;
        user.transactions.unshift({
            id: generateId(),
            type: 'earning',
            amount: amount,
            description: 'Manual adjustment (added)',
            date: new Date().toISOString()
        });
    } else {
        user.balance -= amount;
        user.transactions.unshift({
            id: generateId(),
            type: 'expense',
            amount: amount,
            description: 'Manual adjustment (subtracted)',
            date: new Date().toISOString()
        });
    }

    saveData();
    updateManageScreen();
    updateHomeScreen();

    // Clear input
    document.getElementById(inputId).value = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Event Handlers
function handlePersonClick(e) {
    const card = e.target.closest('.person-card');
    if (!card) return;

    currentPerson = card.dataset.person;

    if (['kylie', 'parker'].includes(currentPerson)) {
        updateKidScreen();
        showScreen('kid-screen');
    } else {
        updateParentScreen();
        showScreen('parent-screen');
    }
}

function handleTabClick(e) {
    const tab = e.target.closest('.tab');
    if (!tab) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const tabName = tab.dataset.tab;
    document.getElementById('history-tab').classList.toggle('hidden', tabName !== 'history');
    document.getElementById('chores-tab').classList.toggle('hidden', tabName !== 'chores');
}

function handleAddEarning() {
    const amount = parseFloat(document.getElementById('earning-amount').value);
    const description = document.getElementById('earning-description').value.trim();
    const optionSelect = document.getElementById('earning-option');
    const optionId = optionSelect.value;

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    let finalDescription = description;
    if (optionId && !description) {
        const option = appData.options.find(o => o.id === parseInt(optionId));
        finalDescription = option ? option.name : 'Earning';
    }
    if (!finalDescription) {
        finalDescription = 'Earning';
    }

    const user = appData.users[currentPerson];
    user.balance += amount;
    user.transactions.unshift({
        id: generateId(),
        type: 'earning',
        amount: amount,
        description: finalDescription,
        date: new Date().toISOString(),
        optionId: optionId || null
    });

    saveData();
    updateKidScreen();
    updateHomeScreen();
    closeModal('earning-modal');

    // Reset form
    document.getElementById('earning-amount').value = '';
    document.getElementById('earning-description').value = '';
    document.getElementById('earning-option').value = '';
}

function handleAddExpense() {
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const description = document.getElementById('expense-description').value.trim() || 'Expense';

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const user = appData.users[currentPerson];

    if (amount > user.balance) {
        if (!confirm(`This will make the balance negative (${formatCurrency(user.balance - amount)}). Continue?`)) {
            return;
        }
    }

    user.balance -= amount;
    user.transactions.unshift({
        id: generateId(),
        type: 'expense',
        amount: amount,
        description: description,
        date: new Date().toISOString()
    });

    saveData();
    updateKidScreen();
    updateHomeScreen();
    closeModal('expense-modal');

    // Reset form
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-description').value = '';
}

function handleOptionSelect(e) {
    const select = e.target;
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption.dataset.value) {
        document.getElementById('earning-amount').value = selectedOption.dataset.value;
    }
}

function handleAllowanceChange() {
    const kylieAllowance = parseFloat(document.getElementById('kylie-allowance').value) || 0;
    const parkerAllowance = parseFloat(document.getElementById('parker-allowance').value) || 0;

    appData.users.kylie.allowance = kylieAllowance;
    appData.users.parker.allowance = parkerAllowance;

    saveData();
}

function openChoreModal() {
    editingChoreId = null;
    const title = document.getElementById('chore-modal-title');
    const deleteBtn = document.getElementById('delete-chore');

    // Reset form
    document.getElementById('chore-name').value = '';
    document.querySelectorAll('.assignee-toggle').forEach(t => t.classList.remove('active'));

    title.textContent = 'Add Chore';
    deleteBtn.classList.add('hidden');

    openModal('chore-modal');
}

function handleAssigneeToggle(e) {
    const toggle = e.target.closest('.assignee-toggle');
    if (!toggle) return;
    toggle.classList.toggle('active');
}

function handleSaveChore() {
    const name = document.getElementById('chore-name').value.trim();
    const assignedTo = Array.from(document.querySelectorAll('.assignee-toggle.active'))
        .map(t => t.dataset.person);

    if (!name) {
        alert('Please enter a chore name');
        return;
    }

    // Add new chore
    appData.chores.push({
        id: appData.nextChoreId++,
        name: name,
        assignedTo: assignedTo
    });

    saveData();
    updateManageScreen();
    closeModal('chore-modal');
}

function handleDeleteChore() {
    if (!editingChoreId) return;

    if (confirm('Are you sure you want to delete this chore?')) {
        appData.chores = appData.chores.filter(c => c.id !== editingChoreId);
        saveData();
        updateManageScreen();
        closeModal('chore-modal');
    }
}

// Savings Goal Handlers
function handleAddSavingsGoal() {
    const name = document.getElementById('savings-name').value.trim();
    const targetAmount = parseFloat(document.getElementById('savings-target').value) || 0;
    const initialAmount = parseFloat(document.getElementById('savings-initial').value) || 0;

    if (!name) {
        alert('Please enter what you\'re saving for');
        return;
    }

    if (targetAmount <= 0) {
        alert('Please enter a goal amount');
        return;
    }

    const user = appData.users[currentPerson];
    const availableBalance = getAvailableBalance(currentPerson);

    if (initialAmount > availableBalance) {
        alert(`You only have ${formatCurrency(availableBalance)} available to put towards savings`);
        return;
    }

    user.savingsGoals.push({
        id: generateId(),
        name: name,
        targetAmount: targetAmount,
        savedAmount: initialAmount,
        createdAt: new Date().toISOString()
    });

    saveData();
    updateKidScreen();
    updateHomeScreen();
    closeModal('savings-modal');

    // Reset form
    document.getElementById('savings-name').value = '';
    document.getElementById('savings-target').value = '';
    document.getElementById('savings-initial').value = '';
}

function openManageSavingsModal(goalId) {
    currentSavingsGoalId = goalId;
    const user = appData.users[currentPerson];
    const goal = user.savingsGoals.find(g => g.id === goalId);

    if (!goal) return;

    document.getElementById('manage-savings-title').textContent = goal.name;
    document.getElementById('manage-goal-saved').textContent = formatCurrency(goal.savedAmount);
    document.getElementById('manage-goal-target').textContent = formatCurrency(goal.targetAmount);

    const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
    document.getElementById('manage-goal-progress').style.width = `${progress}%`;

    document.getElementById('savings-adjust-amount').value = '';

    openModal('manage-savings-modal');
}

function handleSavingsAdjust(action) {
    const amount = parseFloat(document.getElementById('savings-adjust-amount').value);

    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    const user = appData.users[currentPerson];
    const goal = user.savingsGoals.find(g => g.id === currentSavingsGoalId);

    if (!goal) return;

    if (action === 'add') {
        const availableBalance = getAvailableBalance(currentPerson);
        if (amount > availableBalance) {
            alert(`You only have ${formatCurrency(availableBalance)} available to add to savings`);
            return;
        }
        goal.savedAmount += amount;
    } else {
        if (amount > goal.savedAmount) {
            alert(`You can only remove up to ${formatCurrency(goal.savedAmount)}`);
            return;
        }
        goal.savedAmount -= amount;
    }

    saveData();
    updateKidScreen();
    updateHomeScreen();

    // Update the modal display
    document.getElementById('manage-goal-saved').textContent = formatCurrency(goal.savedAmount);
    const progress = goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
    document.getElementById('manage-goal-progress').style.width = `${progress}%`;
    document.getElementById('savings-adjust-amount').value = '';
}

function handleDeleteSavingsGoal() {
    if (!currentSavingsGoalId) return;

    if (confirm('Delete this savings goal? The money will return to your available balance.')) {
        const user = appData.users[currentPerson];
        user.savingsGoals = user.savingsGoals.filter(g => g.id !== currentSavingsGoalId);
        currentSavingsGoalId = null;

        saveData();
        updateKidScreen();
        updateHomeScreen();
        closeModal('manage-savings-modal');
    }
}

// Bank Transfer Handlers
function handleBankPercentChange() {
    const kyliePercent = parseInt(document.getElementById('kylie-bank-percent').value) || 0;
    const parkerPercent = parseInt(document.getElementById('parker-bank-percent').value) || 0;

    appData.users.kylie.bankPercent = Math.max(0, Math.min(100, kyliePercent));
    appData.users.parker.bankPercent = Math.max(0, Math.min(100, parkerPercent));

    saveData();
}

function handleMarkTransferred(kid) {
    const user = appData.users[kid];
    if (user.pendingBankTransfer > 0) {
        const amount = user.pendingBankTransfer;
        user.pendingBankTransfer = 0;

        // Add transaction record
        user.transactions.unshift({
            id: generateId(),
            type: 'expense',
            amount: amount,
            description: 'Transferred to bank account',
            date: new Date().toISOString()
        });

        // Subtract from balance since it went to bank
        user.balance -= amount;

        saveData();
        updateManageScreen();
        updateHomeScreen();
    }
}

// Transaction Edit Handlers
function openEditTransactionModal(transactionId) {
    currentTransactionId = transactionId;
    const user = appData.users[currentPerson];
    const transaction = user.transactions.find(t => t.id === transactionId);

    if (!transaction) return;

    document.getElementById('edit-transaction-amount').value = transaction.amount;
    document.getElementById('edit-transaction-description').value = transaction.description;
    document.getElementById('edit-transaction-date').textContent = `Created: ${formatDate(transaction.date)}`;

    openModal('edit-transaction-modal');
}

function handleSaveTransactionEdit() {
    if (!currentTransactionId) return;

    const user = appData.users[currentPerson];
    const transaction = user.transactions.find(t => t.id === currentTransactionId);

    if (!transaction) return;

    const newAmount = parseFloat(document.getElementById('edit-transaction-amount').value) || 0;
    const newDescription = document.getElementById('edit-transaction-description').value.trim();

    if (newAmount <= 0) {
        alert('Please enter a valid amount');
        return;
    }

    // Adjust balance based on old and new amounts
    const amountDiff = newAmount - transaction.amount;
    if (transaction.type === 'expense') {
        user.balance -= amountDiff; // More expense = less balance
    } else {
        user.balance += amountDiff; // More earning = more balance
    }

    transaction.amount = newAmount;
    transaction.description = newDescription || transaction.description;

    saveData();
    updateKidScreen();
    updateHomeScreen();
    closeModal('edit-transaction-modal');
}

function handleDeleteTransaction() {
    if (!currentTransactionId) return;

    if (confirm('Delete this transaction? This will adjust the balance.')) {
        const user = appData.users[currentPerson];
        const transaction = user.transactions.find(t => t.id === currentTransactionId);

        if (transaction) {
            // Reverse the balance effect
            if (transaction.type === 'expense') {
                user.balance += transaction.amount;
            } else {
                user.balance -= transaction.amount;
            }

            user.transactions = user.transactions.filter(t => t.id !== currentTransactionId);
        }

        currentTransactionId = null;
        saveData();
        updateKidScreen();
        updateHomeScreen();
        closeModal('edit-transaction-modal');
    }
}

// Initialize App
async function init() {
    // Try to load from cloud first, fall back to localStorage
    const cloudData = await loadFromCloud();
    if (cloudData) {
        appData = cloudData;
        // Ensure backwards compatibility
        ensureDataIntegrity();
        // Also update localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
        updateSyncStatus('synced');
    } else {
        loadData();
        // If we have local data, push it to cloud
        if (appData) {
            syncToCloud();
        }
    }

    checkAndAddAllowance();
    updateHomeScreen();

    // Person selection
    document.querySelector('.person-grid').addEventListener('click', handlePersonClick);

    // Navigation
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen(btn.dataset.target);
            updateHomeScreen();
        });
    });

    // Manage screen
    document.getElementById('manage-chores-btn').addEventListener('click', () => {
        updateManageScreen();
        showScreen('manage-screen');
    });

    // Tabs
    document.querySelector('.tabs').addEventListener('click', handleTabClick);

    // Add earning/expense buttons
    document.getElementById('add-earning-btn').addEventListener('click', () => {
        updateKidScreen(); // Update chore dropdown
        openModal('earning-modal');
    });
    document.getElementById('add-expense-btn').addEventListener('click', () => openModal('expense-modal'));

    // Save earning/expense
    document.getElementById('save-earning').addEventListener('click', handleAddEarning);
    document.getElementById('save-expense').addEventListener('click', handleAddExpense);

    // Option select auto-fill amount
    document.getElementById('earning-option').addEventListener('change', handleOptionSelect);

    // Option management
    document.getElementById('add-option-btn').addEventListener('click', () => openModal('option-modal'));
    document.getElementById('save-option').addEventListener('click', handleSaveOption);

    // Meal management
    document.getElementById('add-meal-btn').addEventListener('click', () => openModal('meal-modal'));
    document.getElementById('save-meal').addEventListener('click', handleSaveMeal);

    // Meal list click handler - get recipe when clicking a meal
    document.getElementById('meal-list').addEventListener('click', (e) => {
        const mealItem = e.target.closest('.meal-item');
        if (mealItem && !e.target.classList.contains('delete-meal-btn')) {
            const mealId = parseInt(mealItem.dataset.mealId);
            const mealName = mealItem.dataset.mealName;
            handleGetRecipe(mealId, mealName);
        }
    });

    // Recipe action buttons (manage screen)
    document.getElementById('try-again-btn')?.addEventListener('click', () => handleTryAgain(false));
    document.getElementById('order-recipe-btn')?.addEventListener('click', () => handleOrderCurrentMeal(false));

    // Home page meal management
    document.getElementById('home-add-meal-btn')?.addEventListener('click', () => openModal('meal-modal'));

    // Home page meal list click handler
    document.getElementById('home-meal-list')?.addEventListener('click', (e) => {
        const mealItem = e.target.closest('.meal-item');
        if (mealItem && !e.target.classList.contains('delete-meal-btn')) {
            const mealId = parseInt(mealItem.dataset.mealId);
            const mealName = mealItem.dataset.mealName;
            isHomePageRecipe = true;
            handleGetRecipe(mealId, mealName, true);
        }
    });

    // Home page recipe action buttons
    document.getElementById('home-try-again-btn')?.addEventListener('click', () => handleTryAgain(true));
    document.getElementById('home-order-btn')?.addEventListener('click', () => handleOrderCurrentMeal(true));

    // Allowance changes
    document.getElementById('kylie-allowance').addEventListener('change', handleAllowanceChange);
    document.getElementById('parker-allowance').addEventListener('change', handleAllowanceChange);

    // Bank percent changes
    document.getElementById('kylie-bank-percent').addEventListener('change', handleBankPercentChange);
    document.getElementById('parker-bank-percent').addEventListener('change', handleBankPercentChange);

    // Mark transferred buttons
    document.getElementById('kylie-mark-transferred').addEventListener('click', () => handleMarkTransferred('kylie'));
    document.getElementById('parker-mark-transferred').addEventListener('click', () => handleMarkTransferred('parker'));

    // Transaction list - click to edit
    document.getElementById('transaction-list').addEventListener('click', (e) => {
        const transactionItem = e.target.closest('.transaction-item');
        if (transactionItem && transactionItem.dataset.transactionId) {
            openEditTransactionModal(transactionItem.dataset.transactionId);
        }
    });

    // Transaction edit modal
    document.getElementById('save-transaction-edit').addEventListener('click', handleSaveTransactionEdit);
    document.getElementById('delete-transaction').addEventListener('click', handleDeleteTransaction);

    // Chore management - Add new chore button
    document.getElementById('add-chore-btn').addEventListener('click', () => openChoreModal());
    document.getElementById('assignee-toggles').addEventListener('click', handleAssigneeToggle);
    document.getElementById('save-chore').addEventListener('click', handleSaveChore);
    document.getElementById('delete-chore').addEventListener('click', handleDeleteChore);

    // Chore completion - kid and parent lists
    document.getElementById('kid-chore-list').addEventListener('click', (e) => {
        const choreItem = e.target.closest('.chore-item');
        if (!choreItem) return;
        const choreId = parseInt(choreItem.dataset.choreId);
        const action = e.target.dataset.action;

        if (action === 'toggle') {
            toggleChoreCompletion(currentPerson, choreId);
        } else if (action === 'clear') {
            clearChoreCompletion(currentPerson, choreId);
        }
    });

    document.getElementById('parent-chore-list').addEventListener('click', (e) => {
        const choreItem = e.target.closest('.chore-item');
        if (!choreItem) return;
        const choreId = parseInt(choreItem.dataset.choreId);
        const action = e.target.dataset.action;

        if (action === 'toggle') {
            toggleChoreCompletion(currentPerson, choreId);
        } else if (action === 'clear') {
            clearChoreCompletion(currentPerson, choreId);
        }
    });

    // Savings goal management
    document.getElementById('add-savings-btn').addEventListener('click', () => openModal('savings-modal'));
    document.getElementById('save-savings-goal').addEventListener('click', handleAddSavingsGoal);
    document.getElementById('savings-goals-list').addEventListener('click', (e) => {
        const goalItem = e.target.closest('.savings-goal-item');
        if (goalItem) {
            openManageSavingsModal(goalItem.dataset.goalId);
        }
    });
    document.getElementById('savings-add-btn').addEventListener('click', () => handleSavingsAdjust('add'));
    document.getElementById('savings-remove-btn').addEventListener('click', () => handleSavingsAdjust('remove'));
    document.getElementById('delete-savings-goal').addEventListener('click', handleDeleteSavingsGoal);

    // Close modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAllModals();
        });
    });

    // Check allowance periodically (every hour)
    setInterval(checkAndAddAllowance, 60 * 60 * 1000);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
