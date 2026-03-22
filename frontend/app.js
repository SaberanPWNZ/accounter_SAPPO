/* Accounter SAPPO – frontend logic (KISS: no framework, plain fetch API) */

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────
let currentAccountId = null;
let chartDaily   = null;
let chartMonthly = null;
let chartCat     = null;

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
const txCategory       = document.getElementById('tx-category');
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
        <span class="tx-date">${fmtDate(tx.created_at)}${tx.category ? ` · <em>${escHtml(tx.category)}</em>` : ''}</span>
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
  const category = txCategory.value.trim();

  if (!description) { showToast('Please enter a description.', true); return; }
  if (isNaN(amount) || amount === 0) { showToast('Please enter a non-zero amount.', true); return; }

  try {
    await apiFetch(`/accounts/${currentAccountId}/transactions`, {
      method: 'POST',
      body: JSON.stringify({ amount, description, category }),
    });
    txAmount.value = '';
    txDescription.value = '';
    txCategory.value = '';
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

// ═══════════════════════════════════════════════════════════════════════════
// ── STATISTICS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════

const CHART_COLORS = [
  '#4f46e5','#16a34a','#ef4444','#f59e0b','#06b6d4','#8b5cf6',
  '#ec4899','#10b981','#f97316','#6366f1','#84cc16','#14b8a6',
];

// ── Navigation ────────────────────────────────────────────────────────────
const pageAccounts = document.getElementById('page-accounts');
const pageStats    = document.getElementById('page-stats');
const navAccounts  = document.getElementById('nav-accounts');
const navStats     = document.getElementById('nav-stats');

navAccounts.addEventListener('click', () => {
  pageAccounts.style.display = '';
  pageStats.style.display = 'none';
  navAccounts.classList.add('active');
  navStats.classList.remove('active');
});

navStats.addEventListener('click', async () => {
  pageAccounts.style.display = 'none';
  pageStats.style.display = 'flex';
  navStats.classList.add('active');
  navAccounts.classList.remove('active');
  await initStatsPage();
});

// ── Stats page initialisation ─────────────────────────────────────────────
async function initStatsPage() {
  // Populate year dropdown
  const yearSel  = document.getElementById('stats-year');
  const monthSel = document.getElementById('stats-month');
  const now = new Date();

  if (!yearSel.options.length) {
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }
  }
  // Default month
  monthSel.value = now.getMonth() + 1;

  // Populate account filter
  const accFilter = document.getElementById('stats-account-filter');
  try {
    const accounts = await apiFetch('/accounts');
    // Remove old options (keep "All accounts")
    while (accFilter.options.length > 1) accFilter.remove(1);
    for (const a of accounts) {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      accFilter.appendChild(opt);
    }
  } catch (_) {}

  await loadStats();
}

document.getElementById('stats-refresh-btn').addEventListener('click', loadStats);

// ── Load & render all stats ────────────────────────────────────────────────
async function loadStats() {
  const year     = parseInt(document.getElementById('stats-year').value);
  const month    = parseInt(document.getElementById('stats-month').value);
  const accId    = document.getElementById('stats-account-filter').value || '';

  const qs = (extra = '') => {
    const p = new URLSearchParams({ year });
    if (accId) p.set('account_id', accId);
    if (extra) extra.split('&').forEach(kv => { const [k,v] = kv.split('='); p.set(k,v); });
    return '?' + p.toString();
  };

  try {
    const [daily, monthly, catData] = await Promise.all([
      apiFetch(`/stats/by-day${qs(`month=${month}`)}`),
      apiFetch(`/stats/by-month${qs()}`),
      apiFetch(`/stats/by-category${qs()}`),
    ]);

    renderSummary(monthly);
    renderDailyChart(daily, year, month);
    renderMonthlyChart(monthly, year);
    renderCategoryChart(catData);
  } catch (e) {
    showToast('Failed to load stats: ' + e.message, true);
  }
}

// ── Summary cards ──────────────────────────────────────────────────────────
function renderSummary(monthly) {
  let income = 0, expenses = 0, count = 0;
  for (const m of monthly) {
    income   += m.income;
    expenses += m.expenses;  // expenses are stored as negative values
    count    += m.count;
  }
  const netBalance = income + expenses;  // net = income + (negative) expenses

  document.getElementById('stat-total-income').textContent   = fmtMoney(income);
  document.getElementById('stat-total-expenses').textContent = fmtMoney(expenses);
  document.getElementById('stat-net').textContent            = fmtMoney(netBalance);
  document.getElementById('stat-tx-count').textContent       = count;

  const netEl = document.getElementById('stat-net');
  netEl.style.color = netBalance >= 0 ? 'var(--green)' : 'var(--red)';
}

// ── Daily bar chart ────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function renderDailyChart(data, year, month) {
  const label = `${MONTH_NAMES[month-1]} ${year}`;
  document.getElementById('daily-period-label').textContent = label;

  const empty = document.getElementById('chart-daily-empty');
  const wrap  = document.querySelector('#chart-daily').parentElement;

  if (!data.length) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  wrap.style.display = '';
  empty.style.display = 'none';

  const labels   = data.map(d => d.date.slice(8));    // day number
  const incomes  = data.map(d => d.income);
  const expenses = data.map(d => Math.abs(d.expenses));

  if (chartDaily) chartDaily.destroy();
  chartDaily = new Chart(document.getElementById('chart-daily'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',   data: incomes,  backgroundColor: '#16a34a88', borderColor: '#16a34a', borderWidth: 1 },
        { label: 'Expenses', data: expenses, backgroundColor: '#ef444488', borderColor: '#ef4444', borderWidth: 1 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ── Monthly bar chart ──────────────────────────────────────────────────────
function renderMonthlyChart(data, year) {
  document.getElementById('monthly-year-label').textContent = year;

  const empty = document.getElementById('chart-monthly-empty');
  const wrap  = document.querySelector('#chart-monthly').parentElement;

  if (!data.length) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  wrap.style.display = '';
  empty.style.display = 'none';

  const labels   = data.map(m => m.month_name);
  const incomes  = data.map(m => m.income);
  const expenses = data.map(m => Math.abs(m.expenses));
  const nets     = data.map(m => m.net);

  if (chartMonthly) chartMonthly.destroy();
  chartMonthly = new Chart(document.getElementById('chart-monthly'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income',   data: incomes,  backgroundColor: '#16a34a88', borderColor: '#16a34a', borderWidth: 1 },
        { label: 'Expenses', data: expenses, backgroundColor: '#ef444488', borderColor: '#ef4444', borderWidth: 1 },
        { label: 'Net',      data: nets,     type: 'line', borderColor: '#4f46e5', backgroundColor: '#4f46e522', fill: true, tension: .3, pointRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: false } },
    },
  });
}

// ── Category doughnut + table ──────────────────────────────────────────────
function renderCategoryChart(data) {
  const empty     = document.getElementById('chart-category-empty');
  const layout    = document.querySelector('.category-layout');
  const tableWrap = document.getElementById('category-table');

  if (!data.length) {
    layout.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  layout.style.display = '';
  empty.style.display = 'none';

  // Separate income vs expense buckets for a clear doughnut
  const labels = data.map(c => c.category);
  const totals = data.map(c => Math.abs(c.total));
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (chartCat) chartCat.destroy();
  chartCat = new Chart(document.getElementById('chart-category'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: totals,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  // Table
  const totalAbs = totals.reduce((a, b) => a + b, 0) || 1;
  tableWrap.innerHTML = `
    <table>
      <thead><tr><th>Category</th><th>Total</th><th>Count</th><th>Share</th></tr></thead>
      <tbody>
        ${data.map((c, i) => `
          <tr>
            <td><span class="cat-dot" style="background:${colors[i]}"></span>${escHtml(c.category)}</td>
            <td style="color:${c.total >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fmtMoney(c.total)}</td>
            <td>${c.count}</td>
            <td>${(Math.abs(c.total) / totalAbs * 100).toFixed(1)}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ── Boot ───────────────────────────────────────────────────────────────────
loadAccounts();
