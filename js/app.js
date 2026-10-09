/**
 * SyndicBloc - Client Application Script
 * Communicates directly with the Relational SQLite/Prisma Backend (/api/v1)
 */

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

let appState = {
  admin: null,
  currentYear: 2026,
  currentMonth: 10,
  currentFilter: 'all',
  searchQuery: '',
  floorOrder: 'top-down', // 'top-down' (7 -> RDC) or 'bottom-up' (RDC -> 7)
  cotisationsData: null,
  expensesData: [],
  statsData: null,
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
  initMonthSelectDropdown();
  lucide.createIcons();

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLoginSubmit(e);
    });
  }

  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePasswordVisibility(e);
    });
  }

  // Check if session cookie is already valid
  await checkActiveSession();
});

// ================= AUTHENTICATION & SECURE FETCH =================
let isRefreshing = false;
let refreshSubscribers = [];

function onTokenRefreshed() {
  refreshSubscribers.forEach(cb => cb());
  refreshSubscribers = [];
}

async function authFetch(url, options = {}) {
  const opts = { ...options, credentials: 'include' };
  let res = await fetch(url, opts);

  if (res.status === 401) {
    if (url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return res;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
        });
        isRefreshing = false;
        if (refreshRes.ok) {
          onTokenRefreshed();
          return await fetch(url, opts);
        } else {
          appState.admin = null;
          showAuthOverlay();
          showToast('Session expirée. Veuillez vous reconnecter.', 'error');
          return res;
        }
      } catch (err) {
        isRefreshing = false;
        appState.admin = null;
        showAuthOverlay();
        return res;
      }
    } else {
      return new Promise((resolve) => {
        refreshSubscribers.push(async () => {
          try {
            resolve(await fetch(url, opts));
          } catch (e) {
            resolve(res);
          }
        });
      });
    }
  }

  return res;
}

async function checkActiveSession() {
  try {
    let res = await fetch('/api/v1/auth/me', { credentials: 'include' });
    if (!res.ok && res.status === 401) {
      const refreshRes = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        res = await fetch('/api/v1/auth/me', { credentials: 'include' });
      }
    }

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.data.admin) {
        setAuthenticatedState(data.data.admin);
        return;
      }
    }
  } catch (err) {
    console.log("No active session found:", err);
  }
  showAuthOverlay();
}

function showAuthOverlay() {
  document.getElementById('auth-overlay').classList.remove('hidden');
}

function hideAuthOverlay() {
  document.getElementById('auth-overlay').classList.add('hidden');
}

function setAuthenticatedState(admin) {
  appState.admin = admin;
  hideAuthOverlay();
  
  const displayName = admin.username || admin.email;
  const emailEl = document.getElementById('user-menu-email');
  if (emailEl) emailEl.textContent = displayName;

  loadMonthData();
  showToast(`Connecté en tant que ${displayName}`, 'success');
}

async function handleLoginSubmit(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const emailInput = document.getElementById('login-email');
  const pwdInput = document.getElementById('login-password');
  const tokenInput = document.getElementById('login-2fa-token');
  const errorBox = document.getElementById('login-error-box');
  const btnText = document.getElementById('btn-login-text');

  const identifier = emailInput ? emailInput.value.trim() : '';
  const password = pwdInput ? pwdInput.value : '';
  const twoFactorToken = tokenInput ? tokenInput.value.trim() : '';

  if (errorBox) errorBox.classList.add('hidden');
  if (btnText) btnText.textContent = 'Vérification...';

  try {
    const payload = { username: identifier, email: identifier, password };
    if (twoFactorToken) payload.twoFactorToken = twoFactorToken;

    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorBox) {
        errorBox.textContent = data.message || 'Erreur lors de la connexion.';
        errorBox.classList.remove('hidden');
      } else {
        showToast(data.message || 'Erreur lors de la connexion.', 'error');
      }
      if (btnText) btnText.textContent = 'Se connecter au Syndic';
      return;
    }

    if (data.require2FA) {
      document.getElementById('login-2fa-container').classList.remove('hidden');
      document.getElementById('login-2fa-token').focus();
      if (btnText) btnText.textContent = 'Confirmer le code 2FA';
      showToast('Veuillez saisir votre code à 6 chiffres 2FA', 'info');
      return;
    }

    // Login successful
    setAuthenticatedState(data.data.admin);
  } catch (err) {
    console.error('Login error:', err);
    if (errorBox) {
      errorBox.textContent = "Erreur de connexion au serveur.";
      errorBox.classList.remove('hidden');
    } else {
      showToast('Erreur de connexion au serveur.', 'error');
    }
  } finally {
    if (btnText) btnText.textContent = 'Se connecter au Syndic';
  }
}

async function quickDemoLogin(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const emailInput = document.getElementById('login-email');
  const pwdInput = document.getElementById('login-password');
  if (emailInput) emailInput.value = 'aymen';
  if (pwdInput) pwdInput.value = 'aymen31';
  await handleLoginSubmit();
}

async function handleLogout() {
  try {
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (e) { /* ignore */ }
  appState.admin = null;
  toggleUserDropdown();
  showAuthOverlay();
  showToast('Déconnexion réussie');
}

function togglePasswordVisibility(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const pwdInput = document.getElementById('login-password');
  const iconOpen = document.getElementById('icon-eye-open');
  const iconClosed = document.getElementById('icon-eye-closed');
  if (!pwdInput) return;

  const willBeText = pwdInput.type === 'password';
  pwdInput.type = willBeText ? 'text' : 'password';

  if (iconOpen && iconClosed) {
    if (willBeText) {
      iconOpen.classList.add('hidden');
      iconClosed.classList.remove('hidden');
    } else {
      iconOpen.classList.remove('hidden');
      iconClosed.classList.add('hidden');
    }
  }
}

function toggleUserDropdown(event) {
  if (event) {
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const menu = document.getElementById('user-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
}

document.addEventListener('click', (e) => {
  const btn = document.getElementById('btn-user-menu');
  const menu = document.getElementById('user-dropdown-menu');
  if (btn && menu && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});

// ================= DATA LOADING (SQLITE/PRISMA) =================
async function loadMonthData() {
  const m = appState.currentMonth;
  const y = appState.currentYear;

  // Sync Month label & select
  const monthLabel = document.getElementById('current-month-label');
  if (monthLabel) monthLabel.textContent = `${MONTH_NAMES[m - 1]} ${y}`;
  const quickSelect = document.getElementById('quick-month-select');
  if (quickSelect) quickSelect.value = `${y}-${m}`;

  try {
    // 1. Fetch Cotisations
    const cotRes = await authFetch(`/api/v1/cotisations?mois=${m}&annee=${y}`);
    if (cotRes.ok) {
      const cotData = await cotRes.json();
      appState.cotisationsData = cotData.data;
    }

    // 2. Fetch Expenses
    const expRes = await authFetch(`/api/v1/depenses?mois=${m}&annee=${y}`);
    if (expRes.ok) {
      const expData = await expRes.json();
      appState.expensesData = expData.data.depenses || [];
    }

    // 3. Fetch Aggregated Stats
    const statsRes = await authFetch(`/api/v1/stats?mois=${m}&annee=${y}`);
    if (statsRes.ok) {
      const statsJson = await statsRes.json();
      appState.statsData = statsJson.data;
    }

    renderDashboard();
  } catch (err) {
    showToast("Erreur de chargement des données serveur", 'error');
  }
}

// ================= RENDER DASHBOARD =================
function renderDashboard() {
  if (!appState.cotisationsData) return;

  const summary = appState.cotisationsData.summary;
  const stats = appState.statsData;

  // KPI 1: Cotisations
  document.getElementById('kpi-collected-amount').textContent = `${formatDA(summary.totalCollected)} DA`;
  document.getElementById('kpi-collected-ratio').textContent = `${summary.paidCount} / 24 payés`;
  document.getElementById('kpi-collected-pct').textContent = `${summary.collectionRate}%`;
  document.getElementById('kpi-progress-bar').style.width = `${summary.collectionRate}%`;

  // KPI 2: Dépenses
  const expensesTotal = (stats && stats.month) ? stats.month.expenses : 0;
  const expensesCount = (stats && stats.month) ? stats.month.expensesCount : appState.expensesData.length;
  document.getElementById('kpi-expense-amount').textContent = `${formatDA(expensesTotal)} DA`;
  document.getElementById('kpi-expense-count').textContent = `${expensesCount} dépense${expensesCount > 1 ? 's' : ''} enregistrée${expensesCount > 1 ? 's' : ''}`;
  document.getElementById('header-expense-badge').textContent = `${formatDA(expensesTotal)} DA`;

  // KPI 3: Solde Net
  const netBalance = summary.totalCollected - expensesTotal;
  const netEl = document.getElementById('kpi-net-balance');
  const netStatusEl = document.getElementById('kpi-net-status');
  const netIconBox = document.getElementById('kpi-net-icon-box');

  const sign = netBalance >= 0 ? '+' : '';
  netEl.textContent = `${sign}${formatDA(netBalance)} DA`;

  if (netBalance > 0) {
    netEl.className = "text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight";
    netStatusEl.textContent = "Excédent positif";
    netStatusEl.className = "font-bold text-emerald-600";
    netIconBox.className = "w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100";
  } else if (netBalance < 0) {
    netEl.className = "text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight";
    netStatusEl.textContent = "Déficit du mois";
    netStatusEl.className = "font-bold text-rose-600";
    netIconBox.className = "w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100";
  } else {
    netEl.className = "text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight";
    netStatusEl.textContent = "Équilibré";
    netStatusEl.className = "font-bold text-slate-600";
    netIconBox.className = "w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200";
  }

  // KPI 4: Trésorerie All-Time
  const treasury = (stats && stats.global) ? stats.global.treasury : netBalance;
  const treasEl = document.getElementById('kpi-treasury-total');
  treasEl.textContent = `${formatDA(treasury)} DA`;
  if (treasury < 0) {
    treasEl.className = "text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight";
  } else {
    treasEl.className = "text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight";
  }

  // Filter Counters
  document.getElementById('count-all').textContent = "24";
  document.getElementById('count-unpaid').textContent = summary.unpaidCount;
  document.getElementById('count-paid').textContent = summary.paidCount;

  // Render Building Floors
  renderBuildingFloors();
  updatePrintSheet();
  lucide.createIcons();
}

function formatDA(num) {
  return Number(num || 0).toLocaleString('fr-FR');
}

// ================= RENDER FLOORS & APARTMENTS =================
const FLOORS_DEF = [
  { floor: '7', name: '7ème Étage', aptNumbers: [22, 23, 24] },
  { floor: '6', name: '6ème Étage', aptNumbers: [19, 20, 21] },
  { floor: '5', name: '5ème Étage', aptNumbers: [16, 17, 18] },
  { floor: '4', name: '4ème Étage', aptNumbers: [13, 14, 15] },
  { floor: '3', name: '3ème Étage', aptNumbers: [10, 11, 12] },
  { floor: '2', name: '2ème Étage', aptNumbers: [7, 8, 9] },
  { floor: '1', name: '1er Étage',  aptNumbers: [4, 5, 6] },
  { floor: 'RDC', name: 'RDC (Rez-de-chaussée)', aptNumbers: [1, 2, 3] },
];

function renderBuildingFloors() {
  const container = document.getElementById('building-grid');
  if (!container || !appState.cotisationsData) return;

  const cotisations = appState.cotisationsData.cotisations;
  const cotMap = {};
  cotisations.forEach(c => { cotMap[c.appartement.numero] = c; });

  const floors = [...FLOORS_DEF];
  if (appState.floorOrder === 'bottom-up') floors.reverse();

  const query = (appState.searchQuery || '').trim().toLowerCase();
  let html = '';

  floors.forEach(floorCfg => {
    const floorItems = floorCfg.aptNumbers.map(n => cotMap[n]).filter(Boolean);

    // Apply Filter & Search
    const filteredItems = floorItems.filter(item => {
      if (appState.currentFilter === 'paid' && !item.est_paye) return false;
      if (appState.currentFilter === 'unpaid' && item.est_paye) return false;

      if (query) {
        const name = (item.appartement.nom_resident || '').toLowerCase();
        const numMatch = `appt ${item.appartement.numero}`.includes(query) || `${item.appartement.numero}` === query;
        const floorMatch = floorCfg.name.toLowerCase().includes(query);
        if (!name.includes(query) && !numMatch && !floorMatch) return false;
      }
      return true;
    });

    const floorPaidCount = floorItems.filter(i => i.est_paye).length;
    const floorAllPaid = floorPaidCount === floorItems.length;

    if (filteredItems.length > 0) {
      html += `
        <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all">
          
          <div class="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-3">
              <span class="w-8 h-8 rounded-lg ${floorAllPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'} font-extrabold text-xs flex items-center justify-center">
                ${floorCfg.floor === 'RDC' ? 'RDC' : `É${floorCfg.floor}`}
              </span>
              <div>
                <h3 class="font-bold text-slate-900 text-sm tracking-tight">${floorCfg.name}</h3>
                <span class="text-[11px] text-slate-500">Appartements ${floorCfg.aptNumbers.join(', ')}</span>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                floorAllPaid 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }">
                <i data-lucide="${floorAllPaid ? 'check-circle' : 'clock'}" class="w-3.5 h-3.5"></i>
                <span>${floorPaidCount} / ${floorItems.length} Payés</span>
                <span class="text-[10px] text-slate-400">•</span>
                <span>${(floorItems.length - floorPaidCount) * 500 > 0 ? (floorItems.length - floorPaidCount) * 500 + ' DA dû' : 'Complet'}</span>
              </span>

              <button 
                onclick="handleBulkFloor('${floorCfg.floor}', ${!floorAllPaid})" 
                class="text-xs font-medium text-slate-600 hover:text-emerald-700 hover:underline transition hidden sm:inline"
              >
                ${floorAllPaid ? 'Décocher étage' : 'Tout cocher cet étage'}
              </button>
            </div>
          </div>

          <div class="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            ${filteredItems.map(item => renderApartmentCard(item, floorCfg)).join('')}
          </div>

        </div>
      `;
    }
  });

  container.innerHTML = html;
}

function renderApartmentCard(cotisation, floorCfg) {
  const apt = cotisation.appartement;
  const isPaid = cotisation.est_paye;

  return `
    <div class="apt-card rounded-2xl border ${
      isPaid 
        ? 'border-emerald-200 bg-white hover:border-emerald-400' 
        : 'border-slate-200/90 bg-white hover:border-slate-300'
    } p-4 flex flex-col justify-between shadow-2xs relative overflow-hidden group">
      
      <div>
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center justify-center font-extrabold text-sm px-2.5 py-1 rounded-lg ${
              isPaid ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20' : 'bg-slate-900 text-white'
            }">
              Appt ${apt.numero}
            </span>
            <span class="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              ${floorCfg.floor === 'RDC' ? 'RDC' : `${floorCfg.floor}e`}
            </span>
          </div>

          <div class="flex items-center gap-1">
            <span class="text-xs font-bold ${isPaid ? 'text-emerald-700' : 'text-slate-600'}">
              500 DA
            </span>
          </div>
        </div>

        <div class="mb-4">
          <div class="flex items-start justify-between group/name cursor-pointer" onclick="openEditResidentModal('${apt.id}')">
            <div class="flex-1">
              <h4 class="font-bold text-slate-900 text-sm group-hover/name:text-emerald-700 transition flex items-center gap-1.5">
                <span>${apt.nom_resident}</span>
                <i data-lucide="edit-2" class="w-3 h-3 text-slate-400 group-hover/name:text-emerald-600 opacity-60"></i>
              </h4>
              <p class="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                ${apt.telephone ? `<span class="text-slate-600 font-mono">${apt.telephone}</span>` : '<span class="italic text-slate-400">Ajouter tél.</span>'}
                ${apt.notes ? `<span>• ${apt.notes}</span>` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t ${isPaid ? 'border-emerald-100' : 'border-slate-100'}">
        <button 
          onclick="handleTogglePayment('${cotisation.id}', ${apt.numero})" 
          class="checkbox-anim w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition ${
            isPaid 
              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200' 
              : 'bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300'
          }"
        >
          <div class="flex items-center gap-2">
            <div class="w-5 h-5 rounded-md flex items-center justify-center ${
              isPaid ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
            }">
              ${isPaid ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>' : ''}
            </div>
            <span>${isPaid ? 'Cotisation Réglée' : 'Marquer comme Payé'}</span>
          </div>
          
          <span class="text-[10px] font-semibold uppercase tracking-wider ${isPaid ? 'text-emerald-700' : 'text-slate-400'}">
            ${isPaid ? '500 DA ✓' : '500 DA'}
          </span>
        </button>

        <div class="mt-2 flex items-center justify-between text-[11px] px-0.5">
          ${isPaid ? `
            <div class="flex items-center gap-1 text-slate-500">
              <i data-lucide="calendar" class="w-3 h-3 text-emerald-600"></i>
              <span>Payé le <strong class="text-slate-700">${formatDateFr(cotisation.date_paiement)}</strong></span>
            </div>
          ` : `
            <div class="flex items-center gap-1 text-rose-500 font-medium">
              <i data-lucide="alert-circle" class="w-3 h-3 text-rose-500"></i>
              <span>En attente de paiement</span>
            </div>
            <button onclick="openReminderModal(${apt.numero}, '${apt.nom_resident}', '${apt.telephone}')" class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 hover:bg-emerald-100 transition">
              <i data-lucide="message-circle" class="w-3 h-3"></i>
              <span>Rappel</span>
            </button>
          `}
        </div>

      </div>

    </div>
  `;
}

// ================= TOGGLE PAYMENT IN DATABASE =================
async function handleTogglePayment(cotisationId, aptNumber) {
  try {
    const res = await authFetch(`/api/v1/cotisations/${cotisationId}/toggle`, {
      method: 'PUT',
    });

    if (res.ok) {
      const data = await res.json();
      const updated = data.data.cotisation;
      if (updated.est_paye) {
        showToast(`Appt ${aptNumber} : Cotisation 500 DA enregistrée en base ! ✓`, 'success');
      } else {
        showToast(`Appt ${aptNumber} : Marqué non payé`, 'info');
      }
      loadMonthData(); // Reload from DB
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Erreur de mise à jour du statut", 'error');
    }
  } catch (err) {
    showToast("Erreur lors de la mise à jour", 'error');
  }
}

async function handleBulkFloor(floorStr, markAsPaid) {
  try {
    const res = await authFetch('/api/v1/cotisations/bulk-floor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etage: floorStr,
        mois: appState.currentMonth,
        annee: appState.currentYear,
        markAsPaid,
      }),
    });

    if (res.ok) {
      showToast(`Étage ${floorStr} mis à jour dans la base relationnelle !`, 'success');
      loadMonthData();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Erreur de mise à jour groupée", 'error');
    }
  } catch (err) {
    showToast("Erreur de mise à jour groupée", 'error');
  }
}

// ================= NAVIGATION =================
function changeMonth(delta) {
  appState.currentMonth += delta;
  if (appState.currentMonth > 12) {
    appState.currentMonth = 1;
    appState.currentYear += 1;
  } else if (appState.currentMonth < 1) {
    appState.currentMonth = 12;
    appState.currentYear -= 1;
  }
  loadMonthData();
}

function goToCurrentMonth() {
  const d = new Date();
  appState.currentYear = d.getFullYear();
  appState.currentMonth = d.getMonth() + 1;
  loadMonthData();
}

function onQuickMonthSelect(val) {
  if (!val) return;
  const [year, month] = val.split('-').map(Number);
  appState.currentYear = year;
  appState.currentMonth = month;
  loadMonthData();
}

function initMonthSelectDropdown() {
  const select = document.getElementById('quick-month-select');
  if (!select) return;
  select.innerHTML = '';
  
  [2025, 2026, 2027].forEach(yr => {
    MONTH_NAMES.forEach((mName, idx) => {
      const opt = document.createElement('option');
      opt.value = `${yr}-${idx + 1}`;
      opt.textContent = `${mName.substring(0, 4)}. ${yr}`;
      select.appendChild(opt);
    });
  });
}

function setFilter(type) {
  appState.currentFilter = type;
  const allBtn = document.getElementById('filter-all-btn');
  const unpaidBtn = document.getElementById('filter-unpaid-btn');
  const paidBtn = document.getElementById('filter-paid-btn');

  [allBtn, unpaidBtn, paidBtn].forEach(b => {
    b.className = 'px-3 py-1.5 rounded-lg hover:text-slate-900 transition';
  });

  if (type === 'all') allBtn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-2xs transition';
  if (type === 'unpaid') unpaidBtn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-2xs transition';
  if (type === 'paid') paidBtn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-2xs transition';

  renderBuildingFloors();
  lucide.createIcons();
}

function onSearchChange(val) {
  appState.searchQuery = val;
  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) clearBtn.classList.toggle('hidden', !val);
  renderBuildingFloors();
  lucide.createIcons();
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  onSearchChange('');
}

function toggleFloorOrder() {
  appState.floorOrder = appState.floorOrder === 'top-down' ? 'bottom-up' : 'top-down';
  const label = document.getElementById('sort-order-label');
  if (label) label.textContent = appState.floorOrder === 'top-down' ? '7ème Étage ➔ RDC' : 'RDC ➔ 7ème Étage';
  renderBuildingFloors();
  lucide.createIcons();
}

// ================= EDIT RESIDENT IN DATABASE =================
function openEditResidentModal(aptId) {
  const cot = appState.cotisationsData.cotisations.find(c => c.appartement.id === aptId);
  if (!cot) return;
  const apt = cot.appartement;

  document.getElementById('edit-resident-id').value = apt.id;
  document.getElementById('edit-resident-subtitle').textContent = `Appartement ${apt.numero} • Étage ${apt.etage}`;
  document.getElementById('edit-resident-name').value = apt.nom_resident || '';
  document.getElementById('edit-resident-phone').value = apt.telephone || '';
  document.getElementById('edit-resident-note').value = apt.notes || '';

  document.getElementById('edit-resident-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeEditResidentModal() {
  document.getElementById('edit-resident-modal').classList.add('hidden');
}

async function handleSaveResident(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }
  const aptId = document.getElementById('edit-resident-id').value;
  const name = document.getElementById('edit-resident-name').value.trim();
  const phone = document.getElementById('edit-resident-phone').value.trim();
  const note = document.getElementById('edit-resident-note').value.trim();

  if (!aptId) {
    showToast("Erreur : Aucun appartement sélectionné.", 'error');
    return false;
  }

  if (name.length < 2) {
    showToast("Le nom du résident doit comporter au moins 2 caractères.", 'error');
    return false;
  }

  const saveBtn = document.querySelector('#edit-resident-form button[type="submit"]');
  const originalText = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Sauvegarde en cours...';
  }

  try {
    const res = await authFetch(`/api/v1/apartments/${aptId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom_resident: name,
        telephone: phone || null,
        notes: note || null,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      showToast("Fiche résident mise à jour dans la base de données !", 'success');
      closeEditResidentModal();
      await loadMonthData();
    } else {
      showToast(data.message || "Erreur lors de la sauvegarde en base de données", 'error');
    }
  } catch (err) {
    console.error("Save resident error:", err);
    showToast("Erreur de connexion lors de la sauvegarde", 'error');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText || 'Sauvegarder en Base';
    }
  }
  return false;
}

// ================= EXPENSES (WITH RECEIPT UPLOAD) =================
function openExpensesModal() {
  document.getElementById('expenses-modal-subtitle').textContent = `Mois de ${MONTH_NAMES[appState.currentMonth - 1]} ${appState.currentYear}`;
  document.getElementById('expense-date-input').value = new Date().toISOString().split('T')[0];
  document.getElementById('expenses-modal').classList.remove('hidden');
  renderExpensesList();
  lucide.createIcons();
}

function closeExpensesModal() {
  document.getElementById('expenses-modal').classList.add('hidden');
}

function renderExpensesList() {
  const container = document.getElementById('expenses-list-container');
  if (!container) return;

  const expenses = appState.expensesData;
  const total = expenses.reduce((sum, e) => sum + e.montant, 0);

  document.getElementById('modal-expense-count').textContent = expenses.length;
  document.getElementById('modal-expense-total').textContent = `Total : ${formatDA(total)} DA`;

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
        <i data-lucide="receipt" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
        <p class="text-xs font-semibold text-slate-600">Aucune dépense enregistrée pour ce mois</p>
      </div>
    `;
    return;
  }

  container.innerHTML = expenses.map(exp => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 group hover:border-slate-300 transition">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-900 truncate">${exp.titre}</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
            ${exp.categorie || 'Général'}
          </span>
          ${exp.justificatif_url ? `
            <a href="${exp.justificatif_url}" target="_blank" class="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5" title="Voir le justificatif">
              <i data-lucide="paperclip" class="w-3 h-3"></i> Reçu
            </a>
          ` : ''}
        </div>
        <div class="text-[11px] text-slate-400 mt-1">
          <span>${formatDateFr(exp.date_depense)}</span>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="font-extrabold text-sm text-amber-700 font-mono">
          -${formatDA(exp.montant)} DA
        </span>
        <button onclick="handleDeleteExpense('${exp.id}')" class="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition" title="Supprimer">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `).join('');
}

async function handleAddExpense(event) {
  event.preventDefault();
  const desc = document.getElementById('expense-desc-input').value.trim();
  const amount = document.getElementById('expense-amount-input').value;
  const date = document.getElementById('expense-date-input').value;
  const cat = document.getElementById('expense-cat-input').value;
  const fileInput = document.getElementById('expense-file-input');

  const formData = new FormData();
  formData.append('titre', desc);
  formData.append('montant', amount);
  formData.append('date_depense', date);
  formData.append('mois', appState.currentMonth);
  formData.append('annee', appState.currentYear);
  formData.append('categorie', cat);

  if (fileInput.files.length > 0) {
    formData.append('justificatif', fileInput.files[0]);
  }

  try {
    const res = await authFetch('/api/v1/depenses', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      showToast(`Dépense de ${formatDA(amount)} DA enregistrée en base !`, 'success');
      document.getElementById('expense-desc-input').value = '';
      document.getElementById('expense-amount-input').value = '';
      fileInput.value = '';
      loadMonthData();
      renderExpensesList();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Erreur lors de l'enregistrement", 'error');
    }
  } catch (err) {
    showToast("Erreur lors de l'enregistrement", 'error');
  }
}

async function handleDeleteExpense(id) {
  if (!confirm("Supprimer définitivement cette dépense de la base ?")) return;

  try {
    const res = await authFetch(`/api/v1/depenses/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      showToast("Dépense supprimée", 'info');
      loadMonthData();
      renderExpensesList();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Erreur lors de la suppression", 'error');
    }
  } catch (err) {
    showToast("Erreur lors de la suppression", 'error');
  }
}

// ================= PRINT & A4 HALL DISPLAY =================
function updatePrintSheet() {
  if (!appState.cotisationsData) return;

  const summary = appState.cotisationsData.summary;
  const cotisations = appState.cotisationsData.cotisations;
  const monthName = MONTH_NAMES[appState.currentMonth - 1];
  const year = appState.currentYear;

  const printHtml = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; color: #1e293b; line-height: 1.4;">
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 1px;">
          RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE • GESTION DE COPROPRIÉTÉ
        </div>
        <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 4px 0;">
          RÉSIDENCE LES JASMINS
        </h1>
        <div style="font-size: 13px; font-weight: 600; color: #16a34a;">
          AVIS D'AFFICHAGE • ÉTAT RÉCAPITULATIF DES COTISATIONS MENSUELLES
        </div>
        <div style="font-size: 12px; font-weight: 500; color: #475569; margin-top: 2px;">
          Période : <strong>${monthName.toUpperCase()} ${year}</strong> — Taux fixé à : <strong>500 DA / Appartement</strong> (8 Étages • 24 Logements)
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; font-size: 11px;">
        <div>
          <span style="color: #64748b;">Total Attendu (24 Appts) :</span>
          <strong style="color: #0f172a; margin-left: 4px; font-size: 13px;">${formatDA(summary.totalExpected)} DA</strong>
        </div>
        <div>
          <span style="color: #64748b;">Total Encaissé :</span>
          <strong style="color: #16a34a; margin-left: 4px; font-size: 13px;">${formatDA(summary.totalCollected)} DA (${summary.paidCount}/24)</strong>
        </div>
        <div>
          <span style="color: #64748b;">Reste à Recouvrer :</span>
          <strong style="color: ${summary.unpaidCount > 0 ? '#e11d48' : '#16a34a'}; margin-left: 4px; font-size: 13px;">${formatDA(summary.unpaidCount * 500)} DA</strong>
        </div>
        <div>
          <span style="color: #64748b;">Taux de recouvrement :</span>
          <strong style="color: #0f172a; margin-left: 4px; font-size: 13px;">${summary.collectionRate}%</strong>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 18px;">
        <thead>
          <tr style="background-color: #0f172a; color: #ffffff; text-align: left;">
            <th style="padding: 6px 8px; border: 1px solid #0f172a; width: 80px; text-align: center;">N° APPT</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; width: 140px;">ÉTAGE</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a;">RÉSIDENT / COPROPRIÉTAIRE</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; width: 90px; text-align: right;">MONTANT</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; width: 110px; text-align: center;">STATUT</th>
            <th style="padding: 6px 8px; border: 1px solid #0f172a; width: 110px; text-align: center;">DATE RÈGLEMENT</th>
          </tr>
        </thead>
        <tbody>
          ${cotisations.map((c, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: #0f172a;">
                Appt ${c.appartement.numero}
              </td>
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #475569;">
                ${c.appartement.etage === 'RDC' ? 'RDC' : `${c.appartement.etage}ème Étage`}
              </td>
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600; color: #1e293b;">
                ${c.appartement.nom_resident}
              </td>
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">
                500 DA
              </td>
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center;">
                ${c.est_paye ? `
                  <span style="display: inline-block; padding: 2px 8px; background-color: #dcfce7; color: #166534; font-weight: 700; border-radius: 4px; font-size: 10px;">
                    RÉGLÉ ✓
                  </span>
                ` : `
                  <span style="display: inline-block; padding: 2px 8px; background-color: #fee2e2; color: #991b1b; font-weight: 700; border-radius: 4px; font-size: 10px;">
                    EN ATTENTE
                  </span>
                `}
              </td>
              <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: center; color: #64748b; font-size: 10px;">
                ${formatDateFr(c.date_paiement) || '—'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 11px;">
        <div style="max-width: 60%; font-size: 10px; color: #475569; line-height: 1.5; padding-right: 20px;">
          <p style="margin: 0; font-weight: 600; color: #0f172a;">NOTE D'INFORMATION AUX COPROPRIÉTAIRES :</p>
          <p style="margin: 3px 0 0 0;">
            Le bon fonctionnement des commodités communes de l'immeuble (nettoyage, éclairage, ascenseur) dépend de la ponctualité de vos cotisations. Prière aux résidents n'ayant pas encore régularisé de bien vouloir se rapprocher du syndic.
          </p>
          <p style="margin: 4px 0 0 0; font-style: italic;">Extrait de base de données relationnelle persistante - Date d'impression : ${new Date().toLocaleDateString('fr-FR')}.</p>
        </div>

        <div style="text-align: center; min-width: 200px; border: 1px dashed #94a3b8; border-radius: 8px; padding: 10px 14px; background: #fafafa;">
          <div style="font-weight: 700; color: #0f172a; font-size: 11px;">LE SYNDIC DE COPROPRIÉTÉ</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Cachet & Signature</div>
          <div style="height: 48px;"></div>
          <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 2px;">Affichage public hall</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('print-preview-content').innerHTML = printHtml;
  document.getElementById('print-sheet').innerHTML = printHtml;
}

function openPrintPreviewModal() {
  updatePrintSheet();
  document.getElementById('print-preview-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closePrintPreviewModal() {
  document.getElementById('print-preview-modal').classList.add('hidden');
}

function triggerDirectPrint() {
  updatePrintSheet();
  window.print();
}

// ================= 2FA MODAL =================
async function open2FAModal() {
  toggleUserDropdown();
  try {
    const res = await authFetch('/api/v1/auth/2fa/setup', {
      method: 'POST',
    });

    if (res.ok) {
      const data = await res.json();
      document.getElementById('twofa-qr-image').src = data.data.qrCode;
      document.getElementById('twofa-secret-text').textContent = `Clé secrète : ${data.data.secret}`;
      document.getElementById('twofa-modal').classList.remove('hidden');
      lucide.createIcons();
    }
  } catch (err) {
    showToast("Erreur lors de l'initiation 2FA", 'error');
  }
}

function close2FAModal() {
  document.getElementById('twofa-modal').classList.add('hidden');
}

async function handleVerify2FA() {
  const code = document.getElementById('twofa-verify-input').value.trim();
  if (code.length !== 6) {
    alert("Veuillez saisir un code à 6 chiffres valide.");
    return;
  }

  try {
    const res = await authFetch('/api/v1/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code }),
    });

    if (res.ok) {
      showToast("Authentification 2FA activée avec succès !", 'success');
      close2FAModal();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || "Code 2FA invalide.");
    }
  } catch (err) {
    alert("Erreur lors de la validation 2FA.");
  }
}

// ================= SETTINGS & BACKUP =================
function openSettingsModal() {
  toggleUserDropdown();
  document.getElementById('settings-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

async function exportDatabaseBackup() {
  try {
    showToast("Préparation de la sauvegarde...", 'info');
    const res = await authFetch('/api/v1/backup/export');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.message || "Erreur lors de l'export de la base de données.", 'error');
      return;
    }
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `syndic_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(downloadUrl);
    link.remove();
    showToast("Sauvegarde exportée avec succès !", 'success');
  } catch (err) {
    console.error("Backup export error:", err);
    showToast("Erreur lors du téléchargement de la sauvegarde.", 'error');
  }
}

async function handleRestoreDatabase() {
  const fileInput = document.getElementById('import-db-file');
  if (!fileInput.files.length) {
    alert("Veuillez sélectionner un fichier JSON de sauvegarde.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const res = await authFetch('/api/v1/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        showToast("Base de données restaurée avec succès !", 'success');
        closeSettingsModal();
        loadMonthData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Erreur lors de la restauration.");
      }
    } catch (err) {
      alert("Fichier JSON invalide.");
    }
  };
  reader.readAsText(fileInput.files[0]);
}

// ================= REMINDERS =================
function openReminderModal(aptNum, residentName, phone) {
  const monthName = MONTH_NAMES[appState.currentMonth - 1];
  const year = appState.currentYear;
  const msg = `Bonjour ${residentName},\n\nRappel amical concernant la cotisation de charges d'immeuble pour l'Appartement ${aptNum} (Mois de ${monthName} ${year} : 500 DA).\n\nMerci de bien vouloir vous rapprocher du syndic pour le règlement.\n\nCordialement,\nLe Syndic de Copropriété.`;

  document.getElementById('reminder-target-text').textContent = `Rappel Appt ${aptNum} - ${residentName}`;
  document.getElementById('reminder-message-text').value = msg;

  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '213' + cleanPhone.substring(1);
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  document.getElementById('reminder-whatsapp-link').href = waUrl;

  document.getElementById('reminder-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeReminderModal() {
  document.getElementById('reminder-modal').classList.add('hidden');
}

function copyReminderText() {
  const text = document.getElementById('reminder-message-text').value;
  navigator.clipboard.writeText(text).then(() => {
    showToast("Message copié dans le presse-papier !", 'success');
  });
}

function formatDateFr(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ================= TOASTS =================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-700 text-white' : (type === 'error' ? 'bg-rose-700 text-white' : 'bg-slate-900 text-white');
  
  toast.className = `${bg} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-200 border border-white/10`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// Explicit window bindings to guarantee global availability for all HTML inline handlers
window.handleLoginSubmit = handleLoginSubmit;
window.quickDemoLogin = quickDemoLogin;
window.togglePasswordVisibility = togglePasswordVisibility;
window.toggleUserDropdown = toggleUserDropdown;
window.handleLogout = handleLogout;

window.changeMonth = changeMonth;
window.goToCurrentMonth = goToCurrentMonth;
window.onQuickMonthSelect = onQuickMonthSelect;
window.setFilter = setFilter;
window.filterApartments = setFilter;
window.onSearchChange = onSearchChange;
window.clearSearch = clearSearch;
window.toggleFloorOrder = toggleFloorOrder;

window.handleTogglePayment = handleTogglePayment;
window.togglePaymentStatus = handleTogglePayment;
window.handleBulkFloor = handleBulkFloor;
window.bulkToggleFloor = handleBulkFloor;

window.openEditResidentModal = openEditResidentModal;
window.openResidentModal = openEditResidentModal;
window.closeEditResidentModal = closeEditResidentModal;
window.closeResidentModal = closeEditResidentModal;
window.handleSaveResident = handleSaveResident;
window.handleResidentSubmit = handleSaveResident;

window.openExpensesModal = openExpensesModal;
window.closeExpensesModal = closeExpensesModal;
window.handleAddExpense = handleAddExpense;
window.handleExpenseSubmit = handleAddExpense;
window.handleDeleteExpense = handleDeleteExpense;
window.deleteExpense = handleDeleteExpense;

window.openPrintPreviewModal = openPrintPreviewModal;
window.closePrintPreviewModal = closePrintPreviewModal;
window.triggerDirectPrint = triggerDirectPrint;
window.openReminderModal = openReminderModal;
window.closeReminderModal = closeReminderModal;
window.copyReminderText = copyReminderText;

window.open2FAModal = open2FAModal;
window.close2FAModal = close2FAModal;
window.handleVerify2FA = handleVerify2FA;
window.handle2FAVerifySubmit = handleVerify2FA;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.exportDatabaseBackup = exportDatabaseBackup;
window.handleRestoreDatabase = handleRestoreDatabase;
window.authFetch = authFetch;
window.showToast = showToast;


