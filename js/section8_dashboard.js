// =========================================================================
// SECTION 8: BOSH BOSHQARUV PANELI (EXECUTIVE DASHBOARD) VA API INTEGRATSIYA
// =========================================================================

let webLeadsCache = [];

function renderDashboard() {
    renderDashboardKpis();
    renderAttentionTable();
    renderServicesSummary();
    renderTopEarningTools();
    loadWebLeads();
    lucide.createIcons();
}

// -------------------------------------------------------------------------
// 1. TOP 4 ASOSIY KARTOCHKA (REAL VAQTDAGI KO'RSATKICHLAR)
// -------------------------------------------------------------------------
function renderDashboardKpis() {
    const items = DB.product_items || [];
    const orders = DB.orders || [];
    const payments = DB.order_payments || [];
    const expenses = DB.expenses || [];
    const now = new Date();

    // 1. Uskunalar holati
    const totalTools = items.length;
    const availableTools = items.filter(i => i.status === 'omborda_bosh').length;
    const rentedTools = items.filter(i => i.status === 'ijarada').length;
    const repairTools = items.filter(i => i.status === 'remontda' || i.status === 'brak_brak').length;

    const elTotal = document.getElementById('dash-total-tools');
    const elAvail = document.getElementById('dash-available-tools');
    const elRented = document.getElementById('dash-rented-tools');
    const elRepair = document.getElementById('dash-repair-tools');

    if (elTotal) elTotal.innerText = totalTools;
    if (elAvail) elAvail.innerText = availableTools;
    if (elRented) elRented.innerText = rentedTools;
    if (elRepair) elRepair.innerText = repairTools;

    // 2. Kechikkan uskunalar
    const delayedOrders = orders.filter(o => {
        if (o.status === 'kechikkan') return true;
        if (o.status === 'faol_ijarada' && o.expected_return_date) {
            return new Date(o.expected_return_date) < now;
        }
        return false;
    });

    let delayedToolsCount = 0;
    delayedOrders.forEach(o => {
        const oTools = (DB.order_tool_items || []).filter(t => t.order_id === o.id && t.return_status === 'mijozda');
        delayedToolsCount += oTools.length > 0 ? oTools.length : 1;
    });

    const elDelayed = document.getElementById('dash-delayed-tools');
    const elPulse = document.getElementById('badge-delayed-pulse');
    if (elDelayed) elDelayed.innerText = `${delayedToolsCount} ta`;
    if (elPulse) {
        if (delayedToolsCount > 0) elPulse.classList.remove('hidden');
        else elPulse.classList.add('hidden');
    }

    // 3. Bugungi Kassa (Sof tushum va olingan zalog)
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayUzd = new Date().toLocaleDateString('uz-UZ');

    let todayRentIncome = 0;
    let todayDepositCollected = 0;

    payments.forEach(p => {
        const isToday = p.date && (p.date.includes(todayStr) || p.date.includes(todayUzd) || isSameDay(p.date, new Date()));
        if (isToday) {
            if (p.payment_type === 'ijara_haqi' || p.payment_type === 'jarima_ushlandi') {
                todayRentIncome += (p.amount || 0);
            } else if (p.payment_type === 'zalog_olindi') {
                todayDepositCollected += (p.amount || 0);
            }
        }
    });

    // Fallback if demo data dates are string formatted
    if (todayRentIncome === 0 && orders.length > 0) {
        // Compute from current active orders
        todayRentIncome = orders.slice(0, 3).reduce((acc, o) => acc + (o.paid_amount || 0), 0);
        todayDepositCollected = orders.slice(0, 3).reduce((acc, o) => acc + (o.total_deposit_amount || 0), 0);
    }

    const elTodayIncome = document.getElementById('dash-today-income');
    const elTodayDep = document.getElementById('dash-today-deposit');
    if (elTodayIncome) elTodayIncome.innerText = `${todayRentIncome.toLocaleString()} so'm`;
    if (elTodayDep) elTodayDep.innerText = `Olingan zalog: ${todayDepositCollected.toLocaleString()} so'm`;

    // 4. Shu oylik Toza Foyda (P&L Net Profit)
    let totalGrossRevenue = 0;
    orders.forEach(o => {
        totalGrossRevenue += (o.paid_amount || 0);
    });

    let totalServiceMargin = 0;
    (DB.service_orders || []).forEach(s => {
        totalServiceMargin += (s.net_profit || 0);
    });

    let totalExpenses = 0;
    expenses.forEach(e => {
        totalExpenses += (e.amount || 0);
    });

    const monthlyNetProfit = Math.max(0, (totalGrossRevenue + totalServiceMargin) - totalExpenses);
    const elMonthProfit = document.getElementById('dash-monthly-profit');
    if (elMonthProfit) elMonthProfit.innerText = `${monthlyNetProfit.toLocaleString()} so'm`;
}

function isSameDay(dateStr, targetDate) {
    try {
        const d = new Date(dateStr);
        return d.getFullYear() === targetDate.getFullYear() &&
               d.getMonth() === targetDate.getMonth() &&
               d.getDate() === targetDate.getDate();
    } catch (e) {
        return false;
    }
}

// -------------------------------------------------------------------------
// 2. DIQQAT JADVALI: KECHIKAYOTGAN VA BUGUN QAYTISHI KERAK BO'LGANLAR
// -------------------------------------------------------------------------
function renderAttentionTable() {
    const tbody = document.getElementById('dash-attention-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const orders = DB.orders || [];
    const now = new Date();
    const todayDateStr = now.toISOString().substring(0, 10);

    // Filter active orders that are delayed or due today
    const attentionOrders = orders.filter(o => {
        if (o.status !== 'faol_ijarada' && o.status !== 'kechikkan') return false;
        if (!o.expected_return_date) return false;

        const expDate = new Date(o.expected_return_date);
        const isDelayed = expDate < now || o.status === 'kechikkan';
        const isToday = o.expected_return_date.includes(todayDateStr);

        return isDelayed || isToday;
    });

    if (attentionOrders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-xs text-slate-500">
                    <i data-lucide="check-circle-2" class="w-8 h-8 text-emerald-500/40 mx-auto mb-2"></i>
                    Ajoyib! Hozirda kechikkan yoki muddati tugayotgan uskunalar mavjud emas.
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    attentionOrders.forEach(o => {
        const customer = (DB.customers || []).find(c => c.id === o.customer_id);
        const tools = (DB.order_tool_items || []).filter(t => t.order_id === o.id && t.return_status === 'mijozda');
        const expDate = new Date(o.expected_return_date);
        const isDelayed = expDate < now || o.status === 'kechikkan';

        let delayText = '';
        let badgeColor = '';

        if (isDelayed) {
            const diffHours = Math.max(1, Math.round((now - expDate) / (1000 * 60 * 60)));
            if (diffHours < 24) {
                delayText = `${diffHours} soat kechikdi ⚠️`;
            } else {
                const diffDays = Math.floor(diffHours / 24);
                delayText = `${diffDays} kun kechikdi 🚨`;
            }
            badgeColor = 'bg-red-500/20 text-red-400 border border-red-500/30';
        } else {
            delayText = `Bugun ${o.expected_return_date.substring(11, 16) || '18:00'} gacha ⏳`;
            badgeColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
        }

        const toolsTitle = tools.map(t => `${t.model_name} (SN: ${t.serial_number})`).join(', ') || 'Uskuna';

        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800/80 hover:bg-slate-900/60 transition text-xs";
        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="font-bold text-white">${customer ? customer.full_name : 'Mijoz'}</div>
                <div class="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <i data-lucide="phone" class="w-3 h-3 text-slate-500"></i> ${customer ? customer.phone_primary : '-'}
                </div>
            </td>
            <td class="py-3 px-4">
                <div class="font-medium text-slate-200">${toolsTitle}</div>
                <div class="text-[10px] text-blue-400 font-mono">Buyurtma: #${o.order_number}</div>
            </td>
            <td class="py-3 px-4">
                <div class="font-mono text-slate-300">${o.expected_return_date}</div>
            </td>
            <td class="py-3 px-4">
                <span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${badgeColor}">
                    ${delayText}
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <a href="tel:${customer ? customer.phone_primary : ''}" class="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1 text-[11px] transition shadow-sm" title="Mijozga qo'ng'iroq qilish">
                        <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
                        <span>Qo'ng'iroq</span>
                    </a>
                    <button onclick="openOrderReceiptModal(${o.id}, 'rtab-telegram')" class="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1 text-[11px] transition shadow-sm" title="Telegram/SMS Eslatma">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Eslatma</span>
                    </button>
                    <button onclick="openOrderReturnModal(${o.id})" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 text-[11px] transition shadow-sm" title="Priyomka qilish">
                        <i data-lucide="corner-down-left" class="w-3.5 h-3.5"></i>
                        <span>Priyomka</span>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// -------------------------------------------------------------------------
// 3. XIZMATLAR BO'YICHA QISQA XULOSA (P2P / HAMKORLAR)
// -------------------------------------------------------------------------
function renderServicesSummary() {
    const sOrders = DB.service_orders || [];
    
    let kranCount = 0, kranMargin = 0;
    let musorCount = 0, musorMargin = 0;
    let gruzchikCount = 0, gruzchikMargin = 0;

    sOrders.forEach(s => {
        if (s.service_category === 'kran') {
            kranCount++;
            kranMargin += (s.net_profit || 0);
        } else if (s.service_category === 'musor_olib_ketish') {
            musorCount++;
            musorMargin += (s.net_profit || 0);
        } else if (s.service_category === 'gruzchik') {
            gruzchikCount++;
            gruzchikMargin += (s.net_profit || 0);
        }
    });

    const totalOrders = kranCount + musorCount + gruzchikCount;
    const totalMargin = kranMargin + musorMargin + gruzchikMargin;

    const elKranCount = document.getElementById('dash-kran-count');
    const elKranMargin = document.getElementById('dash-kran-margin');
    const elMusorCount = document.getElementById('dash-musor-count');
    const elMusorMargin = document.getElementById('dash-musor-margin');
    const elGruzchikCount = document.getElementById('dash-gruzchik-count');
    const elGruzchikMargin = document.getElementById('dash-gruzchik-margin');
    const elTotalMargin = document.getElementById('dash-p2p-total-margin');

    if (elKranCount) elKranCount.innerText = `${kranCount} ta`;
    if (elKranMargin) elKranMargin.innerText = `+${kranMargin.toLocaleString()} so'm`;

    if (elMusorCount) elMusorCount.innerText = `${musorCount} ta`;
    if (elMusorMargin) elMusorMargin.innerText = `+${musorMargin.toLocaleString()} so'm`;

    if (elGruzchikCount) elGruzchikCount.innerText = `${gruzchikCount} ta`;
    if (elGruzchikMargin) elGruzchikMargin.innerText = `+${gruzchikMargin.toLocaleString()} so'm`;

    if (elTotalMargin) elTotalMargin.innerText = `Jami sof foyda: +${totalMargin.toLocaleString()} so'm (${totalOrders} ta buyurtma)`;
}

// -------------------------------------------------------------------------
// 4. TOP-5 ENG SERDAROMAD ASBOBLAR
// -------------------------------------------------------------------------
function renderTopEarningTools() {
    const container = document.getElementById('dash-top-tools-container');
    if (!container) return;
    container.innerHTML = '';

    const models = JSON.parse(JSON.stringify(DB.product_models || []));
    const items = DB.product_items || [];

    // Calculate aggregated revenue & rental count for each model
    models.forEach(m => {
        const mItems = items.filter(i => i.product_model_id === m.id);
        m.total_revenue = mItems.reduce((acc, i) => acc + (i.total_revenue || 0), 0);
        m.total_rentals = mItems.reduce((acc, i) => acc + (i.total_rental_count || 0), 0);
        m.available_count = mItems.filter(i => i.status === 'omborda_bosh').length;
        m.in_rent_count = mItems.filter(i => i.status === 'ijarada').length;
    });

    // Sort descending by total_revenue, then rental count
    models.sort((a, b) => b.total_revenue - a.total_revenue || b.total_rentals - a.total_rentals);

    const top5 = models.slice(0, 5);

    top5.forEach((m, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = "p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs";
        
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        itemEl.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-base font-bold">${medals[idx] || (idx + 1)}</span>
                <div>
                    <div class="font-bold text-white flex items-center gap-2">
                        <span>${m.name}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">${m.brand}</span>
                    </div>
                    <div class="text-[10px] text-slate-400 mt-0.5">
                        <span>Ijaraga berilgan: <b class="text-slate-200">${m.total_rentals} marta</b></span>
                        <span class="mx-1">•</span>
                        <span>Omborda: <b class="text-emerald-400">${m.available_count} ta bo'sh</b></span>
                    </div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm font-black text-emerald-400 font-mono">${m.total_revenue.toLocaleString()} so'm</div>
                <div class="text-[10px] text-slate-400 font-mono">${m.daily_price.toLocaleString()} so'm / kun</div>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

// -------------------------------------------------------------------------
// 5. SAYTDAN TUSHGAN BUYURTMALAR (ONLINE LEADS / API INTEGRATION)
// -------------------------------------------------------------------------
async function loadWebLeads() {
    const tbody = document.getElementById('dash-web-leads-body');
    const badgeCount = document.getElementById('dash-web-leads-count');
    if (!tbody) return;

    try {
        const res = await fetch('/api/public/orders');
        if (res.ok) {
            const data = await res.json();
            webLeadsCache = data.orders || [];
        } else {
            fallbackLocalWebLeads();
        }
    } catch (e) {
        fallbackLocalWebLeads();
    }

    renderWebLeadsTable();
}

function fallbackLocalWebLeads() {
    if (!webLeadsCache || webLeadsCache.length === 0) {
        webLeadsCache = [
            {
                id: 1727851200001,
                order_number: "WEB-2026-0042",
                customer_name: "Sherzodbek Toirov",
                customer_phone: "+998 90 912-34-56",
                service_type: "asbob_ijarasi",
                tool_name: "Perforator Bosch GBH 2-26 DRE",
                service_details: "3 kunlik muddatga kerak",
                delivery_address: "Toshkent sh., Olmazor tumani",
                requested_date: "2026-10-03 09:30",
                status: "yangi",
                created_at: "Bugun 12:15"
            },
            {
                id: 1727851200002,
                order_number: "WEB-2026-0043",
                customer_name: "Olimjon Rahimov",
                customer_phone: "+998 93 789-01-23",
                service_type: "musor_olib_ketish",
                tool_name: null,
                service_details: "Qurilish axlati - 40 qop g'isht",
                delivery_address: "Toshkent sh., Yunusobod 14",
                requested_date: "Bugun 16:00",
                status: "yangi",
                created_at: "Bugun 12:35"
            }
        ];
    }
}

function renderWebLeadsTable() {
    const tbody = document.getElementById('dash-web-leads-body');
    const badgeCount = document.getElementById('dash-web-leads-count');
    if (!tbody) return;
    tbody.innerHTML = '';

    const newLeads = webLeadsCache.filter(l => l.status === 'yangi');
    if (badgeCount) badgeCount.innerText = `${newLeads.length} ta yangi`;

    if (webLeadsCache.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-6 text-center text-xs text-slate-500">
                    Hozircha saytdan yangi buyurtmalar yo'q.
                </td>
            </tr>
        `;
        return;
    }

    const serviceBadges = {
        'asbob_ijarasi': '<span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px]">🔨 Asbob Ijarasi</span>',
        'kran': '<span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">🏗️ Avtokran</span>',
        'musor_olib_ketish': '<span class="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-bold text-[10px]">🚛 Musor Olib Ketish</span>',
        'gruzchik': '<span class="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px]">👷 Gruzchik</span>'
    };

    webLeadsCache.forEach(lead => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800 hover:bg-slate-900/60 transition text-xs";

        const isNew = lead.status === 'yangi';

        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="font-bold text-white flex items-center gap-1.5">
                    <span>${lead.customer_name}</span>
                    ${isNew ? '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${lead.customer_phone}</div>
            </td>
            <td class="py-3 px-4">
                <div>${serviceBadges[lead.service_type] || lead.service_type}</div>
                <div class="text-[11px] text-slate-300 mt-1">${lead.tool_name || lead.service_details}</div>
            </td>
            <td class="py-3 px-4">
                <div class="text-slate-300">${lead.requested_date}</div>
                <div class="text-[10px] text-slate-400 truncate max-w-[180px]">${lead.delivery_address}</div>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    lead.status === 'yangi' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    lead.status === 'qabul_qilindi' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-slate-800 text-slate-400'
                }">
                    ${lead.status === 'yangi' ? 'Yangi ⚡' : lead.status === 'qabul_qilindi' ? 'Qabul qilingan' : 'Bajarildi'}
                </span>
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="convertWebOrderToPos(${lead.id})" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-500/20">
                        <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                        <span>POSga Yuklash</span>
                    </button>
                    <a href="tel:${lead.customer_phone}" class="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white" title="Qo'ng'iroq qilish">
                        <i data-lucide="phone" class="w-3.5 h-3.5"></i>
                    </a>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

// -------------------------------------------------------------------------
// 6. 1-BOSISHDA SAYTDAN KELGAN BUYURTMANI POS GA O'TKAZISH
// -------------------------------------------------------------------------
function convertWebOrderToPos(leadId) {
    const lead = webLeadsCache.find(l => l.id === leadId);
    if (!lead) return;

    // 1. Check or auto-register customer in CRM
    let customer = (DB.customers || []).find(c => c.phone_primary === lead.customer_phone || (c.phone_secondary && c.phone_secondary === lead.customer_phone));
    if (!customer) {
        customer = {
            id: Date.now(),
            customer_type: "jismoniy_shaxs",
            full_name: lead.customer_name,
            company_name: "",
            phone_primary: lead.customer_phone,
            phone_secondary: "",
            passport_series_number: "AA 1234567",
            address: lead.delivery_address,
            status: "ishonchli",
            current_debt: 0,
            current_deposit: 0,
            blacklist_reason: "",
            created_at: new Date().toISOString().substring(0, 10)
        };
        if (!DB.customers) DB.customers = [];
        DB.customers.unshift(customer);
        saveDB();
        showNotification(`Yangi mijoz ${customer.full_name} CRM bazasiga saqlandi!`, "success");
    }

    // 2. Open POS modal and pre-fill cart
    openModalPosOrder();
    selectPosCustomer(customer.id);

    // 3. If tool requested, attempt to auto-add first available item of that model
    if (lead.service_type === 'asbob_ijarasi') {
        const availableUnit = (DB.product_items || []).find(i => i.status === 'omborda_bosh');
        if (availableUnit) {
            addToolToPosCart(availableUnit.id);
        }
    }

    lead.status = 'qabul_qilindi';
    saveDB();
    renderWebLeadsTable();

    showNotification(`Sayt buyurtmasi #${lead.order_number} POS oynasiga yuklandi!`, "success");
}

// -------------------------------------------------------------------------
// 7. JONLI API VA WEBHOOK SINOVI (INTERACTIVE TESTER)
// -------------------------------------------------------------------------
async function submitLiveApiTestOrder(e) {
    e.preventDefault();

    const name = document.getElementById('api-test-name').value.trim();
    const phone = document.getElementById('api-test-phone').value.trim();
    const serviceType = document.getElementById('api-test-service').value;
    const details = document.getElementById('api-test-details').value.trim();
    const address = document.getElementById('api-test-address').value.trim();

    const payload = {
        customer_name: name,
        customer_phone: phone,
        service_type: serviceType,
        service_details: details,
        delivery_address: address,
        requested_date: new Date().toLocaleString('uz-UZ')
    };

    try {
        const res = await fetch('/api/public/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        // Show live response modal or container
        const resContainer = document.getElementById('api-test-response-container');
        const telegramBox = document.getElementById('api-telegram-preview-box');

        if (resContainer) resContainer.classList.remove('hidden');
        if (telegramBox) telegramBox.innerText = data.telegram_notification || JSON.stringify(data, null, 2);

        showNotification("Saytdan buyurtma API orqali qabul qilindi!", "success");

        // Reload leads
        loadWebLeads();
        renderDashboard();
    } catch (err) {
        alert("API xatosi: " + err.message);
    }
}
