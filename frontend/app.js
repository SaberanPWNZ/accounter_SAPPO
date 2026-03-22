/* Accounter SAPPO – frontend logic (KISS: no framework, plain fetch API) */

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────
let currentAccountId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const accountList      = document.getElementById('account-list');
const detailEmpty      = document.getElementById('detail-empty');
const detailContent    = document.getElementById('detail-content');
const detailName       = document.getElementById('detail-name');
const detailBalance    = document.getElementById('detail-balance');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const txList           = document.getElementById('tx-list');
const txAmount         = document.getElementById('tx-amount');
const txDescription    = document.getElementById('tx-description');
const addTxBtn         = document.getElementById('add-tx-btn');
const modalOverlay     = document.getElementById('modal-overlay');
const newAccountName   = document.getElementById('new-account-name');

// ── Toast ──────────────────────────────────────────────────────────────────
const toastEl = (() => {
  const el = document.createElement('div');
  el.id = 'toast';
  document.body.appendChild(el);
  return el;
})();

function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.style.background = isError ? '#b91c1c' : '#1e293b';
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ── API helpers ────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Formatting helpers ─────────────────────────────────────────────────────
function fmtMoney(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(2);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Render account list ────────────────────────────────────────────────────
async function loadAccounts() {
  try {
    const accounts = await apiFetch('/accounts');
    accountList.innerHTML = '';
    if (accounts.length === 0) {
      accountList.innerHTML = '<li class="placeholder">No accounts yet. Create one!</li>';
      return;
    }
    for (const acc of accounts) {
      const li = document.createElement('li');
      li.className = 'account-item' + (acc.id === currentAccountId ? ' active' : '');
      li.dataset.id = acc.id;

      const bal = acc.balance;
      const balClass = bal >= 0 ? 'positive' : 'negative';

      li.innerHTML = `
        <span class="acc-name">${escHtml(acc.name)}</span>
        <span class="acc-balance ${balClass}">${fmtMoney(bal)}</span>
      `;
      li.addEventListener('click', () => openAccount(acc.id));
      accountList.appendChild(li);
    }
  } catch (e) {
    showToast('Failed to load accounts: ' + e.message, true);
  }
}

// ── Render account detail ──────────────────────────────────────────────────
async function openAccount(id) {
  currentAccountId = id;
  try {
    const acc = await apiFetch(`/accounts/${id}`);
    detailName.textContent = acc.name;

    const bal = acc.balance;
    detailBalance.textContent = fmtMoney(bal);
    detailBalance.className = 'balance ' + (bal >= 0 ? 'positive' : 'negative');

    renderTransactions(acc.transactions);
    detailEmpty.style.display = 'none';
    detailContent.style.display = 'block';

    // Update active state in sidebar
    document.querySelectorAll('.account-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.id) === id);
    });
  } catch (e) {
    showToast('Failed to load account: ' + e.message, true);
  }
}

function renderTransactions(transactions) {
  txList.innerHTML = '';
  if (!transactions.length) {
    txList.innerHTML = '<li class="placeholder">No transactions yet.</li>';
    return;
  }
  for (const tx of transactions) {
    const li = document.createElement('li');
    li.className = 'tx-item';
    const amtClass = tx.amount >= 0 ? 'positive' : 'negative';
    li.innerHTML = `
      <div class="tx-left">
        <span class="tx-desc">${escHtml(tx.description)}</span>
        <span class="tx-date">${fmtDate(tx.created_at)}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount ${amtClass}">${fmtMoney(tx.amount)}</span>
        <button class="btn-icon" title="Delete" data-txid="${tx.id}">🗑</button>
      </div>
    `;
    li.querySelector('.btn-icon').addEventListener('click', () => deleteTransaction(tx.id));
    txList.appendChild(li);
  }
}

// ── Add transaction ────────────────────────────────────────────────────────
addTxBtn.addEventListener('click', async () => {
  const amount = parseFloat(txAmount.value);
  const description = txDescription.value.trim();

  if (!description) { showToast('Please enter a description.', true); return; }
  if (isNaN(amount) || amount === 0) { showToast('Please enter a non-zero amount.', true); return; }

  try {
    await apiFetch(`/accounts/${currentAccountId}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
    txAmount.value = '';
    txDescription.value = '';
    showToast(amount >= 0 ? '✅ Deposit added' : '💸 Expense recorded');
    await loadAccounts();
    await openAccount(currentAccountId);
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
});

// ── Delete transaction ─────────────────────────────────────────────────────
async function deleteTransaction(txId) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await apiFetch(`/accounts/${currentAccountId}/transactions/${txId}`, { method: 'DELETE' });
    showToast('Transaction deleted');
    await loadAccounts();
    await openAccount(currentAccountId);
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
}

// ── Delete account ─────────────────────────────────────────────────────────
deleteAccountBtn.addEventListener('click', async () => {
  if (!confirm('Delete this account and all its transactions?')) return;
  try {
    await apiFetch(`/accounts/${currentAccountId}`, { method: 'DELETE' });
    currentAccountId = null;
    detailEmpty.style.display = 'flex';
    detailContent.style.display = 'none';
    showToast('Account deleted');
    await loadAccounts();
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
});

// ── Create account modal ───────────────────────────────────────────────────
document.getElementById('open-create-modal').addEventListener('click', () => {
  newAccountName.value = '';
  modalOverlay.classList.add('open');
  newAccountName.focus();
});

document.getElementById('cancel-modal').addEventListener('click', () => {
  modalOverlay.classList.remove('open');
});

document.getElementById('confirm-create').addEventListener('click', createAccount);

newAccountName.addEventListener('keydown', e => {
  if (e.key === 'Enter') createAccount();
});

async function createAccount() {
  const name = newAccountName.value.trim();
  if (!name) { showToast('Please enter a name.', true); return; }
  try {
    const acc = await apiFetch('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    modalOverlay.classList.remove('open');
    showToast('Account created!');
    await loadAccounts();
    openAccount(acc.id);
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
}

// ── Escape HTML to prevent XSS ─────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Boot ───────────────────────────────────────────────────────────────────
loadAccounts();
