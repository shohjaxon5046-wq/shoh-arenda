// =========================================================================
// SECTION 5: YAGONA "BUYURTMALAR" (ZAKAZLAR / POS) VA OPERATOR ISH STOLI
// =========================================================================

let orderFilterStatus = ''; // '', 'faol_ijarada', 'kechikkan', 'yakunlandi', 'yangi'
let orderSearchQuery = '';

// POS Cart State
let posCart = {
    customerId: null,
    tools: [],    // [{ item_id, model_id, model_name, serial_number, daily_price, rent_days, total_rent, deposit_amount }]
    services: [], // [{ category, partner_id, partner_name, details, customer_price, partner_cost, margin }]
    startDate: '',
    returnDate: '',
    paymentMethod: 'naqd',
    paidAmount: 0,
    depositAmount: 0
};

// -------------------------------------------------------------------------
// 1. ORDERS DASHBOARD & KPI RENDERING
// -------------------------------------------------------------------------
function renderOrdersSection() {
    updateOrdersDelayStatus();
    renderOrdersKPIs();
    renderOrdersTable();
    lucide.createIcons();
}

// Automatically check overdue orders comparing expected_return_date with current date
function updateOrdersDelayStatus() {
    const now = new Date();
    (DB.orders || []).forEach(o => {
        if (o.status === 'faol_ijarada') {
            const expDate = new Date(o.expected_return_date);
            if (expDate < now) {
                o.status = 'kechikkan';
            }
        }
    });
}

function renderOrdersKPIs() {
    const orders = DB.orders || [];
    const activeRentals = orders.filter(o => o.status === 'faol_ijarada').length;
    const delayedCount = orders.filter(o => o.status === 'kechikkan').length;
    const completedCount = orders.filter(o => o.status === 'yakunlandi').length;

    let activeDepositsTotal = 0;
    orders.forEach(o => {
        if (o.status === 'faol_ijarada' || o.status === 'kechikkan') {
            activeDepositsTotal += (o.total_deposit_amount || 0);
        }
    });

    const elActive = document.getElementById('kpi-orders-active');
    const elDelayed = document.getElementById('kpi-orders-delayed');
    const elCompleted = document.getElementById('kpi-orders-completed');
    const elDeposits = document.getElementById('kpi-orders-deposits');

    if (elActive) elActive.innerText = activeRentals;
    if (elDelayed) {
        elDelayed.innerText = delayedCount;
        if (delayedCount > 0) {
            elDelayed.classList.add('text-red-400', 'animate-pulse');
        } else {
            elDelayed.classList.remove('text-red-400', 'animate-pulse');
        }
    }
    if (elCompleted) elCompleted.innerText = completedCount;
    if (elDeposits) elDeposits.innerText = `${activeDepositsTotal.toLocaleString()} so'm`;
}

function filterOrdersByStatus(status) {
    orderFilterStatus = status;
    
    // Update active tab buttons
    const filterBtns = ['btn-ord-all', 'btn-ord-active', 'btn-ord-delayed', 'btn-ord-completed'];
    filterBtns.forEach(bId => {
        const btn = document.getElementById(bId);
        if (!btn) return;
        btn.className = "px-3 py-1.5 rounded-xl text-xs font-semibold border border-transparent text-slate-400 hover:text-white transition";
    });

    const activeMap = {
        '': 'btn-ord-all',
        'faol_ijarada': 'btn-ord-active',
        'kechikkan': 'btn-ord-delayed',
        'yakunlandi': 'btn-ord-completed'
    };
    const activeBtn = document.getElementById(activeMap[status]);
    if (activeBtn) {
        activeBtn.className = "px-3 py-1.5 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-600/20 text-blue-400 transition";
    }

    renderOrdersTable();
}

function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('filter-orders-search')?.value || '').toLowerCase().trim();

    let filtered = (DB.orders || []).filter(o => {
        const matchStatus = !orderFilterStatus || o.status === orderFilterStatus;
        const customer = (DB.customers || []).find(c => c.id === o.customer_id);
        const matchSearch = !query || 
                            o.order_number.toLowerCase().includes(query) ||
                            (customer && customer.full_name.toLowerCase().includes(query)) ||
                            (customer && customer.phone_primary.includes(query));
        return matchStatus && matchSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-500">Hech qanday buyurtma topilmadi</td></tr>`;
        return;
    }

    const statusBadges = {
        yangi: '<span class="badge-status bg-slate-500/10 text-slate-400 border border-slate-500/20">Yangi</span>',
        faol_ijarada: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span> Ijarada</span>',
        kechikkan: '<span class="badge-status bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1 font-bold animate-pulse"><i data-lucide="alert-triangle" class="w-3 h-3"></i> Kechikkan!</span>',
        yakunlandi: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Yakunlandi </span>',
        bekor_qilindi: '<span class="badge-status bg-slate-800 text-slate-400">Bekor qilindi</span>'
    };

    filtered.forEach(o => {
        const customer = (DB.customers || []).find(c => c.id === o.customer_id);
        const tools = (DB.order_tool_items || []).filter(t => t.order_id === o.id);
        const services = (DB.order_service_items || []).filter(s => s.order_id === o.id);

        const isDelayed = o.status === 'kechikkan';
        const tr = document.createElement('tr');
        tr.className = `hover:bg-slate-800/40 transition ${isDelayed ? 'bg-red-950/15 border-l-2 border-red-500' : ''}`;

        // Overdue days calculation
        let delayBadge = '';
        if (isDelayed) {
            const exp = new Date(o.expected_return_date);
            const now = new Date();
            const diffHours = Math.max(1, Math.round((now - exp) / (1000 * 60 * 60)));
            const diffDays = Math.max(1, Math.ceil(diffHours / 24));
            delayBadge = `<div class="text-[10px] text-rose-400 font-semibold mt-0.5">${diffDays} kun kechikdi (${diffHours} soat)</div>`;
        }

        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="font-mono font-bold text-white flex items-center gap-1.5">
                    <span>${o.order_number}</span>
                </div>
                <div class="text-[10px] text-slate-400 font-mono">${o.created_at || o.start_date}</div>
            </td>
            <td class="py-3 px-4">
                <div class="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span>${customer ? customer.full_name : 'Noma\'lum Mijoz'}</span>
                    ${customer?.status === 'vip' ? '<span class="text-amber-400 text-xs"></span>' : ''}
                    ${customer?.status === 'qora_royxat' ? '<span class="text-red-400 text-xs font-bold font-mono"> BLOK</span>' : ''}
                </div>
                <div class="text-[10px] text-slate-400 flex items-center gap-1">
                    <i data-lucide="phone" class="w-3 h-3 text-blue-400"></i>
                    <a href="tel:${customer?.phone_primary || ''}" class="hover:text-blue-400 font-mono text-slate-300 underline">${customer?.phone_primary || '-'}</a>
                </div>
            </td>
            <td class="py-3 px-4">
                <div class="space-y-1">
                    ${tools.map(t => {
                        const locCode = t.location_code || (typeof getLocationCode === 'function' ? getLocationCode(t.warehouse_location_id) : 'A-01-01');
                        const isPicked = t.picking_status === 'olib_chiqildi';
                        return `
                            <div class="flex items-center gap-1.5 text-xs text-slate-200">
                                <span class="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-blue-300">${t.serial_number}</span>
                                <span class="px-1 py-0.2 rounded bg-indigo-950 border border-indigo-500/40 text-[9px] font-mono font-bold text-amber-300"> ${locCode}</span>
                                <span class="truncate max-w-[130px]">${t.model_name}</span>
                                ${isPicked ? '<span class="text-[9px] text-emerald-400 font-bold" title="Ombordan olib chiqildi"></span>' : '<span class="text-[9px] text-amber-400" title="Olib chiqish kutilmoqda">⏳</span>'}
                                <span class="text-[10px] text-slate-400">(${t.rent_days} kun)</span>
                            </div>
                        `;
                    }).join('')}
                    ${services.map(s => `
                        <div class="flex items-center gap-1.5 text-xs text-amber-300">
                            <span class="px-1.5 py-0.2 rounded bg-amber-500/10 text-[10px] uppercase font-bold text-amber-400">${s.service_category}</span>
                            <span class="truncate max-w-[170px]">${s.service_details}</span>
                        </div>
                    `).join('')}
                    ${tools.length === 0 && services.length === 0 ? '<span class="text-slate-500 text-xs">Tarkib bo\'sh</span>' : ''}
                </div>
            </td>
            <td class="py-3 px-4">
                <div class="text-xs">
                    <span class="text-slate-400">Qaytarish:</span>
                    <b class="text-white ml-1 font-mono">${o.expected_return_date ? o.expected_return_date.substring(0, 16) : '-'}</b>
                </div>
                ${delayBadge}
            </td>
            <td class="py-3 px-4">
                <div class="text-xs font-bold text-white font-mono">${(o.final_amount || 0).toLocaleString()} so'm</div>
                <div class="text-[10px] text-slate-400">Zalog: <b class="text-amber-400 font-mono">${(o.total_deposit_amount || 0).toLocaleString()}</b></div>
            </td>
            <td class="py-3 px-4">
                ${statusBadges[o.status] || o.status}
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    ${isDelayed ? `
                        <a href="tel:${customer?.phone_primary || ''}" class="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white flex items-center gap-1" title="Mijozga zudlik bilan qo'ng'iroq qilish">
                            <i data-lucide="phone-call" class="w-3.5 h-3.5"></i>
                            <span>Qo'ng'iroq</span>
                        </a>
                    ` : ''}

                    ${(o.status === 'faol_ijarada' || o.status === 'kechikkan') && tools.length > 0 ? `
                        <button onclick="openOrderReturnModal(${o.id})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1">
                            <i data-lucide="corner-down-left" class="w-3.5 h-3.5"></i>
                            <span>Priyomka</span>
                        </button>
                    ` : ''}

                    <!-- WMS Pick List Button -->
                    ${tools.length > 0 ? `
                        <button onclick="openPickListModal(${o.id})" class="p-1.5 rounded-lg border border-purple-800/60 bg-purple-950/40 hover:bg-purple-900/60 text-purple-400 hover:text-white" title="Sborshik varag'i (Pick List)">
                            <i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}

                    <!-- WMS Barcode Picking Scanner Button -->
                    ${tools.length > 0 && (o.status === 'faol_ijarada' || o.status === 'yangi') ? `
                        <button onclick="openPickingVerificationModal(${o.id})" class="p-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 hover:text-white" title="Skaner orqali olib chiqish (Picking)">
                            <i data-lucide="scan" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}

                    <button onclick="openOrderReceiptModal(${o.id})" class="p-1.5 rounded-lg border border-blue-800/60 bg-blue-950/40 hover:bg-blue-900/60 text-blue-400 hover:text-white" title="Elektron Chek & Kvitansiya (Telegram / Web / Termo / Shartnoma)">
                        <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                    </button>

                    <button onclick="printOrderContract(${o.id})" class="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white" title="Tilxat / Shartnomani Chop Etish">
                        <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                    </button>

                    <button onclick="openOrderDetailModal(${o.id})" class="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white" title="Batafsil">
                        <i data-lucide="eye" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    lucide.createIcons();
}


// -------------------------------------------------------------------------
// 2. POS SCREEN: TEZKOR 1-MINUTLIK BUYURTMA RASMIYLASHTIRISH
// -------------------------------------------------------------------------
function openModalPosOrder() {
    try {
        // Reset state
        posCart = {
            customerId: null,
            tools: [],
            services: [],
            startDate: new Date().toISOString().substring(0, 16),
            returnDate: '',
            paymentMethod: 'naqd',
            paidAmount: 0,
            depositAmount: 0
        };

        // Default expected return: tomorrow same hour (+24 hours)
        const tom = new Date();
        tom.setDate(tom.getDate() + 1);
        posCart.returnDate = tom.toISOString().substring(0, 16);

        // Inputs reset safely
        const searchInput = document.getElementById('pos-customer-search');
        if (searchInput) searchInput.value = '';

        const selectedCard = document.getElementById('pos-customer-selected-card');
        if (selectedCard) {
            selectedCard.classList.add('hidden');
            selectedCard.style.setProperty('display', 'none', 'important');
        }

        const pickerArea = document.getElementById('pos-customer-picker-area');
        if (pickerArea) {
            pickerArea.classList.remove('hidden');
            pickerArea.style.setProperty('display', 'block', 'important');
        }

        const warningBanner = document.getElementById('pos-customer-warning-banner');
        if (warningBanner) {
            warningBanner.classList.add('hidden');
            warningBanner.style.setProperty('display', 'none', 'important');
        }

        const startDt = document.getElementById('pos-start-datetime');
        if (startDt) startDt.value = posCart.startDate;

        const returnDt = document.getElementById('pos-return-datetime');
        if (returnDt) returnDt.value = posCart.returnDate;

        // Populate available warehouse units
        try { if (typeof populateAvailablePosTools === 'function') populateAvailablePosTools(); } catch (e) { console.warn(e); }

        // Populate service partners
        try { if (typeof populatePosPartnersSelect === 'function') populatePosPartnersSelect(); } catch (e) { console.warn(e); }

        // Initialize Dynamic Service Calculator
        try { if (typeof onPosServiceCategoryChange === 'function') onPosServiceCategoryChange(); } catch (e) { console.warn(e); }

        try { if (typeof renderPosCartItems === 'function') renderPosCartItems(); } catch (e) { console.warn(e); }

    } catch (err) {
        console.error("openModalPosOrder initialization warning:", err);
    }

    openModal('modal-pos-new-order');
    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (e) {}
}

window.openModalPosOrder = openModalPosOrder;

function populateAvailablePosTools() {
    const select = document.getElementById('pos-tool-unit-select');
    if (!select) return;

    // Filter units strictly where status === 'omborda_bosh'
    const availableUnits = (DB.product_items || []).filter(u => u.status === 'omborda_bosh');

    select.innerHTML = '<option value="">-- Bo\'sh turgan asbobni tanlang --</option>' +
        availableUnits.map(u => {
            const model = (DB.product_models || []).find(m => m.id === u.product_model_id);
            const modelName = model ? model.name : 'Asbob';
            const price = model ? model.daily_price : 0;
            const locCode = typeof getLocationCode === 'function' ? getLocationCode(u.warehouse_location_id) : 'A-01-01';
            return `<option value="${u.id}">${modelName} | SN: ${u.serial_number} [ ${locCode}] (${price.toLocaleString()} so'm/kun)</option>`;
        }).join('');

    select.onchange = function() {
        if (typeof onPosToolSelectChange === 'function') onPosToolSelectChange();
    };
}

function populatePosPartnersSelect() {
    const pSelect = document.getElementById('pos-service-partner-select');
    if (!pSelect) return;

    pSelect.innerHTML = '<option value="">-- Ijrochi hamkorni tanlang --</option>' +
        (DB.service_partners || []).map(p => `
            <option value="${p.id}">${p.company_name} (${p.service_category} -  ${p.rating})</option>
        `).join('');
}

// Live search customer in POS
function handlePosCustomerSearch() {
    const q = (document.getElementById('pos-customer-search')?.value || '').toLowerCase().trim();
    const resultsContainer = document.getElementById('pos-customer-search-results');
    if (!resultsContainer) return;

    if (!q || q.length < 2) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    const matched = (DB.customers || []).filter(c => 
        c.full_name.toLowerCase().includes(q) ||
        c.phone_primary.includes(q) ||
        c.passport_series_number.toLowerCase().includes(q)
    );

    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    if (matched.length === 0) {
        resultsContainer.innerHTML = `
            <div class="p-3 text-xs text-slate-400 flex justify-between items-center">
                <span>Mijoz topilmadi</span>
                <button type="button" onclick="quickCreateCustomerFromPOS('${q}')" class="px-2 py-1 rounded bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold">
                    + Yangi Mijoz Ochish
                </button>
            </div>
        `;
        return;
    }

    matched.forEach(c => {
        const item = document.createElement('div');
        item.className = "p-2.5 hover:bg-slate-800 cursor-pointer border-b border-slate-800/60 flex items-center justify-between text-xs";
        item.onclick = () => selectPosCustomer(c.id);

        item.innerHTML = `
            <div>
                <div class="font-bold text-white flex items-center gap-1.5">
                    <span>${c.full_name}</span>
                    ${c.status === 'vip' ? '<span class="text-amber-400"> VIP</span>' : ''}
                    ${c.status === 'qora_royxat' ? '<span class="text-red-400 font-bold bg-red-500/10 px-1 rounded"> QORA RO\'YXAT</span>' : ''}
                </div>
                <div class="text-[11px] text-slate-400 font-mono">${c.phone_primary} | Pasport: ${c.passport_series_number}</div>
            </div>
            <div class="text-right">
                ${c.current_debt > 0 ? `<span class="text-red-400 font-bold">${c.current_debt.toLocaleString()} qarz</span>` : '<span class="text-emerald-400 font-semibold">Qarzi yo\'q</span>'}
            </div>
        `;
        resultsContainer.appendChild(item);
    });
}

function selectPosCustomer(customerId) {
    const customer = (DB.customers || []).find(c => c.id === customerId);
    if (!customer) return;

    posCart.customerId = customer.id;

    document.getElementById('pos-customer-search-results').classList.add('hidden');
    document.getElementById('pos-customer-picker-area').classList.add('hidden');
    
    const card = document.getElementById('pos-customer-selected-card');
    card.classList.remove('hidden');

    document.getElementById('pos-card-cust-name').innerText = customer.full_name;
    document.getElementById('pos-card-cust-phone').innerText = customer.phone_primary;
    document.getElementById('pos-card-cust-doc').innerText = customer.passport_series_number;

    // Warning Banner if Blacklisted or Debtor
    const warningBox = document.getElementById('pos-customer-warning-banner');
    if (customer.status === 'qora_royxat') {
        warningBox.classList.remove('hidden');
        warningBox.className = "p-3 rounded-xl bg-red-950/80 border-2 border-red-500 text-xs text-red-200 flex items-start gap-2.5 animate-pulse mb-3";
        warningBox.innerHTML = `
            <i data-lucide="alert-octagon" class="w-5 h-5 text-red-400 shrink-0 mt-0.5"></i>
            <div>
                <b class="text-red-400 uppercase tracking-wide"> XAVF: Ushbu mijoz QORA RO'YXATDA!</b>
                <p class="mt-0.5">Sababi: ${customer.blacklist_reason || 'Qarzdorlik yoki asbobni qaytarmaslik'}. Asbob berish taqiqlanadi!</p>
            </div>
        `;
    } else if (customer.current_debt > 0) {
        warningBox.classList.remove('hidden');
        warningBox.className = "p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5 mb-3";
        warningBox.innerHTML = `
            <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-400 shrink-0 mt-0.5"></i>
            <div>
                <b class="text-amber-400">Ogohlantirish: Mijozda ${customer.current_debt.toLocaleString()} so'm oldingi qarz mavjud!</b>
            </div>
        `;
    } else {
        warningBox.classList.add('hidden');
    }

    lucide.createIcons();
}

function deselectPosCustomer() {
    posCart.customerId = null;
    document.getElementById('pos-customer-selected-card').classList.add('hidden');
    document.getElementById('pos-customer-picker-area').classList.remove('hidden');
    document.getElementById('pos-customer-warning-banner').classList.add('hidden');
    document.getElementById('pos-customer-search').value = '';
}

function quickCreateCustomerFromPOS(queryName) {
    const name = prompt("Mijoz F.I.O ni tasdiqlang:", queryName);
    if (!name) return;
    const phone = prompt("Mijoz telefon raqami (+998):", "+998 ");
    if (!phone) return;
    const doc = prompt("Pasport seriya yoki JShShIR:", "AA ");

    const newCust = {
        id: Date.now(),
        customer_type: "jismoniy_shaxs",
        full_name: name.trim(),
        company_name: "",
        phone_primary: phone.trim(),
        phone_secondary: "",
        passport_series_number: (doc || 'NOMA\'LUM').trim(),
        passport_scan_url: "",
        current_debt: 0,
        current_deposit: 0,
        status: "oddiy",
        blacklist_reason: "",
        notes: "POS orqali tezkor qo'shildi",
        created_at: new Date().toISOString().split('T')[0]
    };

    if (!DB.customers) DB.customers = [];
    DB.customers.unshift(newCust);
    saveDB();
    selectPosCustomer(newCust.id);
    showNotification("Yangi mijoz bazaga saqlandi va tanlandi!", "success");
}

// Add Tool to POS Cart
function addToolToPosCart() {
    const select = document.getElementById('pos-tool-unit-select');
    const unitId = parseInt(select.value);
    const rentDays = parseInt(document.getElementById('pos-tool-days-input').value) || 1;

    if (!unitId) {
        alert("Iltimos, avval omborda bo'sh bo'lgan asbobni tanlang!");
        return;
    }

    // Check if already in cart
    if (posCart.tools.some(t => t.item_id === unitId)) {
        alert("Bu asbob allaqachon savatga qo'shilgan!");
        return;
    }

    const unit = (DB.product_items || []).find(u => u.id === unitId);
    if (!unit || unit.status !== 'omborda_bosh') {
        alert("Ushbu asbob ayni vaqtda omborda mavjud emas!");
        return;
    }

    const model = (DB.product_models || []).find(m => m.id === unit.product_model_id);
    if (!model) return;

    // Calculate price with discounts
    let appliedDailyPrice = model.daily_price;
    if (rentDays >= 7 && model.discount_7_days) {
        appliedDailyPrice = model.discount_7_days;
    } else if (rentDays >= 3 && model.discount_3_days) {
        appliedDailyPrice = model.discount_3_days;
    }

    const totalToolRent = appliedDailyPrice * rentDays;
    const depositAmount = model.deposit_amount || 0;

    posCart.tools.push({
        item_id: unit.id,
        model_id: model.id,
        model_name: model.name,
        serial_number: unit.serial_number,
        warehouse_location_id: unit.warehouse_location_id,
        location_code: typeof getLocationCode === 'function' ? getLocationCode(unit.warehouse_location_id) : 'A-01-01',
        location_display: typeof formatLocationDisplay === 'function' ? formatLocationDisplay(unit.warehouse_location_id) : '',
        daily_price: appliedDailyPrice,
        rent_days: rentDays,
        total_rent: totalToolRent,
        deposit_amount: depositAmount,
        kit_items: model.kit_items || []
    });

    select.value = '';
    const alertBox = document.getElementById('pos-tool-location-alert');
    if (alertBox) {
        alertBox.classList.add('hidden');
        alertBox.innerHTML = '';
    }
    renderPosCartItems();
}

function removeToolFromPosCart(index) {
    posCart.tools.splice(index, 1);
    renderPosCartItems();
}

// Add External Service (Kran, Musor, Gruzchik) to POS Cart
function addServiceToPosCart() {
    const cat = document.getElementById('pos-service-category').value;
    const partnerId = parseInt(document.getElementById('pos-service-partner-select').value);
    const details = document.getElementById('pos-service-details').value.trim();
    const custPrice = parseFloat(document.getElementById('pos-service-cust-price').value) || 0;
    const partnerCost = parseFloat(document.getElementById('pos-service-partner-cost').value) || 0;

    if (!partnerId) {
        alert("Iltimos, hamkorni tanlang!");
        return;
    }
    if (!details) {
        alert("Ish tafsiloti va manzilini yozing!");
        return;
    }
    if (custPrice <= 0) {
        alert("Mijoz to'laydigan narxni kiriting!");
        return;
    }

    const partner = (DB.service_partners || []).find(p => p.id === partnerId);
    const margin = custPrice - partnerCost;
    const taskInst = (typeof currentCalcResult !== 'undefined' && currentCalcResult && currentCalcResult.taskInstruction) 
        ? currentCalcResult.taskInstruction 
        : `Vazifa: ${details}`;
    const calcParams = (typeof currentCalcResult !== 'undefined' && currentCalcResult) 
        ? currentCalcResult.params 
        : null;

    posCart.services.push({
        category: cat,
        partner_id: partnerId,
        partner_name: partner ? partner.company_name : 'Hamkor',
        details: details,
        customer_price: custPrice,
        partner_cost: partnerCost,
        margin: margin,
        task_instruction: taskInst,
        calc_params: calcParams
    });

    // Reset inputs
    document.getElementById('pos-service-details').value = '';
    const detailsInput = document.getElementById('pos-service-details');
    if (detailsInput) delete detailsInput.dataset.autoFilled;

    renderPosCartItems();
}

function removeServiceFromPosCart(index) {
    posCart.services.splice(index, 1);
    renderPosCartItems();
}

function renderPosCartItems() {
    const container = document.getElementById('pos-cart-items-container');
    if (!container) return;
    container.innerHTML = '';

    if (posCart.tools.length === 0 && posCart.services.length === 0) {
        container.innerHTML = `
            <div class="py-8 text-center text-slate-500 text-xs">
                <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                Savat bo'sh. Asbob yoki tashqi xizmat qo'shing.
            </div>
        `;
        calculatePosSummary();
        lucide.createIcons();
        return;
    }

    // 1. Tool items list
    posCart.tools.forEach((t, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = "p-3 rounded-xl border border-slate-800 bg-slate-950 flex flex-col gap-2 text-xs";
        const locBadge = typeof renderWmsLocationBadgeHtml === 'function'
            ? renderWmsLocationBadgeHtml(t.warehouse_location_id)
            : `<div class="text-[10px] text-indigo-300"> ${t.location_display || t.location_code}</div>`;

        itemEl.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs"></div>
                    <div>
                        <div class="font-bold text-white leading-tight">${t.model_name}</div>
                        <div class="text-[10px] text-slate-400 font-mono">SN: ${t.serial_number} | ${t.rent_days} kun x ${t.daily_price.toLocaleString()}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="text-right">
                        <div class="font-bold text-white font-mono">${t.total_rent.toLocaleString()} so'm</div>
                        <div class="text-[10px] text-amber-400 font-mono">Zalog: ${t.deposit_amount.toLocaleString()}</div>
                    </div>
                    <button type="button" onclick="removeToolFromPosCart(${idx})" class="p-1 rounded text-red-400 hover:bg-slate-800">
                        <i data-lucide="trash" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            ${locBadge}
        `;
        container.appendChild(itemEl);
    });

    // 2. Service items list
    posCart.services.forEach((s, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = "p-3 rounded-xl border border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs";
        itemEl.innerHTML = `
            <div class="flex items-start gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"></div>
                <div>
                    <div class="font-bold text-amber-300 leading-tight flex items-center gap-1.5">
                        <span>${s.category.toUpperCase()}</span>
                        <span class="text-slate-400 font-normal">&bull; ${s.partner_name}</span>
                    </div>
                    <div class="text-[11px] text-white mt-0.5 font-medium">${s.details}</div>
                    ${s.task_instruction ? `
                        <div class="text-[10px] text-slate-400 font-mono italic mt-1 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                             Hamkor topshirig'i: ${s.task_instruction}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="flex items-center gap-3 self-end sm:self-center">
                <div class="text-right">
                    <div class="font-bold text-white font-mono">${s.customer_price.toLocaleString()} so'm</div>
                    <div class="text-[10px] text-emerald-400 font-mono">Marja: +${s.margin.toLocaleString()}</div>
                </div>
                <button type="button" onclick="removeServiceFromPosCart(${idx})" class="p-1 rounded text-red-400 hover:bg-slate-800">
                    <i data-lucide="trash" class="w-4 h-4"></i>
                </button>
            </div>
        `;
        container.appendChild(itemEl);
    });

    calculatePosSummary();
    lucide.createIcons();
}

function calculatePosSummary() {
    let rentTotal = 0;
    let depositTotal = 0;

    posCart.tools.forEach(t => {
        rentTotal += t.total_rent;
        depositTotal += t.deposit_amount;
    });

    posCart.services.forEach(s => {
        rentTotal += s.customer_price;
    });

    document.getElementById('pos-sum-rent').innerText = `${rentTotal.toLocaleString()} so'm`;
    document.getElementById('pos-sum-deposit').innerText = `${depositTotal.toLocaleString()} so'm`;
    document.getElementById('pos-sum-grand').innerText = `${(rentTotal + depositTotal).toLocaleString()} so'm`;

    // Default: paid full rent + deposit
    const inputPaid = document.getElementById('pos-input-paid');
    const inputDeposit = document.getElementById('pos-input-deposit');

    if (inputPaid && !inputPaid.dataset.manual) {
        inputPaid.value = rentTotal;
    }
    if (inputDeposit && !inputDeposit.dataset.manual) {
        inputDeposit.value = depositTotal;
    }
}

// Complete Checkout & Save Order
function handleCheckoutPosOrder(e) {
    e.preventDefault();

    if (!posCart.customerId) {
        alert("Iltimos, avval mijozni qidirib tanlang!");
        return;
    }

    if (posCart.tools.length === 0 && posCart.services.length === 0) {
        alert("Savat bo'sh! Kamida bitta asbob yoki xizmat qo'shilishi shart.");
        return;
    }

    const customer = (DB.customers || []).find(c => c.id === posCart.customerId);
    if (customer && customer.status === 'qora_royxat') {
        if (!confirm("DIQQAT: Ushbu mijoz QORA RO'YXATDA! Baribir buyurtma ochishni tasdiqlaysizmi?")) {
            return;
        }
    }

    const startDateTime = document.getElementById('pos-start-datetime').value || new Date().toISOString().substring(0, 16);
    const returnDateTime = document.getElementById('pos-return-datetime').value;
    if (!returnDateTime) {
        alert("Iltimos, kutilayotgan qaytarish sanasi va vaqtini belgilang!");
        return;
    }

    let totalRentAmount = 0;
    let totalDepositAmount = 0;
    posCart.tools.forEach(t => {
        totalRentAmount += t.total_rent;
        totalDepositAmount += t.deposit_amount;
    });
    posCart.services.forEach(s => {
        totalRentAmount += s.customer_price;
    });

    const paidAmount = parseFloat(document.getElementById('pos-input-paid').value) || 0;
    const paidDeposit = parseFloat(document.getElementById('pos-input-deposit').value) || 0;
    const paymentMethod = document.getElementById('pos-payment-method').value;
    const remainingDebt = Math.max(0, totalRentAmount - paidAmount);

    const newOrderId = Date.now();
    const orderNumber = `ORD-2026-${String((DB.orders || []).length + 1).padStart(4, '0')}`;

    // 1. Create Order
    const newOrder = {
        id: newOrderId,
        order_number: orderNumber,
        customer_id: customer.id,
        created_by_user_id: currentUser ? currentUser.id : 1,
        status: "faol_ijarada",
        total_rent_amount: totalRentAmount,
        total_deposit_amount: paidDeposit,
        final_amount: totalRentAmount,
        paid_amount: paidAmount,
        remaining_debt: remainingDebt,
        start_date: startDateTime,
        expected_return_date: returnDateTime,
        actual_return_date: null,
        created_at: new Date().toLocaleString('uz-UZ'),
        notes: `Operator: ${currentUser ? currentUser.full_name : 'Admin'}`
    };

    if (!DB.orders) DB.orders = [];
    DB.orders.unshift(newOrder);

    // 2. Attach Tools & Update Inventory Status to 'ijarada'!
    if (!DB.order_tool_items) DB.order_tool_items = [];
    posCart.tools.forEach(t => {
        DB.order_tool_items.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            order_id: newOrderId,
            product_item_id: t.item_id,
            model_name: t.model_name,
            serial_number: t.serial_number,
            warehouse_location_id: t.warehouse_location_id,
            original_location_id: t.warehouse_location_id,
            location_code: t.location_code,
            picking_status: "kutilmoqda",
            picked_at: null,
            daily_price: t.daily_price,
            rent_days: t.rent_days,
            total_tool_rent: t.total_rent,
            deposit_price: t.deposit_amount,
            return_status: "mijozda",
            kit_check_result: (t.kit_items || []).reduce((acc, k) => { acc[k] = true; return acc; }, {}),
            penalty_amount: 0
        });

        // Update product item status in warehouse -> strictly 'ijarada'
        const unit = (DB.product_items || []).find(u => u.id === t.item_id);
        if (unit) {
            unit.status = 'ijarada';
            unit.total_rental_count = (unit.total_rental_count || 0) + 1;
            unit.total_revenue = (unit.total_revenue || 0) + t.total_rent;
        }
    });

    // 3. Attach External Services & Integrate with Dispatcher
    if (!DB.order_service_items) DB.order_service_items = [];
    posCart.services.forEach(s => {
        DB.order_service_items.push({
            id: Date.now() + Math.floor(Math.random() * 1000),
            order_id: newOrderId,
            service_category: s.category,
            assigned_partner_id: s.partner_id,
            service_details: s.details,
            task_instruction: s.task_instruction || '',
            calc_params: s.calc_params || null,
            customer_price: s.customer_price,
            partner_cost: s.partner_cost,
            profit_margin: s.margin,
            execution_status: "hamkorga_yuborildi"
        });

        // Also push to Section 4 Service Orders journal
        if (!DB.service_orders) DB.service_orders = [];
        DB.service_orders.unshift({
            id: Date.now() + Math.floor(Math.random() * 1000),
            order_number: `SRV-${orderNumber}`,
            customer_id: customer.id,
            service_category: s.category,
            order_date: startDateTime.substring(0, 10),
            service_date: startDateTime.substring(0, 10),
            execution_time: startDateTime.substring(11, 16),
            destination_address: s.details,
            details: s.details,
            task_instruction: s.task_instruction || '',
            calc_params: s.calc_params || null,
            assigned_partner_id: s.partner_id,
            customer_total_price: s.customer_price,
            partner_payout_amount: s.partner_cost,
            net_profit: s.margin,
            order_status: "hamkorga_uzatildi",
            payment_status: "tolandi",
            created_at: new Date().toLocaleString('uz-UZ')
        });
    });

    // 4. Record Payments
    if (!DB.order_payments) DB.order_payments = [];
    if (paidDeposit > 0) {
        DB.order_payments.push({
            id: Date.now() + 1,
            order_id: newOrderId,
            customer_id: customer.id,
            payment_type: "zalog_olindi",
            amount: paidDeposit,
            payment_method: paymentMethod,
            cashier_user_id: currentUser ? currentUser.id : 1,
            date: new Date().toLocaleString('uz-UZ')
        });
        customer.current_deposit = (customer.current_deposit || 0) + paidDeposit;
    }

    if (paidAmount > 0) {
        DB.order_payments.push({
            id: Date.now() + 2,
            order_id: newOrderId,
            customer_id: customer.id,
            payment_type: "ijara_haqi",
            amount: paidAmount,
            payment_method: paymentMethod,
            cashier_user_id: currentUser ? currentUser.id : 1,
            date: new Date().toLocaleString('uz-UZ')
        });
    }

    if (remainingDebt > 0) {
        customer.current_debt = (customer.current_debt || 0) + remainingDebt;
    }

    // Save & Refresh
    saveDB();
    closeModal('modal-pos-new-order');
    renderOrdersSection();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderCatalogCards === 'function') renderCatalogCards();

    showNotification(`Buyurtma ${orderNumber} rasmiylashtirildi!`, "success");

    // Open Electronic Receipt & Contract Modal
    if (typeof openOrderReceiptModal === 'function') {
        openOrderReceiptModal(newOrderId, 'rtab-web');
    } else {
        printOrderContract(newOrderId);
    }
}


// -------------------------------------------------------------------------
// 3. PRIYOMKA (VOZVRAT / QABUL QILISH) MODALI VA JARIMALAR
// -------------------------------------------------------------------------
let currentReturnOrder = null;

function openOrderReturnModal(orderId) {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    currentReturnOrder = order;
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id && t.return_status === 'mijozda');

    document.getElementById('ret-order-num').innerText = order.order_number;
    document.getElementById('ret-customer-name').innerText = customer ? customer.full_name : 'Mijoz';
    document.getElementById('ret-expected-date').innerText = order.expected_return_date;

    // Check delay & calculate late penalty automatically
    const exp = new Date(order.expected_return_date);
    const now = new Date();
    let delayDays = 0;
    let lateFee = 0;

    if (now > exp) {
        const diffHours = Math.max(1, Math.round((now - exp) / (1000 * 60 * 60)));
        delayDays = Math.ceil(diffHours / 24);
        // Average penalty: 1 day rent per delayed day
        tools.forEach(t => {
            lateFee += (t.daily_price * delayDays);
        });
    }

    document.getElementById('ret-delay-days').innerText = delayDays > 0 ? `${delayDays} kun kechikish` : 'Vaqtida keldi ';
    document.getElementById('ret-delay-penalty').value = lateFee;

    // Render Checklist for each rented tool with WMS Putaway placement
    const checklistContainer = document.getElementById('ret-tools-checklist-container');
    checklistContainer.innerHTML = '';

    tools.forEach((t, idx) => {
        const model = (DB.product_models || []).find(m => m.id === t.product_model_id);
        const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
        const kitList = t.kit_check_result ? Object.keys(t.kit_check_result) : (model?.kit_items || ["Keys", "Elektr simi", "Patron"]);

        const origLocId = t.original_location_id || (unit ? unit.warehouse_location_id : 1);
        const origLocText = typeof formatLocationDisplay === 'function' ? formatLocationDisplay(origLocId) : 'Sektor A | 1-Polka';
        const origLocCode = typeof getLocationCode === 'function' ? getLocationCode(origLocId) : 'A-01-01';
        const origOcc = typeof getLocationOccupancy === 'function' ? getLocationOccupancy(origLocId) : { count: 0, max: 4, isFull: false };

        const locOptions = (DB.warehouse_locations || []).map(loc => {
            const occ = typeof getLocationOccupancy === 'function' ? getLocationOccupancy(loc.id) : { count: 0, max: 4, isFull: false };
            const statusLabel = occ.isFull ? " [TO'LGAN]" : (occ.isEmpty ? " [Bo'sh]" : ` [Band: ${occ.count}/${occ.max}]`);
            const selected = loc.id === origLocId ? 'selected' : '';
            return `<option value="${loc.id}" ${selected}>${loc.code}: ${loc.zone || loc.sector} - ${loc.shelf} (${loc.bin})${statusLabel}</option>`;
        }).join('');

        const div = document.createElement('div');
        div.className = "p-3.5 rounded-xl border border-slate-800 bg-slate-950 space-y-3 text-xs";
        div.innerHTML = `
            <div class="flex justify-between items-center pb-2 border-b border-slate-800">
                <div class="font-bold text-white flex items-center gap-1.5">
                    <span> ${t.model_name}</span>
                    <span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-blue-300">${t.serial_number}</span>
                </div>
                <div>
                    <select id="ret-unit-condition-${t.id}" class="rounded-lg border border-slate-700 bg-slate-800 text-[11px] py-1 px-2 text-slate-200" onchange="calculateReturnDepositRefund()">
                        <option value="butun">Soz (Nuqsonsiz)</option>
                        <option value="remont">Buzilgan (Remont talab)</option>
                        <option value="yoqolgan">Yo'qolgan / Yaroqsiz</option>
                    </select>
                </div>
            </div>

            <!-- WMS PUTAWAY / POLKAGA QAYTA JOYLASHTIRISH BLOKI -->
            <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div>
                        <span class="text-[10px] text-slate-400 uppercase font-bold block">Asbobning Asl Joyi (WMS Putaway):</span>
                        <b class="text-xs text-white flex items-center gap-1.5">
                            <span>${origLocText}</span>
                        </b>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-xs border border-amber-400/30">
                            Kod: ${origLocCode}
                        </span>
                        ${origOcc.isFull ? '<span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">Polka to\'lgan</span>' : '<span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">Joy bor</span>'}
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-800/80">
                    <label class="block text-[10px] text-slate-400 font-semibold mb-1">Joyni o'zgartirish (Re-location agar polka to'lgan bo'lsa):</label>
                    <select id="ret-putaway-loc-${t.id}" class="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2 text-[11px] text-white">
                        ${locOptions}
                    </select>
                </div>

                <div class="pt-2 border-t border-slate-800/80">
                    <label class="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input type="checkbox" id="ret-putaway-confirm-${t.id}" checked class="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0">
                        <span class="text-xs font-bold text-emerald-400">Skladchi asbobni ko'rsatilgan polkaga joylashtirganini tasdiqlaydi</span>
                    </label>
                    <p class="text-[10px] text-slate-500 mt-0.5 pl-6">* Belgilanmasa, asbob "omborda_bosh" bo'lmaydi, "tozalanmoqda/joylashtirish kutilmoqda" holatida qoladi.</p>
                </div>
            </div>

            <div>
                <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Komplektatsiya (Checklist):</p>
                <div class="grid grid-cols-2 gap-2">
                    ${kitList.map((kit, kIdx) => `
                        <label class="flex items-center gap-2 text-slate-300 cursor-pointer">
                            <input type="checkbox" id="kit-${t.id}-${kIdx}" checked class="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0">
                            <span>${kit}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
        checklistContainer.appendChild(div);
    });

    document.getElementById('ret-repair-cost').value = '0';
    calculateReturnDepositRefund();

    openModal('modal-order-return');
    lucide.createIcons();
}

function calculateReturnDepositRefund() {
    if (!currentReturnOrder) return;

    const depositHeld = currentReturnOrder.total_deposit_amount || 0;
    const latePenalty = parseFloat(document.getElementById('ret-delay-penalty').value) || 0;
    const repairCost = parseFloat(document.getElementById('ret-repair-cost').value) || 0;

    const totalDeductions = latePenalty + repairCost;
    const refundAmount = Math.max(0, depositHeld - totalDeductions);

    document.getElementById('ret-held-deposit').innerText = `${depositHeld.toLocaleString()} so'm`;
    document.getElementById('ret-total-deductions').innerText = `-${totalDeductions.toLocaleString()} so'm`;
    document.getElementById('ret-refund-amount').innerText = `${refundAmount.toLocaleString()} so'm`;

    const elRefundBox = document.getElementById('ret-refund-box');
    if (refundAmount > 0) {
        elRefundBox.className = "text-xl font-bold text-emerald-400 font-mono";
    } else {
        elRefundBox.className = "text-xl font-bold text-slate-400 font-mono";
    }
}

function handleProcessOrderReturn(e) {
    e.preventDefault();
    if (!currentReturnOrder) return;

    const latePenalty = parseFloat(document.getElementById('ret-delay-penalty').value) || 0;
    const repairCost = parseFloat(document.getElementById('ret-repair-cost').value) || 0;
    const totalDeductions = latePenalty + repairCost;
    const refundAmount = Math.max(0, (currentReturnOrder.total_deposit_amount || 0) - totalDeductions);

    const tools = (DB.order_tool_items || []).filter(t => t.order_id === currentReturnOrder.id && t.return_status === 'mijozda');

    // 1. Update Tool Items & Return Units to Inventory (WMS Putaway)
    tools.forEach(t => {
        const condSelect = document.getElementById(`ret-unit-condition-${t.id}`);
        const conditionVal = condSelect ? condSelect.value : 'butun';
        const locSelect = document.getElementById(`ret-putaway-loc-${t.id}`);
        const chosenLocId = locSelect ? parseInt(locSelect.value) : (t.original_location_id || 1);
        const confirmCheck = document.getElementById(`ret-putaway-confirm-${t.id}`);
        const isPlaced = confirmCheck ? confirmCheck.checked : false;

        t.return_status = conditionVal === 'butun' ? 'qaytarildi_butun' : (conditionVal === 'remont' ? 'remont_talab' : 'yoqolgan');
        t.penalty_amount = (latePenalty / tools.length) + (repairCost / tools.length);
        t.final_warehouse_location_id = chosenLocId;
        t.putaway_confirmed = isPlaced;

        const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
        if (unit) {
            unit.warehouse_location_id = chosenLocId;
            if (conditionVal === 'butun') {
                if (isPlaced) {
                    unit.status = 'omborda_bosh'; // Back to available inventory!
                } else {
                    unit.status = 'tozalanmoqda'; // Awaiting shelf placement confirmation!
                }
                unit.condition = 'yaxshi';
            } else if (conditionVal === 'remont') {
                unit.status = 'remontda';
                unit.condition = 'ortacha';
                // Add maintenance log
                if (!DB.maintenance_logs) DB.maintenance_logs = [];
                DB.maintenance_logs.unshift({
                    id: Date.now() + Math.random(),
                    product_item_id: unit.id,
                    date: new Date().toISOString().split('T')[0],
                    maintenance_type: 'detal_almashtirish',
                    cost: repairCost,
                    description: `Mijozdan qaytishda nuqson aniqlandi (${currentReturnOrder.order_number})`,
                    performed_by: currentUser ? currentUser.full_name : "Skladchi"
                });
            } else {
                unit.status = 'brak';
            }
        }
    });

    // 2. Record Return Payment & Deposit Refund
    if (!DB.order_payments) DB.order_payments = [];
    if (refundAmount > 0) {
        DB.order_payments.push({
            id: Date.now() + 1,
            order_id: currentReturnOrder.id,
            customer_id: currentReturnOrder.customer_id,
            payment_type: "zalog_qaytarildi",
            amount: refundAmount,
            payment_method: "naqd",
            cashier_user_id: currentUser ? currentUser.id : 1,
            date: new Date().toLocaleString('uz-UZ')
        });
    }

    if (totalDeductions > 0) {
        DB.order_payments.push({
            id: Date.now() + 2,
            order_id: currentReturnOrder.id,
            customer_id: currentReturnOrder.customer_id,
            payment_type: "jarima_ushlandi",
            amount: totalDeductions,
            payment_method: "zalogdan_ushlab_qolindi",
            cashier_user_id: currentUser ? currentUser.id : 1,
            date: new Date().toLocaleString('uz-UZ')
        });
    }

    // 3. Update Customer deposit in CRM
    const customer = (DB.customers || []).find(c => c.id === currentReturnOrder.customer_id);
    if (customer) {
        customer.current_deposit = Math.max(0, (customer.current_deposit || 0) - (currentReturnOrder.total_deposit_amount || 0));
    }

    // 4. Mark order as 'yakunlandi'
    currentReturnOrder.status = 'yakunlandi';
    currentReturnOrder.actual_return_date = new Date().toLocaleString('uz-UZ');

    saveDB();
    closeModal('modal-order-return');
    renderOrdersSection();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
    if (typeof renderCatalogCards === 'function') renderCatalogCards();

    showNotification(`Asboblar qabul qilindi va buyurtma ${currentReturnOrder.order_number} yakunlandi!`, "success");
    if (typeof openOrderReceiptModal === 'function') {
        openOrderReceiptModal(currentReturnOrder.id, 'rtab-telegram');
    }
}


// -------------------------------------------------------------------------
// 4. PRINTABLE CONTRACT & ACCEPTANCE ACT (TILXAT / SHARTNOMA A4)
// -------------------------------------------------------------------------
function printOrderContract(orderId) {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);

    const container = document.getElementById('contract-print-content');
    if (!container) return;

    container.innerHTML = `
        <div class="p-8 bg-white text-slate-900 font-sans text-xs space-y-5 border border-slate-300 rounded-lg shadow-sm" style="font-family: Arial, sans-serif;">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                    <h1 class="text-xl font-extrabold tracking-tight">WMS ARENDA ERP</h1>
                    <p class="text-xs text-slate-600">Qurilish uskunalari ijarasi va professional servis xizmati</p>
                    <p class="text-[11px] text-slate-500 mt-1">Tel: +998 71 200-00-00 | Toshkent sh., Chilonzor sanoat zonasi, 4</p>
                </div>
                <div class="text-right">
                    <span class="px-3 py-1 bg-slate-900 text-white font-mono text-sm font-bold rounded">№ ${order.order_number}</span>
                    <p class="text-[11px] text-slate-600 mt-1">Sana: ${order.start_date ? order.start_date.substring(0, 10) : ''}</p>
                </div>
            </div>

            <!-- Title -->
            <div class="text-center my-2">
                <h2 class="text-base font-bold uppercase tracking-wide">QURILISH USKUNALARI IJARASI VA XIZMAT SHARTNOMASI / TILXAT</h2>
                <p class="text-[11px] text-slate-500">Uskunalarni vaqtincha foydalanishga qabul qilish va topshirish dalolatnomasi</p>
            </div>

            <!-- Parties info -->
            <div class="grid grid-cols-2 gap-4 p-3 bg-slate-100 rounded-lg border border-slate-200">
                <div>
                    <p class="font-bold text-slate-800 text-[11px] uppercase">Ijaraga Beruvchi (Kompaniya):</p>
                    <p class="font-semibold text-slate-900">"WMS ARENDA TOOLS" MChJ</p>
                    <p class="text-slate-600 text-[11px]">Mas'ul: ${currentUser ? currentUser.full_name : 'Admin'}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 text-[11px] uppercase">Ijaraga Oluvchi (Mijoz):</p>
                    <p class="font-semibold text-slate-900">${customer ? customer.full_name : 'Mijoz'} ${customer?.company_name ? `(${customer.company_name})` : ''}</p>
                    <p class="text-slate-600 text-[11px]">Telefon: <b>${customer?.phone_primary || ''}</b> | Hujjat/STIR: ${customer?.passport_series_number || ''}</p>
                </div>
            </div>

            <!-- Table of Tools & Services -->
            <div>
                <h3 class="font-bold text-slate-900 mb-1.5 uppercase text-[11px]">Ijara va Xizmatlar Ro'yxati:</h3>
                <table class="w-full text-left border border-slate-300 text-xs">
                    <thead class="bg-slate-200 font-bold text-slate-800">
                        <tr>
                            <th class="p-2 border border-slate-300">№</th>
                            <th class="p-2 border border-slate-300">Uskuna / Xizmat Nomi</th>
                            <th class="p-2 border border-slate-300">Zavod Seriya №</th>
                            <th class="p-2 border border-slate-300 text-center">Muddat</th>
                            <th class="p-2 border border-slate-300 text-right">Kunlik Narx</th>
                            <th class="p-2 border border-slate-300 text-right">Ijara Summasi</th>
                            <th class="p-2 border border-slate-300 text-right">Depozit (Zalog)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tools.map((t, idx) => `
                            <tr>
                                <td class="p-2 border border-slate-300">${idx + 1}</td>
                                <td class="p-2 border border-slate-300 font-semibold">${t.model_name}</td>
                                <td class="p-2 border border-slate-300 font-mono text-[11px]">${t.serial_number}</td>
                                <td class="p-2 border border-slate-300 text-center">${t.rent_days} kun</td>
                                <td class="p-2 border border-slate-300 text-right font-mono">${t.daily_price.toLocaleString()}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono font-bold">${t.total_tool_rent.toLocaleString()}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono text-slate-700">${t.deposit_price.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                        ${services.map((s, idx) => `
                            <tr>
                                <td class="p-2 border border-slate-300">${tools.length + idx + 1}</td>
                                <td class="p-2 border border-slate-300 font-semibold" colspan="2">${s.service_category.toUpperCase()} (${s.service_details})</td>
                                <td class="p-2 border border-slate-300 text-center">1 xizmat</td>
                                <td class="p-2 border border-slate-300 text-right font-mono">-</td>
                                <td class="p-2 border border-slate-300 text-right font-mono font-bold">${s.customer_price.toLocaleString()}</td>
                                <td class="p-2 border border-slate-300 text-right font-mono text-slate-700">-</td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="bg-slate-100 font-bold">
                        <tr>
                            <td colspan="5" class="p-2 border border-slate-300 text-right">JAMI HISOBLANDI:</td>
                            <td class="p-2 border border-slate-300 text-right text-emerald-800 font-mono">${(order.total_rent_amount || 0).toLocaleString()} so'm</td>
                            <td class="p-2 border border-slate-300 text-right text-amber-800 font-mono">${(order.total_deposit_amount || 0).toLocaleString()} so'm</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Agreement Terms -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1 text-slate-600 leading-relaxed">
                <p><b>1. Majburiyat:</b> Ijarachi asbobni to'liq butun, soz holatda, tozalangan holda <b>${order.expected_return_date}</b> muddatigacha qaytarish majburiyatini oladi.</p>
                <p><b>2. Kechikish:</b> Asbob belgilangan muddatdan kechiktirilgan har bir soat yoki kun uchun shartnomada belgilangan jarima undiriladi.</p>
                <p><b>3. Ziyon va Yo'qotish:</b> Asbob buzilgan taqdirda ta'mirlash xarajati zalogdan ushlab qolinadi. Asbob yo'qolsa yoki yaroqsiz qilinsa, to'liq tiklash qiymati ijarachi hisobidan qoplanadi.</p>
                <p><b>4. Zalog:</b> Qabul qilingan ${order.total_deposit_amount?.toLocaleString() || 0} so'm zalog mablag'i asbob bekamu-ko'st qaytarilgach, to'liq qaytarib beriladi.</p>
            </div>

            <!-- Signatures -->
            <div class="pt-6 grid grid-cols-2 gap-8 border-t border-slate-300 text-xs">
                <div>
                    <p class="font-bold text-slate-800 mb-8">Topshirdi (Ijaraga Beruvchi):</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">Imzo: _____________________ / ${currentUser ? currentUser.full_name : 'Admin'}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 mb-8">Qabul qildi (Mijoz / Tilxat):</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">Imzo: _____________________ / ${customer ? customer.full_name : 'Mijoz'}</p>
                </div>
            </div>
        </div>
    `;

    openModal('modal-print-contract');
}

// -------------------------------------------------------------------------
// 5. VIEW ORDER DETAIL MODAL
// -------------------------------------------------------------------------
function openOrderDetailModal(orderId) {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);
    const payments = (DB.order_payments || []).filter(p => p.order_id === order.id);

    document.getElementById('od-order-num').innerText = order.order_number;
    document.getElementById('od-customer-name').innerText = customer ? customer.full_name : 'Noma\'lum';
    document.getElementById('od-customer-phone').innerText = customer ? customer.phone_primary : '';
    document.getElementById('od-status').innerText = order.status.toUpperCase();
    document.getElementById('od-start-date').innerText = order.start_date || '-';
    document.getElementById('od-expected-date').innerText = order.expected_return_date || '-';
    document.getElementById('od-rent-amount').innerText = `${(order.total_rent_amount || 0).toLocaleString()} so'm`;
    document.getElementById('od-deposit-amount').innerText = `${(order.total_deposit_amount || 0).toLocaleString()} so'm`;
    document.getElementById('od-paid-amount').innerText = `${(order.paid_amount || 0).toLocaleString()} so'm`;

    const tbodyItems = document.getElementById('od-items-tbody');
    tbodyItems.innerHTML = '';

    tools.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2 px-3 font-semibold text-white">${t.model_name}</td>
            <td class="py-2 px-3 font-mono text-blue-400">${t.serial_number}</td>
            <td class="py-2 px-3">${t.rent_days} kun</td>
            <td class="py-2 px-3 font-mono">${t.total_tool_rent.toLocaleString()} so'm</td>
            <td class="py-2 px-3 font-mono text-amber-400">${t.deposit_price.toLocaleString()} so'm</td>
            <td class="py-2 px-3"><span class="badge-status bg-slate-800 text-slate-300 text-[10px]">${t.return_status}</span></td>
        `;
        tbodyItems.appendChild(tr);
    });

    services.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2 px-3 font-semibold text-amber-300">${s.service_category.toUpperCase()}</td>
            <td class="py-2 px-3 text-slate-400" colspan="2">${s.service_details}</td>
            <td class="py-2 px-3 font-mono">${s.customer_price.toLocaleString()} so'm</td>
            <td class="py-2 px-3 text-slate-500">-</td>
            <td class="py-2 px-3"><span class="badge-status bg-indigo-500/10 text-indigo-400 text-[10px]">${s.execution_status}</span></td>
        `;
        tbodyItems.appendChild(tr);
    });

    const tbodyPay = document.getElementById('od-payments-tbody');
    tbodyPay.innerHTML = '';
    payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-2 px-3 text-slate-300">${p.date}</td>
            <td class="py-2 px-3 font-semibold text-white">${p.payment_type}</td>
            <td class="py-2 px-3 font-mono font-bold text-emerald-400">${p.amount.toLocaleString()} so'm</td>
            <td class="py-2 px-3"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">${p.payment_method}</span></td>
        `;
        tbodyPay.appendChild(tr);
    });

    openModal('modal-order-detail');
    lucide.createIcons();
}
