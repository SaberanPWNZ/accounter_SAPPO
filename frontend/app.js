/* Accounter SAPPO – frontend logic (KISS: no framework, plain fetch API) */

const API = '/api';

// ── State ─────────────────────────────────────────────────────────────────
let currentAccountId = null;
let chartDaily   = null;
let chartMonthly = null;
let chartCat     = null;
let allTransactions = [];

// ── DOM refs ──────────────────────────────────────────────────────────────
const accountList      = document.getElementById('account-list');
const detailEmpty      = document.getElementById('detail-empty');
const detailContent    = document.getElementById('detail-content');
const detailName       = document.getElementById('detail-name');
const detailBalance    = document.getElementById('detail-balance');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const txListExpenses   = document.getElementById('tx-list-expenses');
const txListIncome     = document.getElementById('tx-list-income');
const txAmount             = document.getElementById('tx-amount');
const txDescription        = document.getElementById('tx-description');
const txDate               = document.getElementById('tx-date');
const txCategory           = document.getElementById('tx-category');
const txCardNumber         = document.getElementById('tx-card-number');
const txIsPaid             = document.getElementById('tx-is-paid');
const txParticipantSelect  = document.getElementById('tx-participant-select');
const txContributorSelect  = document.getElementById('tx-contributor-select');
const txSpenderSelect      = document.getElementById('tx-spender-select');
const participantsTags     = document.getElementById('participants-tags');
const expenseExtraFields   = document.getElementById('expense-extra-fields');
const incomeExtraFields    = document.getElementById('income-extra-fields');
const addTxBtn             = document.getElementById('add-tx-btn');
const modalOverlay         = document.getElementById('modal-overlay');
const newAccountName       = document.getElementById('new-account-name');
const categoryRow          = document.getElementById('category-row');

let isExpenseMode = true;
let participants = [];

document.getElementById('toggle-expense').addEventListener('click', () => {
  isExpenseMode = true;
  document.getElementById('toggle-expense').classList.add('active');
  document.getElementById('toggle-income').classList.remove('active');
  expenseExtraFields.classList.remove('hidden');
  incomeExtraFields.classList.add('hidden');
  categoryRow.classList.remove('hidden');
});

document.getElementById('toggle-income').addEventListener('click', () => {
  isExpenseMode = false;
  document.getElementById('toggle-income').classList.add('active');
  document.getElementById('toggle-expense').classList.remove('active');
  expenseExtraFields.classList.add('hidden');
  incomeExtraFields.classList.remove('hidden');
  categoryRow.classList.add('hidden');
});

document.getElementById('add-participant-btn').addEventListener('click', addParticipant);

function addParticipant() {
  const sel = txParticipantSelect;
  const name = sel.value;
  if (!name || participants.includes(name)) return;
  participants.push(name);
  renderParticipantTags();
}

function removeParticipant(index) {
  participants.splice(index, 1);
  renderParticipantTags();
}

function renderParticipantTags() {
  participantsTags.innerHTML = participants.map((p, i) =>
    `<span class="participant-tag">${escHtml(p)} <button type="button" onclick="removeParticipant(${i})">&times;</button></span>`
  ).join('');
}
window.removeParticipant = removeParticipant;

// ── Toast ──────────────────────────────────────────────────────────────────
const toastEl = (() => {
  const el = document.createElement('div');
  el.id = 'toast';
  document.body.appendChild(el);
  return el;
})();

function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.style.background = isError ? '#991b1b' : '';
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
    await loadMembers();
    await loadCategorySelect();
    await loadContributions();

    document.querySelectorAll('.account-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.id) === id);
    });
  } catch (e) {
    showToast('Failed to load account: ' + e.message, true);
  }
}

let accountMembers = [];

async function loadMembers() {
  const accountId = currentAccountId || document.getElementById('members-account-select').value;
  if (!accountId) return;
  try {
    accountMembers = await apiFetch(`/accounts/${accountId}/members`);
    renderMembersList();
    populateMemberSelects();
  } catch (e) {
    showToast('Failed to load members: ' + e.message, true);
  }
}

function renderMembersList() {
  const list = document.getElementById('members-list');
  list.innerHTML = '';
  if (!accountMembers.length) {
    list.innerHTML = '<li class="placeholder">No members yet.</li>';
    return;
  }
  const accountId = document.getElementById('members-account-select').value || currentAccountId;
  for (const m of accountMembers) {
    const li = document.createElement('li');
    li.className = 'member-item';
    li.innerHTML = `
      <div class="member-info">
        <span class="member-name">${escHtml(m.name)}</span>
        ${m.card_number ? `<span class="member-card">💳 ${escHtml(m.card_number)}</span>` : ''}
      </div>
      <div class="member-actions">
        <button class="btn-icon" title="Edit">✏️</button>
        <button class="btn-icon" title="Delete">🗑</button>
      </div>
    `;
    const editBtn = li.querySelectorAll('.btn-icon')[0];
    const deleteBtn = li.querySelectorAll('.btn-icon')[1];
    editBtn.addEventListener('click', () => startEditMember(li, m, accountId));
    deleteBtn.addEventListener('click', () => deleteMember(m.id));
    list.appendChild(li);
  }
}

function startEditMember(li, member, accountId) {
  const infoDiv = li.querySelector('.member-info');
  const actionsDiv = li.querySelector('.member-actions');

  infoDiv.innerHTML = `
    <input type="text" class="edit-member-input" value="${escHtml(member.name)}" placeholder="Name" />
    <input type="text" class="edit-member-input" value="${member.card_number ? escHtml(member.card_number) : ''}" placeholder="Card number" style="margin-top:.25rem" />
  `;
  const nameInput = infoDiv.querySelectorAll('input')[0];
  const cardInput = infoDiv.querySelectorAll('input')[1];
  nameInput.focus();

  actionsDiv.innerHTML = `
    <button class="btn btn-primary btn-sm" title="Save">✓</button>
    <button class="btn btn-secondary btn-sm" title="Cancel">✕</button>
  `;
  const saveBtn = actionsDiv.querySelectorAll('button')[0];
  const cancelBtn = actionsDiv.querySelectorAll('button')[1];

  const save = async () => {
    const newName = nameInput.value.trim();
    if (!newName) { showToast('Name cannot be empty', true); return; }
    try {
      await apiFetch(`/accounts/${accountId}/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName, card_number: cardInput.value.trim() || null }),
      });
      showToast('Member updated');
      await loadMembersForPage(accountId);
      if (accountId == currentAccountId) {
        populateMemberSelects();
        applyFilters();
      }
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  };

  saveBtn.addEventListener('click', save);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  cardInput.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  cancelBtn.addEventListener('click', () => {
    const aid = document.getElementById('members-account-select').value || currentAccountId;
    loadMembersForPage(aid);
  });
}

function populateMemberSelects() {
  const selects = [txParticipantSelect, txContributorSelect, txSpenderSelect];
  for (const sel of selects) {
    const val = sel.value;
    const firstOpt = sel.options[0]?.textContent || 'Select...';
    sel.innerHTML = `<option value="">${firstOpt}</option>`;
    for (const m of accountMembers) {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      sel.appendChild(opt);
    }
    sel.value = val;
  }
}

async function initMembersPage() {
  const sel = document.getElementById('members-account-select');
  try {
    const accounts = await apiFetch('/accounts');
    const prev = sel.value;
    sel.innerHTML = '<option value="">Select account...</option>';
    for (const a of accounts) {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    }
    if (currentAccountId) sel.value = currentAccountId;
    else sel.value = prev;
    if (sel.value) {
      document.getElementById('members-content').classList.remove('hidden');
      document.getElementById('members-empty').classList.add('hidden');
      await loadMembersForPage(sel.value);
    }
  } catch (_) {}
}

async function loadMembersForPage(accountId) {
  try {
    accountMembers = await apiFetch(`/accounts/${accountId}/members`);
    renderMembersList();
  } catch (e) {
    showToast('Failed to load members: ' + e.message, true);
  }
}

document.getElementById('members-account-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  if (id) {
    document.getElementById('members-content').classList.remove('hidden');
    document.getElementById('members-empty').classList.add('hidden');
    await loadMembersForPage(id);
  } else {
    document.getElementById('members-content').classList.add('hidden');
    document.getElementById('members-empty').classList.remove('hidden');
  }
});

document.getElementById('add-member-btn').addEventListener('click', async () => {
  const nameInput = document.getElementById('member-name');
  const cardInput = document.getElementById('member-card');
  const name = nameInput.value.trim();
  const accountId = document.getElementById('members-account-select').value || currentAccountId;
  if (!name) { showToast('Enter member name', true); return; }
  if (!accountId) { showToast('Select an account first', true); return; }
  try {
    await apiFetch(`/accounts/${accountId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name, card_number: cardInput.value.trim() || null }),
    });
    nameInput.value = '';
    cardInput.value = '';
    await loadMembersForPage(accountId);
    if (accountId == currentAccountId) {
      populateMemberSelects();
      applyFilters();
    }
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
});

async function deleteMember(id) {
  if (!confirm('Delete this member?')) return;
  const accountId = document.getElementById('members-account-select').value || currentAccountId;
  try {
    await apiFetch(`/accounts/${accountId}/members/${id}`, { method: 'DELETE' });
    await loadMembersForPage(accountId);
    if (accountId == currentAccountId) {
      populateMemberSelects();
      applyFilters();
    }
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
}

async function loadContributions() {
  if (!currentAccountId) return;
  const yearSel = document.getElementById('contrib-year');
  const monthSel = document.getElementById('contrib-month');
  const now = new Date();
  if (!yearSel.options.length) {
    for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    }
  }
  const year = yearSel.value || now.getFullYear();
  const month = monthSel.value;
  try {
    let data = await apiFetch(`/stats/contributions?year=${year}&account_id=${currentAccountId}`);
    if (month) {
      data = data.filter(m => m.month === parseInt(month));
    }
    renderContributions(data);
  } catch (e) {
    document.getElementById('contributions-content').innerHTML =
      '<p class="placeholder">Failed to load contributions.</p>';
  }
}

function renderContributions(data) {
  const wrap = document.getElementById('contributions-content');
  if (!data.length) {
    wrap.innerHTML = '<p class="placeholder">No contributions this year.</p>';
    return;
  }
  const allNames = new Set();
  for (const m of data) for (const c of m.contributors) allNames.add(c.name);
  const names = [...allNames].sort();

  let html = '<div class="contributions-table-wrap"><table class="contributions-table"><thead><tr><th>Month</th>';
  for (const n of names) html += `<th>${escHtml(n)}</th>`;
  html += '<th>Total</th></tr></thead><tbody>';

  const grandTotals = {};
  for (const n of names) grandTotals[n] = 0;
  let grandTotal = 0;

  for (const m of data) {
    html += `<tr><td class="month-cell">${escHtml(m.month_name)}</td>`;
    const byName = {};
    for (const c of m.contributors) byName[c.name] = c.amount;
    for (const n of names) {
      const val = byName[n] || 0;
      grandTotals[n] += val;
      html += `<td class="${val > 0 ? 'positive' : 'zero'}">${val > 0 ? '+' + val.toFixed(2) : '\u2014'}</td>`;
    }
    grandTotal += m.total;
    html += `<td class="total-cell positive">+${m.total.toFixed(2)}</td></tr>`;
  }

  html += '<tr class="grand-total-row"><td>Total</td>';
  for (const n of names) {
    html += `<td class="positive">+${grandTotals[n].toFixed(2)}</td>`;
  }
  html += `<td class="total-cell positive">+${grandTotal.toFixed(2)}</td></tr>`;
  html += '</tbody></table></div>';
  wrap.innerHTML = html;
}

document.getElementById('contrib-refresh').addEventListener('click', loadContributions);
document.getElementById('contrib-month').addEventListener('change', loadContributions);

function renderTransactions(transactions) {
  allTransactions = transactions;
  populateFilterCategorySelect(transactions);
  applyFilters();
}

function populateFilterCategorySelect(transactions) {
  const sel = document.getElementById('filter-expense-category');
  const prev = sel.value;
  const cats = new Set();
  for (const tx of transactions) {
    if (tx.category) cats.add(tx.category);
  }
  sel.innerHTML = '<option value="">All categories</option>';
  for (const c of [...cats].sort()) {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }
  sel.value = prev;
}

function applyFilters() {
  const expSearch = (document.getElementById('filter-expense-search').value || '').toLowerCase();
  const expCat    = document.getElementById('filter-expense-category').value;
  const expPaid   = document.getElementById('filter-expense-paid').value;
  const expFrom   = document.getElementById('filter-expense-from').value;
  const expTo     = document.getElementById('filter-expense-to').value;
  const incSearch = (document.getElementById('filter-income-search').value || '').toLowerCase();
  const incFrom   = document.getElementById('filter-income-from').value;
  const incTo     = document.getElementById('filter-income-to').value;

  let expenses = allTransactions.filter(tx => tx.amount < 0);
  let income   = allTransactions.filter(tx => tx.amount >= 0);

  if (expSearch) expenses = expenses.filter(tx =>
    tx.description.toLowerCase().includes(expSearch) ||
    (tx.category || '').toLowerCase().includes(expSearch) ||
    (tx.contributor_name || '').toLowerCase().includes(expSearch)
  );
  if (expCat) expenses = expenses.filter(tx => tx.category === expCat);
  if (expPaid === 'paid') expenses = expenses.filter(tx => tx.is_paid);
  if (expPaid === 'unpaid') expenses = expenses.filter(tx => !tx.is_paid);
  if (expFrom) expenses = expenses.filter(tx => tx.created_at.slice(0, 10) >= expFrom);
  if (expTo)   expenses = expenses.filter(tx => tx.created_at.slice(0, 10) <= expTo);

  if (incSearch) income = income.filter(tx =>
    tx.description.toLowerCase().includes(incSearch) ||
    (tx.contributor_name || '').toLowerCase().includes(incSearch)
  );
  if (incFrom) income = income.filter(tx => tx.created_at.slice(0, 10) >= incFrom);
  if (incTo)   income = income.filter(tx => tx.created_at.slice(0, 10) <= incTo);

  renderTxColumn(txListExpenses, expenses, 'No expenses yet.');
  renderTxColumn(txListIncome, income, 'No income yet.');
}

['filter-expense-search','filter-expense-category','filter-expense-paid','filter-expense-from','filter-expense-to',
 'filter-income-search','filter-income-from','filter-income-to'
].forEach(id => {
  document.getElementById(id).addEventListener('input', applyFilters);
  document.getElementById(id).addEventListener('change', applyFilters);
});

function renderTxColumn(list, transactions, emptyMsg) {
  list.innerHTML = '';
  if (!transactions.length) {
    list.innerHTML = `<li class="placeholder">${emptyMsg}</li>`;
    return;
  }
  for (const tx of transactions) {
    const li = document.createElement('li');
    li.className = 'tx-item';
    const amtClass = tx.amount >= 0 ? 'positive' : 'negative';
    const paidBadge = tx.is_expense && !tx.is_paid ? '<span class="badge badge-unpaid">unpaid</span>' : '';
    const participantsHtml = tx.participants && tx.participants.length
      ? `<span class="tx-participants">👥 ${tx.participants.map(p => escHtml(p.name)).join(', ')}</span>` : '';
    const cardHtml = tx.card_number ? `<span class="tx-card">💳 ${escHtml(tx.card_number)}</span>` : '';
    const contribHtml = tx.contributor_name ? `<span class="tx-contributor">👤 ${escHtml(tx.contributor_name)}</span>` : '';
    const spenderHtml = tx.spender_name ? `<span class="tx-contributor">🧑 ${escHtml(tx.spender_name)}</span>` : '';

    const spenderSelectHtml = tx.is_expense ? (() => {
      const opts = accountMembers.map(m =>
        `<option value="${escHtml(m.name)}" ${m.name === tx.spender_name ? 'selected' : ''}>${escHtml(m.name)}</option>`
      ).join('');
      return `<select class="spender-inline-sel" title="Who spent?"><option value="">${tx.spender_name ? '🧑 ' + escHtml(tx.spender_name) : '🧑 Who spent?'}</option>${opts}</select>`;
    })() : '';

    li.innerHTML = `
      <div class="tx-left">
        <span class="tx-desc">${escHtml(tx.description)} ${paidBadge}</span>
        <span class="tx-date">${fmtDate(tx.created_at)}${tx.category ? ` · <em>${escHtml(tx.category)}</em>` : ''}</span>
        ${participantsHtml}${cardHtml}${contribHtml}
      </div>
      <div class="tx-right">
        ${spenderSelectHtml}
        <span class="tx-amount ${amtClass}">${fmtMoney(tx.amount)}</span>
        <button class="btn-icon btn-edit-tx" title="Edit">✏️</button>
        <button class="btn-icon btn-delete-tx" title="Delete" data-txid="${tx.id}">🗑</button>
      </div>
    `;

    if (tx.is_expense) {
      li.querySelector('.spender-inline-sel').addEventListener('change', async (e) => {
        const spenderName = e.target.value || null;
        try {
          await apiFetch(`/accounts/${currentAccountId}/transactions/${tx.id}`, {
            method: 'PUT',
            body: JSON.stringify({
              amount: tx.amount,
              description: tx.description,
              category: tx.category,
              is_expense: tx.is_expense,
              is_paid: tx.is_paid,
              card_number: tx.card_number,
              contributor_name: tx.contributor_name,
              spender_name: spenderName,
              created_at: tx.created_at,
            }),
          });
          tx.spender_name = spenderName;
          e.target.options[0].textContent = spenderName ? '🧑 ' + spenderName : '🧑 Who spent?';
        } catch (err) {
          showToast('Error: ' + err.message, true);
        }
      });
    }

    li.querySelector('.btn-edit-tx').addEventListener('click', () => startEditTransaction(li, tx));
    li.querySelector('.btn-delete-tx').addEventListener('click', () => deleteTransaction(tx.id));
    list.appendChild(li);
  }
}

async function startEditTransaction(li, tx) {
  let cats = [];
  try {
    cats = await apiFetch(`/accounts/${currentAccountId}/categories`);
  } catch (_) {}

  const isExp = tx.is_expense;
  const dateVal = tx.created_at ? tx.created_at.slice(0, 10) : '';
  const catOptions = cats.map(c =>
    `<option value="${escHtml(c.name)}" ${c.name === tx.category ? 'selected' : ''}>${escHtml(c.name)}</option>`
  ).join('');

  const spenderOptions = accountMembers.map(m =>
    `<option value="${escHtml(m.name)}" ${m.name === tx.spender_name ? 'selected' : ''}>${escHtml(m.name)}</option>`
  ).join('');

  li.className = 'tx-item';
  li.style.flexDirection = 'column';
  li.style.alignItems = 'stretch';
  li.innerHTML = `
    <div class="tx-edit-form">
      <div class="form-row">
        <input type="number" value="${Math.abs(tx.amount)}" step="0.01" min="0.01" placeholder="Amount" />
        <input type="text" value="${escHtml(tx.description)}" placeholder="Description" />
        <input type="text" class="edit-tx-date" value="${dateVal}" placeholder="📅 Date" readonly />
      </div>
      ${isExp ? `
      <div class="form-row">
        <select class="edit-tx-cat">
          <option value="">Category</option>
          ${catOptions}
        </select>
        <select class="edit-tx-spender">
          <option value="">Who spent?</option>
          ${spenderOptions}
        </select>
      </div>
      <div class="form-row">
        <input type="text" value="${tx.card_number ? escHtml(tx.card_number) : ''}" placeholder="Card number" />
      </div>
      <label class="checkbox-label">
        <input type="checkbox" ${tx.is_paid ? 'checked' : ''} />
        <span>Paid</span>
      </label>
      ` : `
      <div class="form-row">
        <input type="text" value="${tx.contributor_name ? escHtml(tx.contributor_name) : ''}" placeholder="Contributor" />
      </div>
      `}
      <div class="tx-edit-actions">
        <button class="btn btn-primary btn-sm">✓ Save</button>
        <button class="btn btn-secondary btn-sm">✕ Cancel</button>
      </div>
    </div>
  `;

  const inputs = li.querySelectorAll('.form-row input, .form-row select');
  const amountInput = inputs[0];
  const descInput = inputs[1];
  const dateInput = inputs[2];

  flatpickr(li.querySelector('.edit-tx-date'), { ...fpConfig, defaultDate: dateVal || null });

  let categoryVal = tx.category || '';
  let cardVal = tx.card_number || '';
  let isPaidVal = tx.is_paid;
  let contributorVal = tx.contributor_name || '';
  let spenderVal = tx.spender_name || '';

  if (isExp) {
    const catSelect = li.querySelector('.edit-tx-cat');
    const spenderSelect = li.querySelector('.edit-tx-spender');
    const cardInput = li.querySelector('input[placeholder="Card number"]');
    const paidCheckbox = li.querySelector('.checkbox-label input[type="checkbox"]');
    categoryVal = catSelect.value;
    spenderVal = spenderSelect.value;
    catSelect.addEventListener('change', () => { categoryVal = catSelect.value; });
    spenderSelect.addEventListener('change', () => { spenderVal = spenderSelect.value; });
    cardInput.addEventListener('input', () => { cardVal = cardInput.value; });
    paidCheckbox.addEventListener('change', () => { isPaidVal = paidCheckbox.checked; });
  } else {
    const contribInput = inputs[3];
    contribInput.addEventListener('input', () => { contributorVal = contribInput.value; });
  }

  const saveBtn = li.querySelector('.tx-edit-actions .btn-primary');
  const cancelBtn = li.querySelector('.tx-edit-actions .btn-secondary');

  const save = async () => {
    let amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount === 0) { showToast('Enter a valid amount', true); return; }
    if (isExp) amount = -Math.abs(amount);
    else amount = Math.abs(amount);

    if (isExp) {
      categoryVal = li.querySelector('.edit-tx-cat').value;
      spenderVal = li.querySelector('.edit-tx-spender').value;
      cardVal = li.querySelector('input[placeholder="Card number"]')?.value || '';
      isPaidVal = li.querySelector('.checkbox-label input[type="checkbox"]')?.checked ?? true;
    } else {
      contributorVal = li.querySelectorAll('.form-row input')[3]?.value || '';
    }

    const body = {
      amount,
      description: descInput.value.trim(),
      category: isExp ? categoryVal : '',
      is_expense: isExp,
      is_paid: isExp ? isPaidVal : true,
      card_number: isExp ? (cardVal.trim() || null) : null,
      contributor_name: !isExp ? (contributorVal.trim() || null) : null,
      spender_name: isExp ? (spenderVal.trim() || null) : null,
      created_at: dateInput.value ? new Date(dateInput.value + 'T12:00:00').toISOString() : null,
    };

    try {
      await apiFetch(`/accounts/${currentAccountId}/transactions/${tx.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      showToast('Transaction updated');
      await loadAccounts();
      await openAccount(currentAccountId);
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  };

  saveBtn.addEventListener('click', save);
  cancelBtn.addEventListener('click', async () => {
    await openAccount(currentAccountId);
  });
}

// ── Add transaction ────────────────────────────────────────────────────────
addTxBtn.addEventListener('click', async () => {
  let amount = parseFloat(txAmount.value);
  const description = txDescription.value.trim();
  const category = txCategory.value;

  if (isNaN(amount) || amount === 0) { showToast('Please enter a non-zero amount.', true); return; }

  if (isExpenseMode) amount = -Math.abs(amount);
  else amount = Math.abs(amount);

  const body = {
    amount,
    description,
    category: isExpenseMode ? category : '',
    is_expense: isExpenseMode,
    is_paid: isExpenseMode ? txIsPaid.checked : true,
    card_number: isExpenseMode ? (txCardNumber.value.trim() || null) : null,
    contributor_name: !isExpenseMode ? (txContributorSelect.value || null) : null,
    spender_name: isExpenseMode ? (txSpenderSelect.value || null) : null,
    created_at: txDate.value ? new Date(txDate.value + 'T12:00:00').toISOString() : null,
    participants: participants.map(name => ({ name })),
  };

  try {
    await apiFetch(`/accounts/${currentAccountId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    txAmount.value = '';
    txDescription.value = '';
    txCategory.value = '';
    txCardNumber.value = '';
    txDate.value = '';
    txIsPaid.checked = true;
    txContributorSelect.value = '';
    txSpenderSelect.value = '';
    participants = [];
    renderParticipantTags();
    showToast(isExpenseMode ? '💸 Expense recorded' : '✅ Deposit added');
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
  '#818cf8','#34d399','#f87171','#fbbf24','#22d3ee','#a78bfa',
  '#f472b6','#2dd4bf','#fb923c','#6366f1','#a3e635','#5eead4',
];

const CHART_DEFAULTS = {
  color: '#94a3b8',
  borderColor: '#2a2e3f',
};
Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;

// ── Navigation ────────────────────────────────────────────────────────────
const pageAccounts    = document.getElementById('page-accounts');
const pageMembers     = document.getElementById('page-members');
const pageCategories  = document.getElementById('page-categories');
const pageStats       = document.getElementById('page-stats');
const navAccounts     = document.getElementById('nav-accounts');
const navMembers      = document.getElementById('nav-members');
const navCategories   = document.getElementById('nav-categories');
const navStats        = document.getElementById('nav-stats');

const allPages = [pageAccounts, pageMembers, pageCategories, pageStats];
const allNavs  = [navAccounts, navMembers, navCategories, navStats];

function switchPage(page, nav) {
  allPages.forEach(p => { p.style.display = 'none'; p.classList.add('hidden'); });
  allNavs.forEach(n => n.classList.remove('active'));
  page.style.display = '';
  page.classList.remove('hidden');
  nav.classList.add('active');
}

navAccounts.addEventListener('click', () => {
  switchPage(pageAccounts, navAccounts);
});

navMembers.addEventListener('click', async () => {
  switchPage(pageMembers, navMembers);
  await initMembersPage();
});

navCategories.addEventListener('click', async () => {
  switchPage(pageCategories, navCategories);
  await initCategoriesPage();
});

navStats.addEventListener('click', async () => {
  switchPage(pageStats, navStats);
  pageStats.style.display = 'flex';
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
        { label: 'Income',   data: incomes,  backgroundColor: 'rgba(52,211,153,.4)', borderColor: '#34d399', borderWidth: 1, borderRadius: 4 },
        { label: 'Expenses', data: expenses, backgroundColor: 'rgba(248,113,113,.4)', borderColor: '#f87171', borderWidth: 1, borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#2a2e3f' }, ticks: { color: '#64748b' } },
        x: { grid: { color: 'transparent' }, ticks: { color: '#64748b' } },
      },
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
        { label: 'Income',   data: incomes,  backgroundColor: 'rgba(52,211,153,.4)', borderColor: '#34d399', borderWidth: 1, borderRadius: 4 },
        { label: 'Expenses', data: expenses, backgroundColor: 'rgba(248,113,113,.4)', borderColor: '#f87171', borderWidth: 1, borderRadius: 4 },
        { label: 'Net',      data: nets,     type: 'line', borderColor: '#818cf8', backgroundColor: 'rgba(99,102,241,.08)', fill: true, tension: .3, pointRadius: 4, pointBackgroundColor: '#818cf8' },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: false, grid: { color: '#2a2e3f' }, ticks: { color: '#64748b' } },
        x: { grid: { color: 'transparent' }, ticks: { color: '#64748b' } },
      },
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

// ── Category select (transaction form) ─────────────────────────────────────
async function loadCategorySelect() {
  if (!currentAccountId) return;
  try {
    const cats = await apiFetch(`/accounts/${currentAccountId}/categories`);
    const prev = txCategory.value;
    txCategory.innerHTML = '<option value="">Category (optional)</option>';
    for (const c of cats) {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      txCategory.appendChild(opt);
    }
    txCategory.value = prev;
  } catch (_) {}
}

// ── Categories page ────────────────────────────────────────────────────────
let categoriesAccountId = null;

async function initCategoriesPage() {
  const sel = document.getElementById('categories-account-select');
  try {
    const accounts = await apiFetch('/accounts');
    const prev = sel.value;
    sel.innerHTML = '<option value="">Select account...</option>';
    for (const a of accounts) {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      sel.appendChild(opt);
    }
    if (currentAccountId) sel.value = currentAccountId;
    else sel.value = prev;
    if (sel.value) {
      categoriesAccountId = sel.value;
      document.getElementById('categories-content').classList.remove('hidden');
      document.getElementById('categories-empty').classList.add('hidden');
      await loadCategoriesForPage(sel.value);
    }
  } catch (_) {}
}

async function loadCategoriesForPage(accountId) {
  try {
    const cats = await apiFetch(`/accounts/${accountId}/categories`);
    renderCategoriesList(cats, accountId);
  } catch (e) {
    showToast('Failed to load categories: ' + e.message, true);
  }
}

function renderCategoriesList(cats, accountId) {
  const list = document.getElementById('categories-list');
  list.innerHTML = '';
  if (!cats.length) {
    list.innerHTML = '<li class="placeholder">No categories yet.</li>';
    return;
  }
  for (const c of cats) {
    const li = document.createElement('li');
    li.className = 'category-item';
    li.innerHTML = `
      <div class="category-info">
        <span class="category-name">${escHtml(c.name)}</span>
      </div>
      <div class="category-actions">
        <button class="btn-icon" title="Edit">✏️</button>
        <button class="btn-icon" title="Delete">🗑</button>
      </div>
    `;
    const editBtn = li.querySelectorAll('.btn-icon')[0];
    const deleteBtn = li.querySelectorAll('.btn-icon')[1];
    editBtn.addEventListener('click', () => startEditCategory(li, c, accountId));
    deleteBtn.addEventListener('click', () => deleteCategory(c.id, accountId));
    list.appendChild(li);
  }
}

function startEditCategory(li, cat, accountId) {
  const nameSpan = li.querySelector('.category-name');
  const actionsDiv = li.querySelector('.category-actions');
  const input = document.createElement('input');
  input.type = 'text';
  input.value = cat.name;
  input.className = 'edit-category-input';
  nameSpan.replaceWith(input);
  input.focus();

  actionsDiv.innerHTML = `
    <button class="btn btn-primary btn-sm" title="Save">✓</button>
    <button class="btn btn-secondary btn-sm" title="Cancel">✕</button>
  `;
  const saveBtn = actionsDiv.querySelectorAll('button')[0];
  const cancelBtn = actionsDiv.querySelectorAll('button')[1];

  const save = async () => {
    const newName = input.value.trim();
    if (!newName) { showToast('Category name cannot be empty', true); return; }
    try {
      await apiFetch(`/accounts/${accountId}/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newName }),
      });
      showToast('Category updated');
      await loadCategoriesForPage(accountId);
      if (accountId == currentAccountId) await loadCategorySelect();
    } catch (e) {
      showToast('Error: ' + e.message, true);
    }
  };

  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  cancelBtn.addEventListener('click', () => loadCategoriesForPage(accountId));
}

async function deleteCategory(catId, accountId) {
  if (!confirm('Delete this category?')) return;
  try {
    await apiFetch(`/accounts/${accountId}/categories/${catId}`, { method: 'DELETE' });
    showToast('Category deleted');
    await loadCategoriesForPage(accountId);
    if (accountId == currentAccountId) await loadCategorySelect();
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
}

document.getElementById('categories-account-select').addEventListener('change', async (e) => {
  const id = e.target.value;
  categoriesAccountId = id;
  if (id) {
    document.getElementById('categories-content').classList.remove('hidden');
    document.getElementById('categories-empty').classList.add('hidden');
    await loadCategoriesForPage(id);
  } else {
    document.getElementById('categories-content').classList.add('hidden');
    document.getElementById('categories-empty').classList.remove('hidden');
  }
});

document.getElementById('add-category-btn').addEventListener('click', async () => {
  const input = document.getElementById('category-name-input');
  const name = input.value.trim();
  const accountId = categoriesAccountId;
  if (!name) { showToast('Enter category name', true); return; }
  if (!accountId) { showToast('Select an account first', true); return; }
  try {
    await apiFetch(`/accounts/${accountId}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    input.value = '';
    showToast('Category added');
    await loadCategoriesForPage(accountId);
    if (accountId == currentAccountId) await loadCategorySelect();
  } catch (e) {
    showToast('Error: ' + e.message, true);
  }
});

// ── Flatpickr init ─────────────────────────────────────────────────────────
const fpConfig = {
  dateFormat: 'Y-m-d',
  altInput: true,
  altFormat: 'M j, Y',
  theme: 'dark',
  allowInput: false,
  disableMobile: true,
};

flatpickr('#tx-date', { ...fpConfig, placeholder: '📅 Date' });
flatpickr('#filter-expense-from', fpConfig);
flatpickr('#filter-expense-to', fpConfig);
flatpickr('#filter-income-from', fpConfig);
flatpickr('#filter-income-to', fpConfig);

// ── Boot ───────────────────────────────────────────────────────────────────
loadAccounts();
