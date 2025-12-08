// Family Budget App
// Data Management

const STORAGE_KEY = 'familyBudgetData';

// Default data structure
const defaultData = {
    users: {
        kylie: {
            balance: 0,
            allowance: 5,
            transactions: [],
            lastAllowanceWeek: null
        },
        parker: {
            balance: 0,
            allowance: 5,
            transactions: [],
            lastAllowanceWeek: null
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
    nextChoreId: 10,
    nextOptionId: 2
};

// State
let appData = null;
let currentPerson = null;
let editingChoreId = null;

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
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
        ['kylie', 'parker'].forEach(kid => {
            if (!appData.users[kid].lastAllowanceWeek) {
                appData.users[kid].lastAllowanceWeek = null;
            }
        });
    } else {
        appData = JSON.parse(JSON.stringify(defaultData));
    }
    return appData;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
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
                user.balance += user.allowance;
                user.transactions.unshift({
                    id: generateId(),
                    type: 'allowance',
                    amount: user.allowance,
                    description: 'Weekly Allowance',
                    date: now.toISOString()
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
    document.getElementById('kylie-balance-preview').textContent = formatCurrency(appData.users.kylie.balance);
    document.getElementById('parker-balance-preview').textContent = formatCurrency(appData.users.parker.balance);
}

function updateKidScreen() {
    if (!currentPerson || !['kylie', 'parker'].includes(currentPerson)) return;

    const user = appData.users[currentPerson];
    document.getElementById('kid-name').textContent = currentPerson.charAt(0).toUpperCase() + currentPerson.slice(1);
    document.getElementById('kid-balance').textContent = formatCurrency(user.balance);
    document.getElementById('allowance-info').textContent = `Allowance: ${formatCurrency(user.allowance)}/week`;

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
            <div class="transaction-item ${t.type}">
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
        kidChoreList.innerHTML = kidChores.map(c => `
            <div class="chore-item">
                <span class="chore-name">${escapeHtml(c.name)}</span>
            </div>
        `).join('');
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
        parentChoreList.innerHTML = parentChores.map(c => `
            <div class="chore-item">
                <span class="chore-name">${escapeHtml(c.name)}</span>
            </div>
        `).join('');
    }
}

function updateManageScreen() {
    // Update current balances
    document.getElementById('kylie-current-balance').textContent = formatCurrency(appData.users.kylie.balance);
    document.getElementById('parker-current-balance').textContent = formatCurrency(appData.users.parker.balance);

    // Update allowance inputs
    document.getElementById('kylie-allowance').value = appData.users.kylie.allowance;
    document.getElementById('parker-allowance').value = appData.users.parker.allowance;

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
    document.getElementById('chore-value').value = '';
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

// Initialize App
function init() {
    loadData();
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

    // Allowance changes
    document.getElementById('kylie-allowance').addEventListener('change', handleAllowanceChange);
    document.getElementById('parker-allowance').addEventListener('change', handleAllowanceChange);

    // Chore management - Add new chore button
    document.getElementById('add-chore-btn').addEventListener('click', () => openChoreModal());
    document.getElementById('assignee-toggles').addEventListener('click', handleAssigneeToggle);
    document.getElementById('save-chore').addEventListener('click', handleSaveChore);
    document.getElementById('delete-chore').addEventListener('click', handleDeleteChore);

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
