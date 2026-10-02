// =========================================================================
// SECTION 6: KASSA, MOLIYA, XARAJATLAR VA SOF FOYDA (P&L) HISOBOTI
// =========================================================================

let financeActiveSubtab = 'ftab-cash'; // 'ftab-cash', 'ftab-expenses', 'ftab-pl', 'ftab-zreport'
let financePeriodFilter = 'all'; // 'today', 'week', 'month', 'all'
let expenseCategoryFilter = '';

function switchFinanceTab(tabId) {
    financeActiveSubtab = tabId;
    const tabs = ['ftab-cash', 'ftab-expenses', 'ftab-pl', 'ftab-zreport'];
    
    tabs.forEach(t => {
        const el = document.getElementById(t);
        const btn = document.getElementById(`btn-${t}`);
        if (t === tabId) {
            if (el) el.classList.remove('hidden');
            if (btn) btn.className = "pb-3 px-4 text-xs font-bold border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2 transition";
        } else {
            if (el) el.classList.add('hidden');
            if (btn) btn.className = "pb-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 transition";
        }
    });

    if (tabId === 'ftab-cash') renderCashRegistersDashboard();
    if (tabId === 'ftab-expenses') renderExpensesTable();
    if (tabId === 'ftab-pl') renderPLReport();
    if (tabId === 'ftab-zreport') renderZReportView();

    lucide.createIcons();
}

function renderFinanceSection() {
    recalculateSafeDeposits();
    if (financeActiveSubtab === 'ftab-cash') renderCashRegistersDashboard();
    if (financeActiveSubtab === 'ftab-expenses') renderExpensesTable();
    if (financeActiveSubtab === 'ftab-pl') renderPLReport();
    if (financeActiveSubtab === 'ftab-zreport') renderZReportView();
    lucide.createIcons();
}

// Ensure total holding deposit reflects active unreturned orders
function recalculateSafeDeposits() {
    let holding = 0;
    (DB.orders || []).forEach(o => {
        if (o.status === 'faol_ijarada' || o.status === 'kechikkan') {
            holding += (o.total_deposit_amount || 0);
        }
    });
    if (!DB.deposit_safe) DB.deposit_safe = { id: 1, total_holding_deposit: 0 };
    DB.deposit_safe.total_holding_deposit = holding;
}

// -------------------------------------------------------------------------
// 1. KASSA HISOBI VA TRANZAKSIYALAR
// -------------------------------------------------------------------------
function renderCashRegistersDashboard() {
    const cashReg = (DB.cash_registers || []).find(r => r.code === 'naqd');
    const bankReg = (DB.cash_registers || []).find(r => r.code === 'bank_utkazma');
    const cardReg = (DB.cash_registers || []).find(r => r.code === 'karta');

    const elCash = document.getElementById('cash-val-naqd');
    const elBank = document.getElementById('cash-val-bank');
    const elCard = document.getElementById('cash-val-card');
    const elSafe = document.getElementById('cash-val-safe');

    if (elCash) elCash.innerText = `${(cashReg?.current_balance || 0).toLocaleString()} so'm`;
    if (elBank) elBank.innerText = `${(bankReg?.current_balance || 0).toLocaleString()} so'm`;
    if (elCard) elCard.innerText = `${(cardReg?.current_balance || 0).toLocaleString()} so'm`;
    if (elSafe) elSafe.innerText = `${(DB.deposit_safe?.total_holding_deposit || 0).toLocaleString()} so'm`;

    renderFinanceTransactionsTable();
}

function renderFinanceTransactionsTable() {
    const tbody = document.getElementById('finance-transactions-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const list = DB.financial_transactions || [];
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">Hozircha moliyaviy operatsiyalar yo'q</td></tr>`;
        return;
    }

    const typeBadges = {
        ijara_tushumi: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">+ Ijara tushumi</span>',
        xizmat_marjasi: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">+ Xizmat marjasi</span>',
        jarima_tushumi: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">+ Jarima tushumi</span>',
        zalog_kirim: '<span class="badge-status bg-purple-500/10 text-purple-400 border border-purple-500/20"> Zalog kirim</span>',
        zalog_chiqim: '<span class="badge-status bg-purple-500/10 text-purple-300 border border-purple-500/20"> Zalog qaytarish</span>',
        xarajat_chiqim: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20">- Xarajat chiqim</span>',
        hamkorga_tolov: '<span class="badge-status bg-amber-500/10 text-amber-300 border border-amber-500/20">- Hamkor to\'lovi</span>',
        kassa_kirim: '<span class="badge-status bg-emerald-500/10 text-emerald-300">+ Kassa to\'ldirish</span>',
        kassa_chiqim: '<span class="badge-status bg-red-500/10 text-red-300">- Kassadan olish</span>'
    };

    list.slice(0, 30).forEach(t => {
        const reg = (DB.cash_registers || []).find(r => r.id === t.cash_register_id);
        const user = (DB.users || []).find(u => u.id === t.performed_by_user_id);
        const isIncome = t.type.includes('tushum') || t.type.includes('marja') || t.type === 'kassa_kirim' || t.type === 'zalog_kirim';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-2.5 px-4 font-mono text-[11px] text-slate-300">${t.date || '-'}</td>
            <td class="py-2.5 px-4">${typeBadges[t.type] || t.type}</td>
            <td class="py-2.5 px-4 font-semibold text-slate-300">${reg ? reg.name : 'Asosiy Kassa'}</td>
            <td class="py-2.5 px-4 font-mono font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}">
                ${isIncome ? '+' : '-'}${(t.amount || 0).toLocaleString()} so'm
            </td>
            <td class="py-2.5 px-4 text-slate-400 text-xs">${t.order_id ? `Buyurtma: ${t.order_id}` : (t.description || '-')}</td>
            <td class="py-2.5 px-4 text-slate-400 text-xs">${user ? user.full_name : 'Admin'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openModalCashOperation(type = 'kirim') {
    document.getElementById('co-type').value = type;
    document.getElementById('co-title').innerText = type === 'kirim' ? "Kassaga Pul Kirim Qilish" : "Kassadan Pul Chiqarish / Inkassatsiya";
    document.getElementById('co-btn-submit').innerText = type === 'kirim' ? "Kirimni Tasdiqlash" : "Chiqimni Tasdiqlash";
    document.getElementById('co-btn-submit').className = type === 'kirim' ? "px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white" : "px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white";

    const select = document.getElementById('co-register-select');
    select.innerHTML = (DB.cash_registers || []).map(r => `<option value="${r.id}">${r.name} (${r.current_balance.toLocaleString()} so'm)</option>`).join('');

    document.getElementById('co-amount').value = '';
    document.getElementById('co-comment').value = '';
    document.getElementById('co-date').value = new Date().toISOString().split('T')[0];

    openModal('modal-cash-operation');
}

function handleSaveCashOperation(e) {
    e.preventDefault();
    const type = document.getElementById('co-type').value;
    const regId = parseInt(document.getElementById('co-register-select').value);
    const amount = parseFloat(document.getElementById('co-amount').value) || 0;
    const comment = document.getElementById('co-comment').value.trim();
    const date = document.getElementById('co-date').value;

    const reg = (DB.cash_registers || []).find(r => r.id === regId);
    if (!reg) return;

    if (type === 'chiqim' && reg.current_balance < amount) {
        if (!confirm("Diqqat! Chiqim summasi kassa qoldig'idan ko'proq. Davom etasizmi?")) {
            return;
        }
    }

    if (type === 'kirim') {
        reg.current_balance += amount;
    } else {
        reg.current_balance -= amount;
    }

    if (!DB.financial_transactions) DB.financial_transactions = [];
    DB.financial_transactions.unshift({
        id: Date.now(),
        type: type === 'kirim' ? 'kassa_kirim' : 'kassa_chiqim',
        cash_register_id: reg.id,
        amount: amount,
        description: comment,
        date: `${date} ${new Date().toTimeString().substring(0, 5)}`,
        performed_by_user_id: currentUser ? currentUser.id : 1
    });

    saveDB();
    closeModal('modal-cash-operation');
    renderCashRegistersDashboard();
    showNotification(`Kassa operatsiyasi muvaffaqiyatli saqlandi!`, "success");
}

// -------------------------------------------------------------------------
// 2. XARAJATLAR (RASXOD) JURNALI
// -------------------------------------------------------------------------
function renderExpensesTable() {
    const tbody = document.getElementById('expenses-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const catFilter = document.getElementById('filter-expense-category')?.value || '';
    const filtered = (DB.expenses || []).filter(ex => !catFilter || ex.category_id === parseInt(catFilter));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">Ushbu toifada xarajatlar topilmadi</td></tr>`;
        return;
    }

    filtered.forEach(ex => {
        const cat = (DB.expense_categories || []).find(c => c.id === ex.category_id);
        const reg = (DB.cash_registers || []).find(r => r.id === ex.cash_register_id);
        const user = (DB.users || []).find(u => u.id === ex.created_by_user_id);

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono text-xs text-slate-300">${ex.date}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                    ${cat ? cat.name : 'Xarajat'}
                </span>
            </td>
            <td class="py-3 px-4 text-xs font-medium text-white">${ex.description}</td>
            <td class="py-3 px-4 text-xs text-slate-300">${ex.recipient || '-'}</td>
            <td class="py-3 px-4 text-xs text-slate-400">${reg ? reg.name : 'Kassa'}</td>
            <td class="py-3 px-4 font-mono font-bold text-red-400 text-xs">-${ex.amount.toLocaleString()} so'm</td>
            <td class="py-3 px-4 text-right">
                <button onclick="deleteExpenseItem(${ex.id})" class="p-1 rounded text-red-400 hover:text-white" title="O'chirish">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openModalAddExpense() {
    const catSelect = document.getElementById('exp-category-select');
    catSelect.innerHTML = (DB.expense_categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const regSelect = document.getElementById('exp-register-select');
    regSelect.innerHTML = (DB.cash_registers || []).map(r => `<option value="${r.id}">${r.name} (${r.current_balance.toLocaleString()} so'm)</option>`).join('');

    document.getElementById('exp-amount').value = '';
    document.getElementById('exp-description').value = '';
    document.getElementById('exp-recipient').value = '';
    document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];

    openModal('modal-add-expense');
}

function handleSaveExpense(e) {
    e.preventDefault();
    const catId = parseInt(document.getElementById('exp-category-select').value);
    const regId = parseInt(document.getElementById('exp-register-select').value);
    const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
    const desc = document.getElementById('exp-description').value.trim();
    const recipient = document.getElementById('exp-recipient').value.trim();
    const date = document.getElementById('exp-date').value;

    const reg = (DB.cash_registers || []).find(r => r.id === regId);
    if (reg) {
        reg.current_balance -= amount;
    }

    const newExp = {
        id: Date.now(),
        category_id: catId,
        cash_register_id: regId,
        amount: amount,
        description: desc,
        recipient: recipient,
        date: date,
        created_by_user_id: currentUser ? currentUser.id : 1
    };

    if (!DB.expenses) DB.expenses = [];
    DB.expenses.unshift(newExp);

    // Record in financial transactions
    if (!DB.financial_transactions) DB.financial_transactions = [];
    DB.financial_transactions.unshift({
        id: Date.now() + 1,
        type: "xarajat_chiqim",
        cash_register_id: regId,
        amount: amount,
        expense_id: newExp.id,
        description: `${desc} (${recipient})`,
        date: `${date} ${new Date().toTimeString().substring(0, 5)}`,
        performed_by_user_id: currentUser ? currentUser.id : 1
    });

    saveDB();
    closeModal('modal-add-expense');
    renderExpensesTable();
    renderCashRegistersDashboard();
    showNotification(`Xarajat -${amount.toLocaleString()} so'm muvaffaqiyatli saqlandi!`, "success");
}

function deleteExpenseItem(expId) {
    if (!confirm("Haqiqatan ham bu xarajatni o'chirmoqchimisiz?")) return;
    const idx = (DB.expenses || []).findIndex(e => e.id === expId);
    if (idx !== -1) {
        const item = DB.expenses[idx];
        const reg = (DB.cash_registers || []).find(r => r.id === item.cash_register_id);
        if (reg) reg.current_balance += item.amount; // refund back to register

        DB.expenses.splice(idx, 1);
        saveDB();
        renderExpensesTable();
        renderCashRegistersDashboard();
        showNotification("Xarajat bekor qilindi va kassa balansi tiklandi.", "info");
    }
}

// -------------------------------------------------------------------------
// 3. MOLIYA VA SOF FOYDA HISOBOTI (P&L REPORT)
// -------------------------------------------------------------------------
function filterPLPeriod(period) {
    financePeriodFilter = period;
    
    const pBtns = ['btn-pl-today', 'btn-pl-week', 'btn-pl-month', 'btn-pl-all'];
    pBtns.forEach(b => {
        const el = document.getElementById(b);
        if (el) el.className = "px-3 py-1.5 rounded-xl text-xs font-semibold border border-transparent text-slate-400 hover:text-white transition";
    });

    const activeMap = {
        'today': 'btn-pl-today',
        'week': 'btn-pl-week',
        'month': 'btn-pl-month',
        'all': 'btn-pl-all'
    };
    const activeEl = document.getElementById(activeMap[period]);
    if (activeEl) {
        activeEl.className = "px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-600/20 text-emerald-400 transition";
    }

    renderPLReport();
}

function renderPLReport() {
    let rentRevenue = 0;
    let serviceBrokerageMargin = 0;
    let penaltyRevenue = 0;
    let totalExpenses = 0;

    const todayStr = new Date().toISOString().substring(0, 10);
    const thisMonthStr = new Date().toISOString().substring(0, 7);

    // 1. Calculate Rent Revenue from Orders
    (DB.orders || []).forEach(o => {
        const orderDate = (o.created_at || o.start_date || '').substring(0, 10);
        let match = true;
        if (financePeriodFilter === 'today') match = orderDate === todayStr;
        if (financePeriodFilter === 'month') match = orderDate.startsWith(thisMonthStr);

        if (match) {
            rentRevenue += (o.paid_amount || 0);
        }
    });

    // 2. Calculate Brokerage Margin from External Services
    (DB.order_service_items || []).forEach(s => {
        serviceBrokerageMargin += (s.profit_margin || 0);
    });

    // 3. Calculate Penalties collected from returns
    (DB.order_payments || []).forEach(p => {
        if (p.payment_type === 'jarima_ushlandi') {
            penaltyRevenue += (p.amount || 0);
        }
    });

    // 4. Calculate Expenses
    (DB.expenses || []).forEach(ex => {
        let match = true;
        if (financePeriodFilter === 'today') match = ex.date === todayStr;
        if (financePeriodFilter === 'month') match = ex.date.startsWith(thisMonthStr);

        if (match) {
            totalExpenses += (ex.amount || 0);
        }
    });

    const grossRevenue = rentRevenue + serviceBrokerageMargin + penaltyRevenue;
    const netProfit = grossRevenue - totalExpenses;
    const profitMarginPct = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

    document.getElementById('pl-rent-rev').innerText = `+${rentRevenue.toLocaleString()} so'm`;
    document.getElementById('pl-service-margin').innerText = `+${serviceBrokerageMargin.toLocaleString()} so'm`;
    document.getElementById('pl-penalty-rev').innerText = `+${penaltyRevenue.toLocaleString()} so'm`;
    document.getElementById('pl-gross-rev').innerText = `${grossRevenue.toLocaleString()} so'm`;
    document.getElementById('pl-expenses-total').innerText = `-${totalExpenses.toLocaleString()} so'm`;

    const elNet = document.getElementById('pl-net-profit');
    const elMarginPct = document.getElementById('pl-margin-pct');

    if (elNet) {
        elNet.innerText = `${netProfit >= 0 ? '+' : ''}${netProfit.toLocaleString()} so'm`;
        elNet.className = netProfit >= 0 ? "text-3xl font-extrabold text-emerald-400 font-mono tracking-tight" : "text-3xl font-extrabold text-red-400 font-mono tracking-tight";
    }
    if (elMarginPct) {
        elMarginPct.innerText = `Sof rentabellik: ${profitMarginPct}%`;
    }
}

// -------------------------------------------------------------------------
// 4. KUNLIK SMENA / KASSA HISOBOTI (Z-OTCHYOT)
// -------------------------------------------------------------------------
function renderZReportView() {
    const todayStr = new Date().toISOString().substring(0, 10);
    let todayCashRent = 0;
    let todayCardRent = 0;
    let todayDepositIn = 0;
    let todayDepositOut = 0;
    let todayExpenses = 0;

    (DB.financial_transactions || []).forEach(t => {
        const tDate = (t.date || '').substring(0, 10);
        if (tDate === todayStr) {
            if (t.type === 'ijara_tushumi') {
                if (t.cash_register_id === 1) todayCashRent += t.amount;
                else todayCardRent += t.amount;
            }
            if (t.type === 'zalog_kirim') todayDepositIn += t.amount;
            if (t.type === 'zalog_chiqim') todayDepositOut += t.amount;
            if (t.type === 'xarajat_chiqim') todayExpenses += t.amount;
        }
    });

    const cashReg = (DB.cash_registers || []).find(r => r.code === 'naqd');
    const cardReg = (DB.cash_registers || []).find(r => r.code === 'karta');

    const container = document.getElementById('zreport-summary-container');
    if (!container) return;

    container.innerHTML = `
        <div class="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-xl mx-auto space-y-5">
            <div class="text-center pb-4 border-b border-slate-800">
                <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs uppercase tracking-wider">Kunlik Smena</span>
                <h3 class="text-lg font-extrabold text-white mt-2">KASSA Z-OTCHYOTI (SMENANI YOPISH)</h3>
                <p class="text-xs text-slate-400 mt-0.5">Sana: <b class="text-slate-200">${todayStr}</b> | Kassir: <b class="text-white">${currentUser ? currentUser.full_name : 'Admin'}</b></p>
            </div>

            <div class="space-y-2.5 text-xs">
                <div class="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/60">
                    <span>Bugungi Naqd Ijara Tushumi:</span>
                    <b class="text-emerald-400 font-mono">+${todayCashRent.toLocaleString()} so'm</b>
                </div>
                <div class="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/60">
                    <span>Bugungi Karta / Terminal Tushumi:</span>
                    <b class="text-emerald-400 font-mono">+${todayCardRent.toLocaleString()} so'm</b>
                </div>
                <div class="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/60">
                    <span>Qabul qilingan Zaloglar (Depozit fondi):</span>
                    <b class="text-purple-400 font-mono">+${todayDepositIn.toLocaleString()} so'm</b>
                </div>
                <div class="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/60">
                    <span>Mijozlarga Qaytarilgan Zaloglar:</span>
                    <b class="text-purple-300 font-mono">-${todayDepositOut.toLocaleString()} so'm</b>
                </div>
                <div class="flex justify-between text-slate-300 py-1.5 border-b border-slate-800/60">
                    <span>Bugungi Chiqim Xarajatlar (Rasxod):</span>
                    <b class="text-red-400 font-mono">-${todayExpenses.toLocaleString()} so'm</b>
                </div>
                <div class="flex justify-between text-white text-sm font-bold pt-2">
                    <span>Faktik Naqd Kassa Qoldig'i:</span>
                    <span class="text-emerald-400 font-mono">${(cashReg?.current_balance || 0).toLocaleString()} so'm</span>
                </div>
            </div>

            <div class="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button type="button" onclick="printZReportReceipt()" class="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-500/20">
                    <i data-lucide="printer" class="w-4 h-4"></i>
                    <span>Z-Otchyotni Chop Etish (Print)</span>
                </button>
            </div>
        </div>
    `;

    lucide.createIcons();
}

function printZReportReceipt() {
    const todayStr = new Date().toISOString().substring(0, 10);
    const cashReg = (DB.cash_registers || []).find(r => r.code === 'naqd');
    const cardReg = (DB.cash_registers || []).find(r => r.code === 'karta');

    const printArea = document.getElementById('zreport-print-content');
    if (!printArea) return;

    printArea.innerHTML = `
        <div class="p-6 bg-white text-slate-900 font-mono text-xs max-w-sm mx-auto space-y-3 border border-slate-300 rounded shadow">
            <div class="text-center pb-2 border-b-2 border-dashed border-slate-400">
                <h2 class="text-sm font-bold">WMS ARENDA ERP</h2>
                <p class="text-[10px] text-slate-600">Qurilish Asboblari Ijarasi</p>
                <p class="text-xs font-bold mt-1">*** KASSA Z-OTCHYOTI ***</p>
            </div>
            <div class="text-[11px] space-y-1">
                <div>Sana: <b>${todayStr} ${new Date().toLocaleTimeString()}</b></div>
                <div>Kassir: <b>${currentUser ? currentUser.full_name : 'Admin'}</b></div>
                <div>Smena holati: <b>YOPILDI</b></div>
            </div>
            <div class="border-t border-b border-dashed border-slate-400 py-2 space-y-1.5 text-[11px]">
                <div class="flex justify-between"><span>Naqd tushum:</span><b>${(cashReg?.current_balance || 0).toLocaleString()}</b></div>
                <div class="flex justify-between"><span>Karta tushum:</span><b>${(cardReg?.current_balance || 0).toLocaleString()}</b></div>
                <div class="flex justify-between"><span>Zalog fondi:</span><b>${(DB.deposit_safe?.total_holding_deposit || 0).toLocaleString()}</b></div>
            </div>
            <div class="text-center pt-2 text-[10px] text-slate-600">
                <p>Hisobot qabul qilindi.</p>
                <p>Imzo: ___________________</p>
            </div>
        </div>
    `;

    openModal('modal-z-report');
}
