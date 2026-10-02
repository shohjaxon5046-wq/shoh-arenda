// =========================================================================
// SECTION 1: KIRIM ZANJIRI (PO, FACT CHECK, PLACEMENT, RETURNS)
// =========================================================================

let activeTab = 'tab-po';

function switchTab(tabId) {
    activeTab = tabId;
    const tabs = ['tab-po', 'tab-receipt', 'tab-placement', 'tab-returns', 'tab-warehouse-map'];
    const names = {
        'tab-po': '1. Buyurtma (PO)',
        'tab-receipt': '2. Kirim (Fact Check)',
        'tab-placement': '3. Joylashtirish',
        'tab-returns': '4. Vozvrat (Qaytarish)',
        'tab-warehouse-map': '5. Ombor Xaritasi (WMS)'
    };

    tabs.forEach(t => {
        const el = document.getElementById(t);
        const pill = document.getElementById(`tab-btn-${t.replace('tab-', '')}`);
        const sideBtn = document.getElementById(`btn-${t}`);

        if (t === tabId) {
            if (el) el.classList.remove('hidden');
            if (pill) pill.className = "tab-pill pb-3 px-4 text-xs font-bold border-b-2 border-blue-500 text-blue-400 flex items-center gap-2 transition";
            if (sideBtn) sideBtn.className = "nav-subtab w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-800 transition";
        } else {
            if (el) el.classList.add('hidden');
            if (pill) pill.className = "tab-pill pb-3 px-4 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2 transition";
            if (sideBtn) sideBtn.className = "nav-subtab w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition";
        }
    });

    const bTab = document.getElementById('breadcrumb-current-tab');
    if (bTab) bTab.innerText = names[tabId] || '';
    if (tabId === 'tab-warehouse-map' && typeof renderWarehouseMap === 'function') {
        renderWarehouseMap();
    }
    lucide.createIcons();
}

function renderAllTabs() {
    updateStatsAndBadges();
    renderPOTable();
    renderReceiptsTable();
    renderInventoryTable();
    renderReturnsTable();
    checkPendingPlacements();
    if (typeof renderWarehouseMap === 'function') renderWarehouseMap();
}

function updateStatsAndBadges() {
    const activeOrders = DB.supplier_orders.filter(o => o.status !== 'yakunlandi' && o.status !== 'bekor').length;
    const pendingInbound = DB.inbound_receipts.length;
    const totalStock = DB.product_items.filter(i => i.status === 'omborda_bosh').length;
    const totalReturns = DB.supplier_returns.length;

    const el1 = document.getElementById('stat-active-orders');
    const el2 = document.getElementById('stat-pending-inbound');
    const el3 = document.getElementById('stat-total-stock');
    const el4 = document.getElementById('stat-total-returns');

    if (el1) el1.innerText = activeOrders;
    if (el2) el2.innerText = pendingInbound;
    if (el3) el3.innerText = `${totalStock} dona`;
    if (el4) el4.innerText = `${totalReturns} dona`;

    const bPO = document.getElementById('badge-count-po');
    const bRec = document.getElementById('badge-count-receipt');
    const bPlace = document.getElementById('badge-count-placement');
    const bRet = document.getElementById('badge-count-returns');
    const bCat = document.getElementById('badge-catalog-count');

    if (bPO) bPO.innerText = DB.supplier_orders.length;
    if (bRec) bRec.innerText = DB.inbound_receipts.length;
    if (bPlace) bPlace.innerText = DB.product_items.length;
    if (bRet) bRet.innerText = DB.supplier_returns.length;
    if (bCat) bCat.innerText = DB.product_models.length;
}

// TAB 1: PO
function renderPOTable() {
    const tbody = document.getElementById('po-table-body');
    if (!tbody) return;
    const search = (document.getElementById('filter-po-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-po-status')?.value || '';

    tbody.innerHTML = '';

    const filtered = DB.supplier_orders.filter(o => {
        const sup = DB.suppliers.find(s => s.id === o.supplier_id);
        const supName = sup ? sup.company_name.toLowerCase() : '';
        const matchSearch = o.id.toLowerCase().includes(search) || supName.includes(search);
        const matchStatus = !statusFilter || o.status === statusFilter;
        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">Hech qanday buyurtma topilmadi</td></tr>`;
        return;
    }

    const statusBadges = {
        yangi: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">Yangi</span>',
        tasdiqlangan: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">Tasdiqlangan</span>',
        yetkazilmoqda: '<span class="badge-status bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Yetkazilmoqda</span>',
        yakunlandi: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Yakunlandi</span>'
    };

    filtered.forEach(order => {
        const sup = DB.suppliers.find(s => s.id === order.supplier_id);
        const itemsSummary = order.items.map(it => {
            const model = DB.product_models.find(m => m.id === it.product_model_id);
            return `${model ? model.name : 'Uskuna'} (${it.quantity} dona)`;
        }).join(', ');

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-white">${order.id}</td>
            <td class="py-3 px-4">
                <div class="font-semibold text-slate-200">${sup ? sup.company_name : 'Noma\'lum'}</div>
                <div class="text-[10px] text-slate-500">${sup ? sup.phone : ''}</div>
            </td>
            <td class="py-3 px-4 text-slate-400">${order.order_date}</td>
            <td class="py-3 px-4 text-slate-300 max-w-xs truncate" title="${itemsSummary}">${itemsSummary}</td>
            <td class="py-3 px-4 font-semibold text-emerald-400">${order.total_amount.toLocaleString()} so'm</td>
            <td class="py-3 px-4">${statusBadges[order.status] || order.status}</td>
            <td class="py-3 px-4 text-right">
                ${order.status !== 'yakunlandi' ? `
                    <button onclick="convertToInbound('${order.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white font-semibold text-xs transition">
                        <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5"></i>
                        <span>Kirimga o'tkazish</span>
                    </button>
                ` : `
                    <span class="text-xs text-slate-500 font-medium">Kirim qilingan ✔</span>
                `}
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openModalCreatePO() {
    const select = document.getElementById('po-supplier-select');
    select.innerHTML = DB.suppliers.map(s => `<option value="${s.id}">${s.company_name} (Balans: ${s.balance.toLocaleString()} so'm)</option>`).join('');
    document.getElementById('po-order-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('po-items-container').innerHTML = '';
    addPOLineItem();
    calculatePOTotal();
    openModal('modal-create-po');
}

function addPOLineItem() {
    const container = document.getElementById('po-items-container');
    const rowId = Date.now();
    const div = document.createElement('div');
    div.className = "flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 po-row";
    div.id = `po-row-${rowId}`;
    
    const modelOptions = DB.product_models.map(m => `<option value="${m.id}" data-price="${m.expected_price || 1000000}">${m.name} (${m.brand}) - ${(m.expected_price || 1000000).toLocaleString()} so'm</option>`).join('');

    div.innerHTML = `
        <select class="po-item-model flex-1 rounded-lg border border-slate-600 bg-slate-900 py-1.5 px-2 text-xs text-white focus:outline-none" onchange="calculatePOTotal()">
            ${modelOptions}
        </select>
        <input type="number" min="1" value="1" placeholder="Soni" class="po-item-qty w-20 rounded-lg border border-slate-600 bg-slate-900 py-1.5 px-2 text-xs text-white focus:outline-none text-center" oninput="calculatePOTotal()">
        <input type="number" step="10000" placeholder="Kutilayotgan narxi" class="po-item-price w-32 rounded-lg border border-slate-600 bg-slate-900 py-1.5 px-2 text-xs text-white focus:outline-none" oninput="calculatePOTotal()">
        <button type="button" onclick="removePOLineItem('${rowId}')" class="p-1.5 text-slate-400 hover:text-red-400 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(div);
    
    const selectEl = div.querySelector('.po-item-model');
    const priceEl = div.querySelector('.po-item-price');
    priceEl.value = selectEl.selectedOptions[0].getAttribute('data-price');
    
    calculatePOTotal();
    lucide.createIcons();
}

function removePOLineItem(rowId) {
    const row = document.getElementById(`po-row-${rowId}`);
    if (row) {
        row.remove();
        calculatePOTotal();
    }
}

function calculatePOTotal() {
    let total = 0;
    const rows = document.querySelectorAll('.po-row');
    rows.forEach(r => {
        const qty = parseInt(r.querySelector('.po-item-qty').value) || 0;
        const price = parseFloat(r.querySelector('.po-item-price').value) || 0;
        total += (qty * price);
    });
    const prev = document.getElementById('po-total-preview');
    if (prev) prev.innerText = `${total.toLocaleString()} so'm`;
    return total;
}

function handleCreatePO(e) {
    e.preventDefault();
    const supplierId = parseInt(document.getElementById('po-supplier-select').value);
    const orderDate = document.getElementById('po-order-date').value;
    const rows = document.querySelectorAll('.po-row');

    if (rows.length === 0) {
        alert("Kamida bitta uskuna qo'shilishi shart!");
        return;
    }

    const items = [];
    let total = 0;
    rows.forEach(r => {
        const modelId = parseInt(r.querySelector('.po-item-model').value);
        const qty = parseInt(r.querySelector('.po-item-qty').value) || 1;
        const price = parseFloat(r.querySelector('.po-item-price').value) || 0;
        items.push({ product_model_id: modelId, quantity: qty, expected_price: price });
        total += (qty * price);
    });

    const newId = `PO-2026-${String(DB.supplier_orders.length + 1).padStart(3, '0')}`;
    const newOrder = {
        id: newId,
        supplier_id: supplierId,
        order_date: orderDate,
        status: "tasdiqlangan",
        total_amount: total,
        items: items
    };

    DB.supplier_orders.unshift(newOrder);
    saveDB();
    closeModal('modal-create-po');
    renderPOTable();
    showNotification(`Buyurtma muvaffaqiyatli saqlandi! (${newId})`, "success");
}

function convertToInbound(poId) {
    switchSection('section-kirim');
    switchTab('tab-receipt');
    openModalCreateInbound(poId);
}

// TAB 2: INBOUND RECEIPT & FACT CHECK
function renderReceiptsTable() {
    const tbody = document.getElementById('receipts-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (DB.inbound_receipts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="py-8 text-center text-slate-500">Hozircha qabul qilingan kirim hujjatlari yo'q</td></tr>`;
        return;
    }

    DB.inbound_receipts.forEach(inb => {
        const sup = DB.suppliers.find(s => s.id === inb.supplier_id);
        let totalExpected = 0;
        let totalReceived = 0;
        let hasDiscrepancy = false;

        inb.items_fact.forEach(it => {
            totalExpected += it.ordered_qty;
            totalReceived += it.received_qty;
            if (it.ordered_qty !== it.received_qty) hasDiscrepancy = true;
        });

        const discrepancyInfo = hasDiscrepancy 
            ? `<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">Farq bor (${totalReceived - totalExpected})</span>`
            : `<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">✔ To'liq keldi</span>`;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-amber-400">${inb.invoice_number}</td>
            <td class="py-3 px-4 font-mono text-slate-400">${inb.order_id || 'PO yo\'q'}</td>
            <td class="py-3 px-4 font-medium text-slate-200">${sup ? sup.company_name : 'Noma\'lum'}</td>
            <td class="py-3 px-4 text-slate-400">${inb.received_date}</td>
            <td class="py-3 px-4 text-slate-300 font-semibold">${totalExpected} dona</td>
            <td class="py-3 px-4 text-emerald-400 font-semibold">${totalReceived} dona</td>
            <td class="py-3 px-4">${discrepancyInfo}</td>
            <td class="py-3 px-4 text-slate-400 text-xs">${inb.received_by}</td>
            <td class="py-3 px-4 text-right">
                <button onclick="sendToPlacement('${inb.id}')" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white font-semibold text-xs transition">
                    <i data-lucide="boxes" class="w-3.5 h-3.5"></i>
                    <span>Joylashtirish</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openModalCreateInbound(presetPoId = null) {
    const orderSelect = document.getElementById('inbound-order-select');
    orderSelect.innerHTML = '<option value="">-- Alohida kirim (PO-siz) --</option>' + 
        DB.supplier_orders.filter(o => o.status !== 'yakunlandi').map(o => {
            const sup = DB.suppliers.find(s => s.id === o.supplier_id);
            return `<option value="${o.id}">${o.id} - ${sup ? sup.company_name : ''}</option>`;
        }).join('');

    document.getElementById('inbound-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('inbound-invoice-number').value = `NAK-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    if (presetPoId) {
        orderSelect.value = presetPoId;
        onSelectPOForInbound(presetPoId);
    } else {
        onSelectPOForInbound(orderSelect.value);
    }

    openModal('modal-create-inbound');
}

function onSelectPOForInbound(poId) {
    const factBody = document.getElementById('inbound-fact-body');
    factBody.innerHTML = '';

    const order = DB.supplier_orders.find(o => o.id === poId);
    if (!order) {
        DB.product_models.slice(0, 2).forEach(m => {
            appendFactRow(m.id, m.name, 1, 1);
        });
        return;
    }

    order.items.forEach(it => {
        const model = DB.product_models.find(m => m.id === it.product_model_id);
        appendFactRow(it.product_model_id, model ? model.name : 'Model', it.quantity, it.quantity);
    });

    lucide.createIcons();
}

function appendFactRow(modelId, modelName, expectedQty, initialReceived) {
    const factBody = document.getElementById('inbound-fact-body');
    const tr = document.createElement('tr');
    tr.className = "fact-row";
    tr.dataset.modelId = modelId;
    tr.dataset.expected = expectedQty;

    tr.innerHTML = `
        <td class="py-2.5 px-3 font-medium text-white">${modelName}</td>
        <td class="py-2.5 px-3 text-slate-400 font-semibold">${expectedQty} dona</td>
        <td class="py-2.5 px-3">
            <input type="number" min="0" value="${initialReceived}" oninput="updateFactDiscrepancy(this)" class="fact-qty-input w-24 rounded-lg border border-slate-700 bg-slate-900 py-1 px-2 text-xs text-white focus:outline-none text-center">
        </td>
        <td class="py-2.5 px-3 fact-status-cell">
            <span class="text-emerald-400 font-semibold text-xs">To'liq</span>
        </td>
    `;
    factBody.appendChild(tr);
}

function updateFactDiscrepancy(inputEl) {
    const row = inputEl.closest('tr');
    const expected = parseInt(row.dataset.expected) || 0;
    const received = parseInt(inputEl.value) || 0;
    const cell = row.querySelector('.fact-status-cell');

    if (received === expected) {
        cell.innerHTML = `<span class="text-emerald-400 font-semibold text-xs">To'liq (${received})</span>`;
    } else if (received < expected) {
        cell.innerHTML = `<span class="text-amber-400 font-semibold text-xs">Yetishmovchilik (-${expected - received})</span>`;
    } else {
        cell.innerHTML = `<span class="text-blue-400 font-semibold text-xs">Ortiqcha (+${received - expected})</span>`;
    }
}

function handleCreateInbound(e) {
    e.preventDefault();
    const poId = document.getElementById('inbound-order-select').value;
    const invoiceNum = document.getElementById('inbound-invoice-number').value.trim();
    const inbDate = document.getElementById('inbound-date').value;

    const order = DB.supplier_orders.find(o => o.id === poId);
    const supplierId = order ? order.supplier_id : 1;

    const rows = document.querySelectorAll('.fact-row');
    const itemsFact = [];
    const placementQueue = [];
    let inboundTotalAmount = 0;

    rows.forEach(r => {
        const modelId = parseInt(r.dataset.modelId);
        const expected = parseInt(r.dataset.expected);
        const received = parseInt(r.querySelector('.fact-qty-input').value) || 0;
        const model = DB.product_models.find(m => m.id === modelId);
        
        itemsFact.push({
            product_model_id: modelId,
            ordered_qty: expected,
            received_qty: received
        });

        if (received > 0) {
            placementQueue.push({
                inbound_id: invoiceNum,
                product_model_id: modelId,
                count: received
            });
            if (model) inboundTotalAmount += (model.expected_price || 1000000) * received;
        }
    });

    const newInbound = {
        id: `INB-2026-${String(DB.inbound_receipts.length + 1).padStart(3, '0')}`,
        order_id: poId,
        supplier_id: supplierId,
        invoice_number: invoiceNum,
        received_date: inbDate,
        received_by: currentUser ? `${currentUser.full_name} (${currentUser.role_id})` : "Skladchi",
        items_fact: itemsFact
    };

    DB.inbound_receipts.unshift(newInbound);
    if (order) order.status = "yakunlandi";

    // Update supplier balance (we owe more money for received goods)
    const sup = DB.suppliers.find(s => s.id === supplierId);
    if (sup && inboundTotalAmount > 0) {
        sup.balance -= inboundTotalAmount; // becomes more negative (debt)
        DB.supplier_transactions.unshift({
            id: Date.now(),
            supplier_id: supplierId,
            type: "kirim_tovarlar",
            amount: inboundTotalAmount,
            payment_method: "nakladnoy",
            receipt_id: invoiceNum,
            comment: `Nakladnoy ${invoiceNum} bo'yicha kirim`,
            date: inbDate,
            created_by: currentUser ? currentUser.full_name : "Skladchi"
        });
    }

    if (!DB.pending_placements) DB.pending_placements = [];
    DB.pending_placements.push(...placementQueue);

    saveDB();
    closeModal('modal-create-inbound');
    renderReceiptsTable();
    renderPOTable();
    checkPendingPlacements();

    showNotification(`Kirim qabul qilindi va joylashtirish navbatiga qo'shildi!`, "success");
    setTimeout(() => switchTab('tab-placement'), 600);
}

function sendToPlacement(inboundId) {
    switchTab('tab-placement');
    openModalAddDirectItem();
}

// TAB 3: PLACEMENT & SERIAL UNIQUENESS
function checkPendingPlacements() {
    const alertBox = document.getElementById('pending-placement-alert');
    const text = document.getElementById('pending-placement-text');
    if (!alertBox || !text) return;
    const totalPending = (DB.pending_placements || []).reduce((acc, p) => acc + p.count, 0);

    if (totalPending > 0) {
        alertBox.classList.remove('hidden');
        text.innerText = `Kirimdan ${totalPending} dona uskuna hali seriya raqami va polka biriktirilishini kutmoqda.`;
    } else {
        alertBox.classList.add('hidden');
    }
}

function openPendingPlacementModal() {
    if (!DB.pending_placements || DB.pending_placements.length === 0) return;
    const topPending = DB.pending_placements[0];
    openModalAddDirectItem(topPending.product_model_id);
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;
    const search = (document.getElementById('filter-item-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-item-status')?.value || '';
    const locationFilter = document.getElementById('filter-item-location')?.value || '';

    tbody.innerHTML = '';

    const filtered = DB.product_items.filter(item => {
        const model = DB.product_models.find(m => m.id === item.product_model_id);
        const loc = DB.warehouse_locations.find(l => l.id === item.warehouse_location_id);
        
        const modelName = model ? model.name.toLowerCase() : '';
        const serial = (item.serial_number || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();
        
        const matchSearch = serial.includes(search) || barcode.includes(search) || modelName.includes(search);
        const matchStatus = !statusFilter || item.status === statusFilter;
        const matchLocation = !locationFilter || (loc && loc.zone.includes(locationFilter));

        return matchSearch && matchStatus && matchLocation;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">Hech qanday uskuna topilmadi</td></tr>`;
        return;
    }

    const statusBadges = {
        omborda_bosh: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Omborda bo\'sh (Tayyor)</span>',
        ijarada: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">🔵 Ijarada</span>',
        remontda: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 Remontda</span>',
        tozalanmoqda: '<span class="badge-status bg-purple-500/10 text-purple-400 border border-purple-500/20">🟣 Tozalanmoqda</span>',
        brak: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20">🔴 Brak</span>',
        vozvrat_qilingan: '<span class="badge-status bg-slate-700 text-slate-300">↩ Yetkazuvchiga qaytarilgan</span>'
    };

    filtered.forEach(item => {
        const model = DB.product_models.find(m => m.id === item.product_model_id);
        const loc = DB.warehouse_locations.find(l => l.id === item.warehouse_location_id);

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                <i data-lucide="cpu" class="w-4 h-4 text-blue-400"></i>
                <span>${item.serial_number}</span>
                <button type="button" onclick="copyText('${item.serial_number}')" title="Nusxalash" class="text-slate-400 hover:text-white">
                    <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
            </td>
            <td class="py-3 px-4 font-mono text-emerald-400">${item.barcode}</td>
            <td class="py-3 px-4">
                <div class="font-semibold text-slate-200">${model ? model.name : 'Noma\'lum'}</div>
                <div class="text-[10px] text-slate-500">${model ? model.brand : ''}</div>
            </td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs">
                    ${loc ? `${loc.shelf} - ${loc.bin}` : 'Joy belgilanmagan'}
                </span>
            </td>
            <td class="py-3 px-4">${statusBadges[item.status] || item.status}</td>
            <td class="py-3 px-4 font-medium text-slate-300">
                ${model ? `${(model.daily_price || 0).toLocaleString()} so'm / kun` : '-'}
            </td>
            <td class="py-3 px-4 text-right">
                <button onclick="openPrintStickerModal(${item.id})" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition">
                    <i data-lucide="printer" class="w-3.5 h-3.5 text-blue-400"></i>
                    <span>Stiker</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openModalAddDirectItem(presetModelId = null) {
    const modelSelect = document.getElementById('place-model-select');
    modelSelect.innerHTML = DB.product_models.map(m => `<option value="${m.id}">${m.name} (${m.brand})</option>`).join('');
    if (presetModelId) modelSelect.value = presetModelId;

    const locSelect = document.getElementById('place-location-select');
    locSelect.innerHTML = DB.warehouse_locations.map(l => `<option value="${l.id}">${l.zone} -> ${l.shelf} (${l.bin})</option>`).join('');

    generateAutoSerial();
    generateNewBarcode();
    openModal('modal-placement');
}

function onModelChangePlacement(modelId) {
    generateAutoSerial();
}

function checkSerialNumberUniqueness(serialValue) {
    const clean = serialValue.trim();
    const badge = document.getElementById('serial-validation-badge');
    const errorMsg = document.getElementById('serial-error-msg');
    const saveBtn = document.getElementById('btn-save-placement');

    if (!clean) {
        if (badge) { badge.innerText = "Kiritish shart"; badge.className = "text-[10px] font-semibold text-slate-500"; }
        if (errorMsg) errorMsg.classList.add('hidden');
        if (saveBtn) saveBtn.disabled = true;
        return false;
    }

    const exists = DB.product_items.some(it => it.serial_number.toLowerCase() === clean.toLowerCase());

    if (exists) {
        if (badge) { badge.innerText = "❌ DUBLIKAT!"; badge.className = "text-[10px] font-bold text-red-400 animate-pulse"; }
        if (errorMsg) errorMsg.classList.remove('hidden');
        if (saveBtn) { saveBtn.disabled = true; saveBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
        return false;
    } else {
        if (badge) { badge.innerText = "✔ UNIKAL (To'g'ri)"; badge.className = "text-[10px] font-bold text-emerald-400"; }
        if (errorMsg) errorMsg.classList.add('hidden');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.classList.remove('opacity-50', 'cursor-not-allowed'); }
        return true;
    }
}

function generateAutoSerial() {
    const modelSelect = document.getElementById('place-model-select');
    const model = DB.product_models.find(m => m.id === parseInt(modelSelect.value));
    const brandCode = model ? model.brand.substring(0, 3).toUpperCase() : 'WMS';
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const serial = `SN-${brandCode}-${randomNum}`;
    
    const input = document.getElementById('place-serial-number');
    if (input) {
        input.value = serial;
        checkSerialNumberUniqueness(serial);
    }
}

function generateNewBarcode() {
    const prefix = "2026";
    const random = Math.floor(10000000 + Math.random() * 90000000);
    const barcode = `${prefix}${random}`.substring(0, 12);
    const input = document.getElementById('place-barcode');
    if (input) {
        input.value = barcode;
        renderLiveBarcodePreview(barcode);
    }
}

function renderLiveBarcodePreview(barcodeValue) {
    try {
        JsBarcode("#barcode-preview-svg", barcodeValue, {
            format: "CODE128",
            lineColor: "#ffffff",
            width: 2,
            height: 40,
            displayValue: true,
            background: "transparent",
            fontSize: 12
        });
    } catch(e) {}
}

function handleSavePlacement(e) {
    e.preventDefault();
    const modelId = parseInt(document.getElementById('place-model-select').value);
    const serialNumber = document.getElementById('place-serial-number').value.trim();
    const barcode = document.getElementById('place-barcode').value.trim();
    const locationId = parseInt(document.getElementById('place-location-select').value);

    if (!checkSerialNumberUniqueness(serialNumber)) {
        alert("Seriya raqami unikal bo'lishi shart! Dublikatga ruxsat berilmaydi.");
        return;
    }

    const newItem = {
        id: Date.now(),
        product_model_id: modelId,
        serial_number: serialNumber,
        barcode: barcode,
        warehouse_location_id: locationId,
        condition: "a_lo",
        status: "omborda_bosh",
        total_rental_count: 0,
        total_revenue: 0,
        created_at: new Date().toISOString().split('T')[0]
    };

    DB.product_items.unshift(newItem);

    if (DB.pending_placements && DB.pending_placements.length > 0) {
        const pIndex = DB.pending_placements.findIndex(p => p.product_model_id === modelId);
        if (pIndex !== -1) {
            DB.pending_placements[pIndex].count -= 1;
            if (DB.pending_placements[pIndex].count <= 0) {
                DB.pending_placements.splice(pIndex, 1);
            }
        }
    }

    saveDB();
    closeModal('modal-placement');
    renderInventoryTable();
    checkPendingPlacements();
    showNotification(`Uskuna omborga joylashtirildi! (${serialNumber})`, "success");

    setTimeout(() => openPrintStickerModal(newItem.id), 300);
}

// TAB 4: RETURNS
function renderReturnsTable() {
    const tbody = document.getElementById('returns-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (DB.supplier_returns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-500">Hozircha qaytarilgan tovarlar mavjud emas</td></tr>`;
        return;
    }

    const reasonLabels = {
        brak: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20">Nuqsonli / Brak</span>',
        notugri_model: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">Noto\'g\'ri model</span>',
        ortiqcha: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">Ortiqcha partiya</span>'
    };

    DB.supplier_returns.forEach(ret => {
        const sup = DB.suppliers.find(s => s.id === ret.supplier_id);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-mono font-bold text-red-400">${ret.id}</td>
            <td class="py-3 px-4 font-medium text-white">${sup ? sup.company_name : 'Noma\'lum'}</td>
            <td class="py-3 px-4 text-slate-400">${ret.return_date}</td>
            <td class="py-3 px-4 font-mono text-amber-300 font-bold">${ret.serial_number}</td>
            <td class="py-3 px-4 text-slate-200">${ret.model_name}</td>
            <td class="py-3 px-4">${reasonLabels[ret.reason] || ret.reason}</td>
            <td class="py-3 px-4 font-semibold text-emerald-400">-${(ret.amount || 0).toLocaleString()} so'm</td>
            <td class="py-3 px-4 text-right">
                <button onclick="printReturnAct('${ret.id}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition">
                    Vozvrat Akti
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openModalCreateReturn() {
    const supSelect = document.getElementById('return-supplier-select');
    supSelect.innerHTML = DB.suppliers.map(s => `<option value="${s.id}">${s.company_name}</option>`).join('');

    const itemSelect = document.getElementById('return-item-select');
    const availableItems = DB.product_items.filter(i => i.status !== 'vozvrat_qilingan');

    itemSelect.innerHTML = availableItems.map(it => {
        const model = DB.product_models.find(m => m.id === it.product_model_id);
        return `<option value="${it.id}">SN: ${it.serial_number} — ${model ? model.name : ''} (Holati: ${it.status})</option>`;
    }).join('');

    document.getElementById('return-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('return-amount').value = "1200000";
    openModal('modal-create-return');
}

function handleCreateReturn(e) {
    e.preventDefault();
    const supplierId = parseInt(document.getElementById('return-supplier-select').value);
    const itemId = parseInt(document.getElementById('return-item-select').value);
    const reason = document.getElementById('return-reason-select').value;
    const retDate = document.getElementById('return-date').value;
    const amount = parseFloat(document.getElementById('return-amount').value) || 0;

    const item = DB.product_items.find(i => i.id === itemId);
    if (!item) return;

    const model = DB.product_models.find(m => m.id === item.product_model_id);
    item.status = "vozvrat_qilingan";

    const sup = DB.suppliers.find(s => s.id === supplierId);
    if (sup) sup.balance += amount; // We owe less debt, so balance increases

    const newReturn = {
        id: `RET-2026-${String(DB.supplier_returns.length + 1).padStart(3, '0')}`,
        supplier_id: supplierId,
        return_date: retDate,
        product_item_id: item.id,
        serial_number: item.serial_number,
        model_name: model ? model.name : 'Uskuna',
        reason: reason,
        amount: amount,
        status: "tasdiqlandi"
    };

    DB.supplier_returns.unshift(newReturn);

    DB.supplier_transactions.unshift({
        id: Date.now(),
        supplier_id: supplierId,
        type: "vozvrat",
        amount: amount,
        payment_method: "hisobdan_ayirish",
        receipt_id: newReturn.id,
        comment: `Vozvrat: ${item.serial_number} (${reason})`,
        date: retDate,
        created_by: currentUser ? currentUser.full_name : "Skladchi"
    });

    saveDB();
    closeModal('modal-create-return');
    renderReturnsTable();
    renderInventoryTable();
    showNotification(`Vozvrat hujjati tasdiqlandi! (${item.serial_number} qaytarildi)`, "success");
}

function printReturnAct(retId) {
    const ret = DB.supplier_returns.find(r => r.id === retId);
    if (!ret) return;
    const sup = DB.suppliers.find(s => s.id === ret.supplier_id);
    alert(`VOZVRAT AKTI (${ret.id})\nYetkazib beruvchi: ${sup ? sup.company_name : ''}\nUskuna Seriya №: ${ret.serial_number}\nModel: ${ret.model_name}\nSababi: ${ret.reason}\nSumma: ${ret.amount.toLocaleString()} so'm\n\nChop etish uchun tayyor.`);
}
