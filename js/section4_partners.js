// =========================================================================
// SECTION 4: TASHQI HAMKORLAR (P2P), NARXLAR/MARJA VA DISPECHERLIK DOSKASI
// =========================================================================

let partnerActiveSubtab = 'ptab-directory'; // 'ptab-directory', 'ptab-prices', 'ptab-orders', 'ptab-finance'
let partnerCategoryFilter = ''; // '', 'kran', 'musor_olib_ketish', 'gruzchik'
let orderStatusFilter = ''; // '', 'yangi', 'hamkorga_uzatildi', 'qabul_qilindi', 'bajarilmoqda', 'bajarildi'

function switchPartnerTab(tabId) {
    partnerActiveSubtab = tabId;
    const tabs = ['ptab-directory', 'ptab-prices', 'ptab-orders', 'ptab-finance'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        const btn = document.getElementById(`btn-${t}`);
        if (t === tabId) {
            if (el) {
                el.classList.remove('hidden');
                el.style.setProperty('display', 'block', 'important');
            }
            if (btn) btn.className = "pb-3 px-4 text-xs font-bold border-b-2 border-amber-500 text-amber-400 flex items-center gap-2 transition";
        } else {
            if (el) {
                el.classList.add('hidden');
                el.style.setProperty('display', 'none', 'important');
            }
            if (btn) btn.className = "pb-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 transition";
        }
    });

    try {
        if (tabId === 'ptab-directory') renderPartnersDirectory();
        if (tabId === 'ptab-prices') renderPartnerPricesTable();
        if (tabId === 'ptab-orders') renderServiceOrdersTable();
        if (tabId === 'ptab-finance') renderPartnerFinanceSummary();
    } catch(err) {
        console.error("switchPartnerTab render error:", err);
    }

    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (e) {}
}

window.switchPartnerTab = switchPartnerTab;

// -------------------------------------------------------------------------
// 1. PARTNERS DIRECTORY
// -------------------------------------------------------------------------
function renderPartnersDirectory() {
    const grid = document.getElementById('partners-cards-grid');
    if (!grid) return;
    const search = (document.getElementById('filter-partners-search')?.value || '').toLowerCase();

    grid.innerHTML = '';

    const filtered = (DB.service_partners || []).filter(p => {
        const matchCat = !partnerCategoryFilter || p.service_category === partnerCategoryFilter;
        const matchSearch = p.company_name.toLowerCase().includes(search) || 
                            p.contact_person.toLowerCase().includes(search) ||
                            p.phone_primary.includes(search);
        return matchCat && matchSearch;
    });

    const categoryIcons = {
        kran: 'truck',
        musor_olib_ketish: 'trash-2',
        gruzchik: 'users-2'
    };
    const categoryLabels = {
        kran: 'Avtokranlar',
        musor_olib_ketish: 'Chiqindi (Musor) Tashish',
        gruzchik: 'Yuk Tashuvchilar Brigadasi'
    };

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-500">Hech qanday hamkor topilmadi</div>`;
        return;
    }

    filtered.forEach(p => {
        const services = (DB.partner_price_list || []).filter(pl => pl.partner_id === p.id);
        const card = document.createElement('div');
        card.className = "rounded-2xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-700 transition flex flex-col justify-between";

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                    <div>
                        <span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] mb-1.5">
                            ${categoryLabels[p.service_category] || p.service_category}
                        </span>
                        <h3 class="text-sm font-bold text-white leading-tight">${p.company_name}</h3>
                        <p class="text-xs text-slate-300">${p.contact_person}</p>
                    </div>
                    <div class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 text-xs font-bold">
                         ${p.rating}
                    </div>
                </div>

                <div class="space-y-1 text-xs text-slate-400 mb-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="phone" class="w-3.5 h-3.5 text-blue-400"></i>
                        <span class="font-mono text-slate-200">${p.phone_primary}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5 text-red-400"></i>
                        <span class="truncate">${p.address}</span>
                    </div>
                </div>

                <!-- Price List mini items -->
                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 mb-3 space-y-1.5">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Xizmatlar va Narxlar:</p>
                    ${services.slice(0, 2).map(s => `
                        <div class="flex justify-between text-[11px]">
                            <span class="text-slate-300 truncate max-w-[150px]">${s.service_type_detail}</span>
                            <span class="font-bold text-emerald-400">${s.selling_price.toLocaleString()} so'm/${s.unit}</span>
                        </div>
                    `).join('')}
                    ${services.length > 2 ? `<p class="text-[10px] text-blue-400 font-semibold">+ yana ${services.length - 2} ta xizmat turi</p>` : ''}
                </div>
            </div>

            <div class="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div class="text-xs">
                    <span class="text-slate-400">Qarzimiz:</span>
                    <span class="font-bold ${p.balance < 0 ? 'text-red-400' : 'text-slate-300'} ml-1">
                        ${Math.abs(p.balance).toLocaleString()} so'm
                    </span>
                </div>
                <div class="flex items-center gap-1.5">
                    ${typeof adminActionButtonsHtml === 'function' ? adminActionButtonsHtml(`editPartner(${p.id})`, `deletePartner(${p.id})`) : ''}
                    <button onclick="openModalCreateServiceOrder(${p.id})" class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-slate-950 transition flex items-center gap-1">
                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                        <span>Buyurtma Berish</span>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    lucide.createIcons();
}

function filterPartnerCategory(cat) {
    partnerCategoryFilter = cat;
    renderPartnersDirectory();
}

function openModalAddPartner() {
    try {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('p-company-name', '');
        setVal('p-contact-person', '');
        setVal('p-phone1', '+998 ');
        setVal('p-phone2', '');
        setVal('p-address', 'Toshkent sh., ');
        setVal('p-rating', '5.0');

        openModal('modal-add-partner');
    } catch (err) {
        console.error("openModalAddPartner error:", err);
    }
}

function handleSavePartner(e) {
    e.preventDefault();
    const company = document.getElementById('p-company-name').value.trim();
    const contact = document.getElementById('p-contact-person').value.trim();
    const phone1 = document.getElementById('p-phone1').value.trim();
    const phone2 = document.getElementById('p-phone2').value.trim();
    const category = document.getElementById('p-category').value;
    const address = document.getElementById('p-address').value.trim();
    const rating = parseFloat(document.getElementById('p-rating').value) || 5;

    const newPartner = {
        id: Date.now(),
        company_name: company,
        contact_person: contact,
        phone_primary: phone1,
        phone_secondary: phone2,
        service_category: category,
        address: address,
        rating: rating,
        balance: 0,
        status: "faol"
    };

    if (!DB.service_partners) DB.service_partners = [];
    DB.service_partners.push(newPartner);
    saveDB();
    closeModal('modal-add-partner');
    renderPartnersDirectory();
    showNotification(`Yangi hamkor "${company}" qo'shildi!`, "success");
}


// -------------------------------------------------------------------------
// 2. PRICING & MARGIN CALCULATOR (ADMIN ONLY)
// -------------------------------------------------------------------------
function renderPartnerPricesTable() {
    const tbody = document.getElementById('partner-prices-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    (DB.partner_price_list || []).forEach(item => {
        const partner = (DB.service_partners || []).find(p => p.id === item.partner_id);
        const marginPct = item.cost_price > 0 ? Math.round((item.margin_amount / item.cost_price) * 100) : 0;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40";
        tr.innerHTML = `
            <td class="py-2.5 px-3 font-semibold text-white">${partner ? partner.company_name : 'Noma\'lum'}</td>
            <td class="py-2.5 px-3 text-slate-200">${item.service_type_detail}</td>
            <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">${item.unit}</span></td>
            <td class="py-2.5 px-3 font-mono text-slate-400">${item.cost_price.toLocaleString()} so'm</td>
            <td class="py-2.5 px-3 font-mono font-bold text-white">${item.selling_price.toLocaleString()} so'm</td>
            <td class="py-2.5 px-3 font-mono font-bold text-emerald-400">
                +${item.margin_amount.toLocaleString()} so'm
                <span class="text-[10px] text-emerald-500 font-normal ml-1">(${marginPct}%)</span>
            </td>
            <td class="py-2.5 px-3 text-right">
                <button onclick="editPartnerPrice(${item.id})" class="text-xs text-blue-400 hover:text-white">Tahrirlash</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function openModalAddPartnerPrice() {
    try {
        const select = document.getElementById('pp-partner-select');
        const partners = DB.service_partners || [];
        if (select) {
            select.innerHTML = partners.length > 0
                ? partners.map(p => `<option value="${p.id}">${p.company_name} (${p.service_category})</option>`).join('')
                : '<option value="">-- Hamkorlar ro\'yxati bo\'sh --</option>';
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('pp-id', '');
        setVal('pp-service-name', '');
        setVal('pp-cost-price', '300000');
        setVal('pp-markup-pct', '20');
        calculatePriceMargin();

        openModal('modal-add-partner-price');
    } catch (err) {
        console.error("openModalAddPartnerPrice error:", err);
    }
}

function calculatePriceMargin() {
    const cost = parseFloat(document.getElementById('pp-cost-price').value) || 0;
    const markupPct = parseFloat(document.getElementById('pp-markup-pct').value) || 0;
    
    const margin = Math.round(cost * (markupPct / 100));
    const selling = cost + margin;

    document.getElementById('pp-selling-price').value = selling;
    document.getElementById('pp-calc-margin').innerText = `+${margin.toLocaleString()} so'm foyda`;
}

function handleSavePartnerPrice(e) {
    e.preventDefault();
    const idVal = document.getElementById('pp-id').value;
    const partnerId = parseInt(document.getElementById('pp-partner-select').value);
    const serviceName = document.getElementById('pp-service-name').value.trim();
    const unit = document.getElementById('pp-unit').value;
    const cost = parseFloat(document.getElementById('pp-cost-price').value) || 0;
    const selling = parseFloat(document.getElementById('pp-selling-price').value) || 0;
    const margin = selling - cost;

    if (!DB.partner_price_list) DB.partner_price_list = [];

    if (idVal) {
        const item = DB.partner_price_list.find(i => i.id === parseInt(idVal));
        if (item) {
            item.partner_id = partnerId;
            item.service_type_detail = serviceName;
            item.unit = unit;
            item.cost_price = cost;
            item.selling_price = selling;
            item.margin_amount = margin;
        }
    } else {
        DB.partner_price_list.push({
            id: Date.now(),
            partner_id: partnerId,
            service_type_detail: serviceName,
            unit: unit,
            cost_price: cost,
            selling_price: selling,
            margin_amount: margin
        });
    }

    saveDB();
    closeModal('modal-add-partner-price');
    renderPartnerPricesTable();
    showNotification("Narx va marja muvaffaqiyatli saqlandi!", "success");
}


// -------------------------------------------------------------------------
// 3. SERVICE ORDERS (DISPECHERLIK DOSKASI)
// -------------------------------------------------------------------------
function renderServiceOrdersTable() {
    const tbody = document.getElementById('service-orders-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const statusBadges = {
        yangi: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">Yangi</span>',
        hamkorga_uzatildi: '<span class="badge-status bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Uzatildi 📤</span>',
        hamkor_qabul_qildi: '<span class="badge-status bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">✅ Hamkor qabul qildi</span>',
        qabul_qilindi: '<span class="badge-status bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">✅ Hamkor qabul qildi</span>',
        rad_etildi: '<span class="badge-status bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold">❌ Rad etildi</span>',
        bajarilmoqda: '<span class="badge-status bg-purple-500/10 text-purple-400 border border-purple-500/20">Bajarilmoqda ⏳</span>',
        bajarildi: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Bajarildi 🏁</span>',
        bekor_qilindi: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20">Bekor qilindi 🚫</span>'
    };

    const orders = (DB.service_orders || []).filter(o => !orderStatusFilter || o.order_status === orderStatusFilter);

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-500">Ushbu holatda buyurtmalar yo'q</td></tr>`;
        return;
    }

    orders.forEach(o => {
        const customer = (DB.customers || []).find(c => c.id === o.customer_id);
        const partner = (DB.service_partners || []).find(p => p.id === o.assigned_partner_id);

        const tr = document.createElement('tr');
        let rowClass = "hover:bg-slate-800/40 transition";
        if (o.order_status === 'hamkor_qabul_qildi' || o.order_status === 'qabul_qilindi') {
            rowClass = "bg-emerald-950/25 border-l-4 border-l-emerald-500 hover:bg-emerald-950/35 transition";
        } else if (o.order_status === 'rad_etildi') {
            rowClass = "bg-rose-950/25 border-l-4 border-l-rose-500 hover:bg-rose-950/35 transition";
        }
        tr.className = rowClass;
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-white">${o.order_number}</td>
            <td class="py-3 px-4">
                <div class="font-semibold text-slate-200">${customer ? customer.full_name : 'Mijoz'}</div>
                <div class="text-[10px] text-slate-400 font-mono">${customer ? customer.phone_primary : ''}</div>
            </td>
            <td class="py-3 px-4">
                <span class="badge-status bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">${o.service_category}</span>
            </td>
            <td class="py-3 px-4 text-slate-300 max-w-xs" title="${o.details}">
                <div class="font-medium text-white">${o.details}</div>
                ${o.task_instruction ? `<div class="text-[10px] text-amber-300/90 font-mono mt-0.5 truncate bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="${o.task_instruction}"> ${o.task_instruction}</div>` : ''}
                <div class="text-[10px] text-slate-400 truncate mt-0.5"> ${o.destination_address}</div>
            </td>
            <td class="py-3 px-4">
                <div class="font-semibold text-amber-300">${partner ? partner.company_name : 'Biriktirilmagan'}</div>
                <div class="text-[10px] text-slate-400">${o.service_date} ${o.execution_time}</div>
            </td>
            <td class="py-3 px-4">
                <div class="font-bold text-white">${o.customer_total_price.toLocaleString()} so'm</div>
                <div class="text-[10px] text-slate-400">Hamkorga: ${o.partner_payout_amount.toLocaleString()}</div>
            </td>
            <td class="py-3 px-4 font-bold text-emerald-400 font-mono">
                +${o.net_profit.toLocaleString()} so'm
            </td>
            <td class="py-3 px-4">${statusBadges[o.order_status] || o.order_status}</td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5 flex-wrap">
                    <button onclick="dispatchOrderToPartnerBot(${o.id})" class="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition" title="Hamkorning Telegram Botiga yuborish va simulyatorni ochish">
                        <i data-lucide="bot" class="w-3.5 h-3.5"></i> <span>Bot </span>
                    </button>
                    <button onclick="copyPartnerDispatchTask(${o.id})" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700" title="Hamkor uchun Telegram topshiriq nusxalash">
                        <i data-lucide="share-2" class="w-3.5 h-3.5"></i> <span>Topshiriq</span>
                    </button>
                    ${o.order_status === 'yangi' ? `
                        <button onclick="dispatchOrderToPartnerBot(${o.id})" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white">
                            Uzatish 
                        </button>
                    ` : ''}
                    ${o.order_status === 'hamkorga_uzatildi' ? `
                        <button onclick="advanceOrderStatus(${o.id}, 'hamkor_qabul_qildi')" class="px-2 py-1 rounded bg-amber-600 text-xs font-semibold text-white">
                            Qabul qilindi
                        </button>
                    ` : ''}
                    ${(o.order_status === 'hamkor_qabul_qildi' || o.order_status === 'qabul_qilindi') ? `
                        <button onclick="advanceOrderStatus(${o.id}, 'bajarilmoqda')" class="px-2 py-1 rounded bg-purple-600 text-xs font-semibold text-white">
                            Ish boshlandi
                        </button>
                    ` : ''}
                    ${o.order_status === 'rad_etildi' ? `
                        <button onclick="openModalCreateServiceOrder(${o.assigned_partner_id || 'null'})" class="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white" title="Boshqa ijrochi biriktirish">
                            Boshqa ijrochi 🔁
                        </button>
                    ` : ''}
                    ${o.order_status === 'bajarilmoqda' ? `
                        <button onclick="advanceOrderStatus(${o.id}, 'bajarildi')" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white">
                            Bajarildi 
                        </button>
                    ` : ''}
                    ${o.order_status === 'bajarildi' ? `
                        <span class="text-xs text-emerald-400 font-bold">Yakunlandi</span>
                    ` : ''}
                    ${typeof adminActionButtonsHtml === 'function' ? adminActionButtonsHtml(`editServiceOrder(${o.id})`, `deleteServiceOrder(${o.id})`) : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function filterOrderStatus(status) {
    orderStatusFilter = status;
    renderServiceOrdersTable();
}

function advanceOrderStatus(orderId, nextStatus) {
    const order = (DB.service_orders || []).find(o => o.id === orderId);
    if (!order) return;
    order.order_status = nextStatus;

    // If completed: partner gets credit on balance (we owe them partner_payout_amount)
    if (nextStatus === 'bajarildi') {
        const partner = (DB.service_partners || []).find(p => p.id === order.assigned_partner_id);
        if (partner) {
            partner.balance -= order.partner_payout_amount; // becomes more negative (our debt to partner)
        }
    }

    saveDB();
    renderServiceOrdersTable();
    showNotification(`Buyurtma holati: ${nextStatus.toUpperCase()}`, "success");
}

function dispatchOrderToPartner(orderId) {
    const order = (DB.service_orders || []).find(o => o.id === orderId);
    if (!order) return;
    order.order_status = 'hamkorga_uzatildi';
    saveDB();
    renderServiceOrdersTable();
    autoDispatchOrderToPartner(order);
    showNotification("Buyurtma hamkorga muvaffaqiyatli uzatildi!", "success");
}

function openModalCreateServiceOrder(presetPartnerId = null) {
    try {
        const custSelect = document.getElementById('so-customer-select');
        const customers = DB.customers || [];
        if (custSelect) {
            custSelect.innerHTML = customers.length > 0 
                ? customers.map(c => `
                    <option value="${c.id}">${c.full_name} (${c.phone_primary}) ${c.status === 'qora_royxat' ? ' QORA RO\'YXAT!' : ''}</option>
                `).join('')
                : '<option value="">-- Mijozlar yo\'q (Avval CRMda mijoz qo\'shing) --</option>';
        }

        const partnerSelect = document.getElementById('so-partner-select');
        const partners = DB.service_partners || [];
        if (partnerSelect) {
            partnerSelect.innerHTML = partners.length > 0 
                ? partners.map(p => `
                    <option value="${p.id}" ${presetPartnerId && presetPartnerId === p.id ? 'selected' : ''}>
                        ${p.company_name} - ${p.service_category} ( ${p.rating})
                    </option>
                `).join('')
                : '<option value="">-- Hamkorlar mavjud emas --</option>';
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('so-date', new Date().toISOString().split('T')[0]);
        setVal('so-time', "10:00");
        setVal('so-address', "Toshkent sh., ");
        setVal('so-details', "");
        setVal('so-customer-price', "450000");
        setVal('so-partner-payout', "350000");

        calculateOrderNetProfit();
        openModal('modal-create-service-order');
        if (typeof onDispatchServiceCategoryChange === 'function') {
            onDispatchServiceCategoryChange();
        }
    } catch (err) {
        console.error("openModalCreateServiceOrder error:", err);
    }
}

function calculateOrderNetProfit() {
    const custPrice = parseFloat(document.getElementById('so-customer-price').value) || 0;
    const partnerPayout = parseFloat(document.getElementById('so-partner-payout').value) || 0;
    const profit = custPrice - partnerPayout;

    const el = document.getElementById('so-net-profit-preview');
    if (el) {
        el.innerText = `+${profit.toLocaleString()} so'm sof marja`;
        el.className = profit >= 0 ? "text-emerald-400 font-bold text-sm" : "text-red-400 font-bold text-sm";
    }
}

function handleSaveServiceOrder(e) {
    e.preventDefault();
    const customerId = parseInt(document.getElementById('so-customer-select').value);
    const partnerId = parseInt(document.getElementById('so-partner-select').value);
    const category = document.getElementById('so-category').value;
    const sDate = document.getElementById('so-date').value;
    const sTime = document.getElementById('so-time').value;
    const address = document.getElementById('so-address').value.trim();
    const details = document.getElementById('so-details').value.trim();
    const custPrice = parseFloat(document.getElementById('so-customer-price').value) || 0;
    const partnerPayout = parseFloat(document.getElementById('so-partner-payout').value) || 0;
    const profit = custPrice - partnerPayout;

    const customer = (DB.customers || []).find(c => c.id === customerId);
    if (customer && customer.status === 'qora_royxat') {
        if (!confirm("DIQQAT! Ushbu mijoz QORA RO'YXATDA! Baribir buyurtma qabul qilasizmi?")) {
            return;
        }
    }

    const liveCalc = (window._currentLiveCalc && window._currentLiveCalc['disp']) ? window._currentLiveCalc['disp'] : null;
    const taskInstruction = liveCalc ? liveCalc.taskInstruction : (details || `Xizmat: ${category.toUpperCase()}`);
    const calcParams = liveCalc ? liveCalc.calcParams : null;

    const newOrder = {
        id: Date.now(),
        order_number: `SRV-2026-${String((DB.service_orders || []).length + 1).padStart(3, '0')}`,
        customer_id: customerId,
        service_category: category,
        order_date: new Date().toISOString().split('T')[0],
        service_date: sDate,
        execution_time: sTime,
        destination_address: address,
        details: details,
        task_instruction: taskInstruction,
        calc_params: calcParams,
        assigned_partner_id: partnerId,
        customer_total_price: custPrice,
        partner_payout_amount: partnerPayout,
        net_profit: profit,
        order_status: "yangi",
        payment_status: "tolanmadi",
        created_at: new Date().toLocaleString('uz-UZ')
    };

    if (!DB.service_orders) DB.service_orders = [];
    DB.service_orders.unshift(newOrder);

    // Also record in customer's order history
    if (!DB.customer_orders) DB.customer_orders = [];
    DB.customer_orders.unshift({
        id: newOrder.order_number,
        customer_id: customerId,
        service_type: category.toUpperCase(),
        details: details,
        total_sum: custPrice,
        deposit: 0,
        status: "faol",
        date: sDate
    });

    saveDB();
    closeModal('modal-create-service-order');
    renderServiceOrdersTable();
    showNotification(`Yangi buyurtma ${newOrder.order_number} yaratildi!`, "success");
    autoDispatchOrderToPartner(newOrder);
}


// -------------------------------------------------------------------------
// 4. PARTNER FINANCE & PAYOUT (VYPLATA)
// -------------------------------------------------------------------------
function renderPartnerFinanceSummary() {
    const container = document.getElementById('partner-finance-container');
    if (!container) return;

    let totalRevenue = 0;
    let totalPartnerPayouts = 0;
    let totalNetProfit = 0;

    (DB.service_orders || []).forEach(o => {
        if (o.order_status === 'bajarildi' || o.order_status === 'bajarilmoqda') {
            totalRevenue += o.customer_total_price;
            totalPartnerPayouts += o.partner_payout_amount;
            totalNetProfit += o.net_profit;
        }
    });

    const profitMarginPct = totalRevenue > 0 ? Math.round((totalNetProfit / totalRevenue) * 100) : 0;

    const summaryHtml = `
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <p class="text-xs text-slate-400">Jami Xizmat Aylanmasi</p>
                <h3 class="text-xl font-bold text-white mt-1">${totalRevenue.toLocaleString()} so'm</h3>
            </div>
            <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <p class="text-xs text-slate-400">Hamkorlarga Beriladigan Haq</p>
                <h3 class="text-xl font-bold text-amber-400 mt-1">${totalPartnerPayouts.toLocaleString()} so'm</h3>
            </div>
            <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <p class="text-xs text-slate-400">Bizning Toza Foyda (Marja)</p>
                <h3 class="text-xl font-bold text-emerald-400 mt-1">+${totalNetProfit.toLocaleString()} so'm</h3>
            </div>
            <div class="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <p class="text-xs text-slate-400">O'rtacha Marja Rentabelligi</p>
                <h3 class="text-xl font-bold text-blue-400 mt-1">${profitMarginPct}%</h3>
            </div>
        </div>

        <div class="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div class="p-4 bg-slate-900 border-b border-slate-800 font-bold text-xs text-white flex justify-between items-center">
                <span>Hamkorlarga To'lovlar va Qarzlar Jurnali</span>
                <span class="text-[10px] text-slate-400">Vypłata amalga oshirilganda qarz kamayadi</span>
            </div>
            <table class="w-full text-left text-xs">
                <thead class="bg-slate-900/80 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-semibold">
                    <tr>
                        <th class="py-2.5 px-3">Hamkor Kompaniya</th>
                        <th class="py-2.5 px-3">Xizmat turi</th>
                        <th class="py-2.5 px-3">Telefon</th>
                        <th class="py-2.5 px-3">Joriy Qarzimiz</th>
                        <th class="py-2.5 px-3 text-right">Amal</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 text-slate-300">
                    ${(DB.service_partners || []).map(p => `
                        <tr class="hover:bg-slate-800/40">
                            <td class="py-3 px-4 font-bold text-white">${p.company_name}</td>
                            <td class="py-3 px-4"><span class="badge-status bg-slate-800 text-slate-300 text-[10px]">${p.service_category}</span></td>
                            <td class="py-3 px-4 font-mono text-slate-400">${p.phone_primary}</td>
                            <td class="py-3 px-4 font-mono font-bold ${p.balance < 0 ? 'text-red-400' : 'text-slate-400'}">
                                ${Math.abs(p.balance).toLocaleString()} so'm
                            </td>
                            <td class="py-3 px-4 text-right">
                                <button onclick="openModalPartnerPayout(${p.id})" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white">
                                    Haqini To'lash (Vypłata)
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = summaryHtml;
}

function openModalPartnerPayout(partnerId) {
    const p = (DB.service_partners || []).find(part => part.id === partnerId);
    if (!p) return;

    document.getElementById('ppo-partner-id').value = p.id;
    document.getElementById('ppo-partner-name').innerText = p.company_name;
    document.getElementById('ppo-current-debt').innerText = `${Math.abs(p.balance).toLocaleString()} so'm`;
    document.getElementById('ppo-amount').value = Math.abs(p.balance);
    document.getElementById('ppo-date').value = new Date().toISOString().split('T')[0];

    openModal('modal-partner-payout');
}

function handleSavePartnerPayout(e) {
    e.preventDefault();
    const partnerId = parseInt(document.getElementById('ppo-partner-id').value);
    const amount = parseFloat(document.getElementById('ppo-amount').value) || 0;
    const method = document.getElementById('ppo-method').value;
    const pDate = document.getElementById('ppo-date').value;

    const partner = (DB.service_partners || []).find(p => p.id === partnerId);
    if (!partner) return;

    // Debt decreases (becomes less negative)
    partner.balance += amount;

    if (!DB.partner_payouts) DB.partner_payouts = [];
    DB.partner_payouts.unshift({
        id: Date.now(),
        partner_id: partner.id,
        order_id: "UMUMIY_HISOB",
        payout_amount: amount,
        payment_method: method,
        date: pDate,
        paid_by: currentUser ? currentUser.full_name : "Kassir"
    });

    saveDB();
    closeModal('modal-partner-payout');
    renderPartnerFinanceSummary();
    renderPartnersDirectory();
    showNotification(`Hamkorga ${amount.toLocaleString()} so'm vypłata qilindi!`, "success");
}

// -------------------------------------------------------------------------
// 5. AUTOMATIC B2B PARTNER TELEGRAM DISPATCHER & LIVE EVENTS LISTENER
// -------------------------------------------------------------------------
async function autoDispatchOrderToPartner(order) {
    if (!order || !order.assigned_partner_id) return;
    const partner = (DB.service_partners || []).find(p => p.id === order.assigned_partner_id);
    const payload = {
        order_id: order.id,
        order_number: order.order_number,
        partner_id: order.assigned_partner_id,
        partner_name: partner ? partner.company_name : 'Hamkor',
        partner_phone: partner ? partner.phone_primary : '',
        service_type: (order.service_category || '').toUpperCase(),
        details: order.details || '',
        address: order.destination_address || 'Toshkent sh.',
        service_date: order.service_date || '',
        time: order.execution_time || '10:00',
        payout_amount: order.partner_payout_amount || 0,
        task_instruction: order.task_instruction || order.details || ''
    };

    try {
        const resp = await fetch('/api/partner-bot/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        if (data && data.telegram_sent) {
            showNotification(`🔔 Buyurtma #${order.order_number} ${partner ? partner.company_name : 'Hamkor'}ning Telegramiga yuborildi!`, "success");
        } else {
            console.log('[PartnerBot Dispatch]', data);
        }
    } catch (e) {
        console.warn('[PartnerBot] Auto-dispatch network error:', e);
    }
}
window.autoDispatchOrderToPartner = autoDispatchOrderToPartner;

// Live events polling listener for Seller UI (updates on Telegram button clicks in real time)
let lastPartnerEventTimestamp = Date.now() - 5000;
let partnerLiveEventsPoller = null;

function initPartnerLiveEventsListener() {
    if (partnerLiveEventsPoller) return;
    partnerLiveEventsPoller = setInterval(async () => {
        try {
            const resp = await fetch(`/api/partner-bot/live-events?since=${lastPartnerEventTimestamp}`);
            if (!resp.ok) return;
            const data = await resp.json();
            if (data && data.events && data.events.length > 0) {
                let hasChanges = false;
                data.events.forEach(ev => {
                    if (ev.timestamp > lastPartnerEventTimestamp) {
                        lastPartnerEventTimestamp = ev.timestamp;
                    }
                    const order = (DB.service_orders || []).find(o => o.id === ev.order_id || o.order_number === ev.order_number);
                    if (order && order.order_status !== ev.status) {
                        order.order_status = ev.status;
                        hasChanges = true;
                    }

                    if (ev.type === 'accept') {
                        showNotification(`✅ Hamkor (${ev.partner_name || 'Hamkor'}) #${ev.order_number} buyurtmani qabul qildi!`, "success");
                    } else if (ev.type === 'reject') {
                        showNotification(`⚠️ Hamkor buyurtmani rad etdi, boshqa hamkorni tanlang!`, "error");
                    } else if (ev.type === 'finish') {
                        showNotification(`🏁 Hamkor #${ev.order_number} buyurtmani yakunladi!`, "success");
                    }
                });

                if (hasChanges) {
                    saveDB();
                    if (typeof renderServiceOrdersTable === 'function') renderServiceOrdersTable();
                }
            }
        } catch (e) {}
    }, 2000);
}

// Automatically start polling when page loads
if (typeof window !== 'undefined') {
    initPartnerLiveEventsListener();
}

