// =========================================================================
// WMS MODULE: WAREHOUSE MANAGEMENT SYSTEM — PICKING, PUTAWAY & INTERACTIVE MAP
// =========================================================================

// -------------------------------------------------------------------------
// 1. PICKING (OLIB CHIQISH) — POS & BUYURTMALAR BOG'LANISHI
// -------------------------------------------------------------------------

/**
 * Triggered when operator selects an available tool in POS modal dropdown
 */
function onPosToolSelectChange() {
    const select = document.getElementById('pos-tool-unit-select');
    const alertBox = document.getElementById('pos-tool-location-alert');
    if (!select || !alertBox) return;

    const unitId = parseInt(select.value);
    if (!unitId) {
        alertBox.classList.add('hidden');
        alertBox.innerHTML = '';
        return;
    }

    const unit = (DB.product_items || []).find(u => u.id === unitId);
    if (!unit) {
        alertBox.classList.add('hidden');
        return;
    }

    const loc = (DB.warehouse_locations || []).find(l => l.id === unit.warehouse_location_id);
    const locText = formatLocationDisplay(unit.warehouse_location_id);
    const locCode = getLocationCode(unit.warehouse_location_id);

    alertBox.classList.remove('hidden');
    alertBox.innerHTML = `
        <div class="p-3 rounded-2xl bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-slate-900 border-2 border-blue-500 shadow-xl text-xs flex items-center justify-between animate-pulse">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/30">
                    <i data-lucide="map-pin" class="w-5 h-5"></i>
                </div>
                <div>
                    <span class="text-[10px] text-blue-300 font-extrabold uppercase tracking-wider block">Ombordagi Joylashuv Manzili (WMS):</span>
                    <b class="text-sm font-black text-white tracking-wide">${locText}</b>
                </div>
            </div>
            <span class="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-mono font-black text-sm shadow-md shadow-amber-400/20 border border-amber-300">
                ${locCode}
            </span>
        </div>
    `;
    lucide.createIcons();
}

/**
 * Returns eye-catching location badge HTML for cart and order tables
 */
function renderWmsLocationBadgeHtml(locationId) {
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    const locText = formatLocationDisplay(locationId);
    const locCode = getLocationCode(locationId);

    return `
        <div class="mt-1 p-2 rounded-xl bg-gradient-to-r from-indigo-950/90 to-slate-900 border border-indigo-500/50 flex items-center justify-between text-xs shadow-sm">
            <div class="flex items-center gap-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-indigo-400 shrink-0"></i>
                <div>
                    <span class="text-[9px] text-indigo-300 font-extrabold uppercase tracking-wider block">Polka Manzili:</span>
                    <span class="font-bold text-white text-xs block">${locText}</span>
                </div>
            </div>
            <span class="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono font-bold text-xs border border-amber-400/30">
                ${locCode}
            </span>
        </div>
    `;
}

// -------------------------------------------------------------------------
// 2. SBORSHIK VARAG'I (PICK LIST) GENERATSIYASI VA CHOP ETISH
// -------------------------------------------------------------------------

/**
 * Opens printable Pick List modal for warehouseman (sorted by aisle/shelf)
 */
function openPickListModal(orderId) {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    let tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);

    // Sort tools strictly by warehouse location code (A-01-01 -> A-01-02 -> A-02-03 -> B-01-01 ...)
    tools.sort((a, b) => {
        const unitA = (DB.product_items || []).find(u => u.id === a.product_item_id);
        const unitB = (DB.product_items || []).find(u => u.id === b.product_item_id);
        const codeA = unitA ? getLocationCode(unitA.warehouse_location_id) : 'ZZZ';
        const codeB = unitB ? getLocationCode(unitB.warehouse_location_id) : 'ZZZ';
        return codeA.localeCompare(codeB);
    });

    const container = document.getElementById('picklist-content-container');
    if (!container) return;

    const orderNumEl = document.getElementById('modal-picklist-order-num');
    if (orderNumEl) orderNumEl.innerText = order.order_number;

    container.innerHTML = `
        <div id="printable-picklist-doc" class="p-6 bg-white text-slate-900 font-sans text-xs space-y-4 border border-slate-300 rounded shadow-md max-w-2xl mx-auto" style="font-family: Arial, sans-serif;">
            <!-- Header -->
            <div class="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                    <h2 class="text-base font-black uppercase tracking-wider text-slate-900">WMS OMBOREV: SBORSHIK VARAG'I (PICK LIST)</h2>
                    <p class="text-[11px] text-slate-600">Qurilish uskunalari omboridan asboblarni olib chiqish varag'i</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">Toshkent sh., Chilonzor sanoat zonasi, 4-bino | Tel: +998 71 200-00-00</p>
                </div>
                <div class="text-right">
                    <span class="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded">№ ${order.order_number}</span>
                    <p class="text-[10px] text-slate-600 mt-1">Sana: ${order.created_at || order.start_date || ''}</p>
                </div>
            </div>

            <!-- Customer & Picker Info -->
            <div class="grid grid-cols-2 gap-3 p-3 bg-slate-100 rounded border border-slate-200 text-xs">
                <div>
                    <p class="font-bold text-slate-800 text-[10px] uppercase">Mijoz (Buyurtmachi):</p>
                    <p class="font-bold text-slate-900">${customer ? customer.full_name : 'Mijoz'}</p>
                    <p class="text-slate-600 font-mono text-[11px]">${customer ? customer.phone_primary : ''}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 text-[10px] uppercase">Mas'ul Skladchi (Sborshik):</p>
                    <p class="font-bold text-slate-900">${currentUser ? currentUser.full_name : 'Skladchi'}</p>
                    <p class="text-slate-600 text-[10px]">Olib chiqish tartibi: Polkalar ketma-ketligi bo'yicha</p>
                </div>
            </div>

            <!-- Pick List Table (Sorted by Shelves) -->
            <div>
                <table class="w-full text-left border border-slate-300 text-xs">
                    <thead class="bg-slate-200 font-bold text-slate-800">
                        <tr>
                            <th class="p-2 border border-slate-300 text-center w-8">№</th>
                            <th class="p-2 border border-slate-300 bg-amber-100/80 text-amber-950 font-black">📍 Polka Manzili (WMS Joyi)</th>
                            <th class="p-2 border border-slate-300">Uskuna Nomi & Modeli</th>
                            <th class="p-2 border border-slate-300">Zavod Seriya №</th>
                            <th class="p-2 border border-slate-300 text-center">Shtrix-kod</th>
                            <th class="p-2 border border-slate-300 text-center w-24">Olib chiqildi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-300">
                        ${tools.map((t, idx) => {
                            const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
                            const locId = unit ? unit.warehouse_location_id : 1;
                            const locText = formatLocationDisplay(locId);
                            const locCode = getLocationCode(locId);
                            const isPicked = t.picking_status === 'olib_chiqildi';

                            return `
                            <tr class="${isPicked ? 'bg-emerald-50' : ''}">
                                <td class="p-2 border border-slate-300 text-center font-bold">${idx + 1}</td>
                                <td class="p-2 border border-slate-300 bg-amber-50/60">
                                    <div class="font-black text-slate-900 text-xs">${locText}</div>
                                    <span class="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 font-mono font-black text-[11px] border border-amber-400">
                                        Kod: ${locCode}
                                    </span>
                                </td>
                                <td class="p-2 border border-slate-300 font-bold text-slate-800">
                                    ${t.model_name}
                                </td>
                                <td class="p-2 border border-slate-300 font-mono font-bold text-blue-800">
                                    ${t.serial_number}
                                </td>
                                <td class="p-2 border border-slate-300 text-center">
                                    <svg id="picklist-barcode-${t.id}" class="max-h-8 mx-auto"></svg>
                                    <span class="text-[9px] font-mono block text-slate-600">${unit ? unit.barcode : ''}</span>
                                </td>
                                <td class="p-2 border border-slate-300 text-center">
                                    <div class="flex items-center justify-center gap-1.5">
                                        <input type="checkbox" ${isPicked ? 'checked' : ''} onchange="toggleItemPickedStatus(${order.id}, ${t.id}, this.checked)" class="w-4 h-4 rounded border-slate-400 text-emerald-600 focus:ring-0 cursor-pointer">
                                        <span class="text-[10px] font-bold ${isPicked ? 'text-emerald-700' : 'text-slate-500'}">
                                            ${isPicked ? 'Tayyor ✔' : 'Kutilmoqda'}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Notes & Signatures -->
            <div class="p-3 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-600 space-y-1">
                <p><b>Yo'riqnoma:</b> Skladchi har bir asbobni yuqorida ko'rsatilgan polka manzilidan olib, butunligini va komplektini tekshirishi hamda shtrix-kod skaner orqali tasdiqlashi shart.</p>
            </div>

            <div class="pt-6 grid grid-cols-2 gap-8 border-t border-slate-300 text-xs">
                <div>
                    <p class="font-bold text-slate-800 mb-6">Ombordan Olib Chiqdi (Skladchi):</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">Imzo: _____________________ / ${currentUser ? currentUser.full_name : 'Skladchi'}</p>
                </div>
                <div>
                    <p class="font-bold text-slate-800 mb-6">Mijozga Topshirdi (Operator):</p>
                    <p class="border-t border-slate-400 pt-1 text-slate-600">Imzo: _____________________ / ${currentUser ? currentUser.full_name : 'Admin'}</p>
                </div>
            </div>
        </div>
    `;

    // Render 1D Barcodes for each tool using JsBarcode
    setTimeout(() => {
        tools.forEach(t => {
            const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
            const barcodeVal = unit ? unit.barcode : t.serial_number;
            const svgEl = document.getElementById(`picklist-barcode-${t.id}`);
            if (svgEl && typeof JsBarcode === 'function') {
                try {
                    JsBarcode(svgEl, barcodeVal, {
                        format: "CODE128",
                        width: 1.2,
                        height: 24,
                        displayValue: false,
                        margin: 0
                    });
                } catch(e) {}
            }
        });
    }, 60);

    openModal('modal-picklist');
    lucide.createIcons();
}

function printPickListDocument() {
    const el = document.getElementById('printable-picklist-doc');
    if (!el) return;

    el.classList.add('printable-active');
    window.print();
    setTimeout(() => el.classList.remove('printable-active'), 1000);
}

// -------------------------------------------------------------------------
// 3. SKANER BILAN TASDIQLASH (BARCODE PICKING VERIFICATION)
// -------------------------------------------------------------------------

let activePickingOrderId = null;

function openPickingVerificationModal(orderId) {
    const order = (DB.orders || []).find(o => o.id === orderId);
    if (!order) return;

    activePickingOrderId = order.id;

    const numEl = document.getElementById('picking-modal-order-num');
    if (numEl) numEl.innerText = order.order_number;

    renderPickingVerificationList();
    openModal('modal-picking-verification');

    setTimeout(() => {
        const inp = document.getElementById('picking-barcode-scanner-input');
        if (inp) {
            inp.value = '';
            inp.focus();
        }
    }, 150);

    lucide.createIcons();
}

function renderPickingVerificationList() {
    if (!activePickingOrderId) return;
    const order = (DB.orders || []).find(o => o.id === activePickingOrderId);
    if (!order) return;

    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
    const container = document.getElementById('picking-items-list-container');
    if (!container) return;

    const totalCount = tools.length;
    const pickedCount = tools.filter(t => t.picking_status === 'olib_chiqildi').length;
    const isAllPicked = (totalCount > 0 && pickedCount === totalCount);

    // Update Progress Bar
    const percent = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0;
    const progressEl = document.getElementById('picking-progress-bar');
    const textEl = document.getElementById('picking-progress-text');
    if (progressEl) progressEl.style.width = `${percent}%`;
    if (textEl) textEl.innerText = `${pickedCount} / ${totalCount} ta asbob olib chiqildi (${percent}%)`;

    container.innerHTML = `
        <div class="space-y-3">
            ${isAllPicked ? `
                <div class="p-3.5 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-500/10 animate-bounce">
                    <i data-lucide="check-circle-2" class="w-5 h-5 text-emerald-400"></i>
                    <span>BARCHA USKUNALAR OMOBORDAN MUVAFFAQIYATLI OLIB CHIQILDI VA MIJOZGA BERILDI!</span>
                </div>
            ` : ''}

            ${tools.map((t, idx) => {
                const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
                const locId = unit ? unit.warehouse_location_id : 1;
                const locText = formatLocationDisplay(locId);
                const locCode = getLocationCode(locId);
                const isPicked = t.picking_status === 'olib_chiqildi';

                return `
                <div class="p-3.5 rounded-2xl border ${isPicked ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800 bg-slate-950'} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition">
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-xl ${isPicked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-600/20 text-blue-400'} flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                            ${isPicked ? '✔' : idx + 1}
                        </div>
                        <div>
                            <div class="font-bold text-white text-sm flex items-center gap-2">
                                <span>${t.model_name}</span>
                                <span class="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-800 text-blue-400 border border-slate-700">SN: ${t.serial_number}</span>
                            </div>
                            <!-- Big Location Pointer -->
                            <div class="mt-1.5 flex items-center gap-2">
                                <span class="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-500/40 text-indigo-300 font-extrabold text-xs flex items-center gap-1.5">
                                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-400"></i>
                                    <span>${locText}</span>
                                </span>
                                <span class="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-mono font-black text-xs border border-amber-400/40">
                                    Kod: ${locCode}
                                </span>
                            </div>
                            <div class="text-[10px] text-slate-500 mt-1 font-mono">Barcode: ${unit ? unit.barcode : '-'} ${t.picked_at ? `| Olib chiqilgan vaqt: ${t.picked_at}` : ''}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-end sm:self-center">
                        ${isPicked ? `
                            <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i> Olib chiqildi
                            </span>
                            <button type="button" onclick="toggleItemPickedStatus(${order.id}, ${t.id}, false)" class="text-[10px] text-slate-500 hover:text-red-400 underline">
                                Bekor qilish
                            </button>
                        ` : `
                            <button type="button" onclick="confirmItemPicked(${order.id}, ${t.id})" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition">
                                <i data-lucide="scan-barcode" class="w-3.5 h-3.5"></i>
                                <span>Olib chiqildi deb belgilash</span>
                            </button>
                        `}
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    `;

    lucide.createIcons();
}

/**
 * Handles barcode scan inside the Picking modal
 */
function handlePickingScanInput(e) {
    if (e.key !== 'Enter') return;
    const input = e.target;
    const query = input.value.trim().toLowerCase();
    if (!query || !activePickingOrderId) return;

    const order = (DB.orders || []).find(o => o.id === activePickingOrderId);
    if (!order) return;

    const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);

    // Match by serial number or barcode
    const matched = tools.find(t => {
        const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
        const matchSerial = (t.serial_number || '').toLowerCase() === query;
        const matchBarcode = unit && (unit.barcode || '').toLowerCase() === query;
        return matchSerial || matchBarcode;
    });

    if (matched) {
        matched.picking_status = 'olib_chiqildi';
        matched.picked_at = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        saveDB();
        showNotification(`✔ ${matched.model_name} (SN: ${matched.serial_number}) muvaffaqiyatli olib chiqildi va tasdiqlandi!`, "success");
        input.value = '';
        renderPickingVerificationList();
    } else {
        showNotification(`Ushbu buyurtmada "${query}" shtrix-kodi yoki seriyasiga mos asbob topilmadi!`, "error");
        input.select();
    }
}

function confirmItemPicked(orderId, toolItemId) {
    const item = (DB.order_tool_items || []).find(t => t.id === toolItemId && t.order_id === orderId);
    if (!item) return;

    item.picking_status = 'olib_chiqildi';
    item.picked_at = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    saveDB();
    showNotification(`✔ ${item.model_name} olib chiqildi deb belgilandi!`, "success");
    renderPickingVerificationList();
}

function toggleItemPickedStatus(orderId, toolItemId, isPicked) {
    const item = (DB.order_tool_items || []).find(t => t.id === toolItemId && t.order_id === orderId);
    if (!item) return;

    item.picking_status = isPicked ? 'olib_chiqildi' : 'kutilmoqda';
    item.picked_at = isPicked ? new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : null;
    saveDB();
    renderPickingVerificationList();
    if (activePickingOrderId === orderId) {
        showNotification(isPicked ? `✔ Asbob olib chiqildi deb belgilandi!` : `Holat qaytarildi`, "success");
    }
}

// -------------------------------------------------------------------------
// 4. OMBOR XARITASI (INTERACTIVE WMS MAP & RACK GRID)
// -------------------------------------------------------------------------

let wmsSelectedSector = 'all';

function renderWarehouseMap() {
    const gridContainer = document.getElementById('wms-map-grid-container');
    if (!gridContainer) return;

    const locations = DB.warehouse_locations || [];
    const items = DB.product_items || [];

    // Filter by sector
    const filteredLocations = locations.filter(loc => {
        if (wmsSelectedSector === 'all') return true;
        return (loc.sector && loc.sector.toLowerCase().includes(wmsSelectedSector.toLowerCase())) ||
               (loc.zone && loc.zone.toLowerCase().includes(wmsSelectedSector.toLowerCase()));
    });

    gridContainer.innerHTML = '';

    // Group locations by sector for visual aisles
    const sectors = {};
    filteredLocations.forEach(loc => {
        const secName = loc.sector || loc.zone?.split(' ')[0] + ' ' + (loc.zone?.split(' ')[1] || '') || 'Sektor A';
        if (!sectors[secName]) sectors[secName] = [];
        sectors[secName].push(loc);
    });

    Object.keys(sectors).forEach(secName => {
        const secDiv = document.createElement('div');
        secDiv.className = "space-y-3";

        const locs = sectors[secName];
        secDiv.innerHTML = `
            <div class="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 class="text-sm font-extrabold text-white flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>${secName}</span>
                </h3>
                <span class="text-xs text-slate-400 font-semibold">${locs.length} ta yacheyka</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${locs.map(loc => {
                    const occ = getLocationOccupancy(loc.id);
                    let statusBadge = '';
                    let cardBorder = 'border-slate-800 hover:border-blue-500/60';
                    let bgStatus = 'bg-slate-900/80';

                    if (occ.isEmpty) {
                        statusBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">🟢 Bo'sh (${occ.max} ta joy)</span>`;
                        cardBorder = 'border-emerald-500/30 hover:border-emerald-500';
                    } else if (occ.isFull) {
                        statusBadge = `<span class="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold text-[10px]">🔴 To'lgan (${occ.count}/${occ.max})</span>`;
                        cardBorder = 'border-red-500/40 hover:border-red-500';
                        bgStatus = 'bg-red-950/10';
                    } else {
                        statusBadge = `<span class="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px]">🔵 Band (${occ.count}/${occ.max})</span>`;
                        cardBorder = 'border-blue-500/30 hover:border-blue-500';
                    }

                    return `
                    <div onclick="openLocationDetailsModal(${loc.id})" class="p-4 rounded-2xl border ${cardBorder} ${bgStatus} shadow-lg backdrop-blur-sm cursor-pointer transition transform hover:-translate-y-1 group">
                        <div class="flex items-start justify-between">
                            <div>
                                <span class="px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 font-mono font-black text-xs border border-amber-400/30 group-hover:scale-105 transition">
                                    ${loc.code}
                                </span>
                                <h4 class="text-xs font-bold text-white mt-1.5">${loc.shelf} &bull; ${loc.bin}</h4>
                            </div>
                            ${statusBadge}
                        </div>

                        <!-- Progress Bar of Shelf Capacity -->
                        <div class="mt-3">
                            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div class="h-full ${occ.isFull ? 'bg-red-500' : (occ.isEmpty ? 'bg-emerald-500' : 'bg-blue-500')} rounded-full" style="width: ${Math.min(100, Math.round((occ.count / occ.max) * 100))}%"></div>
                            </div>
                        </div>

                        <!-- Items Preview List inside this Shelf -->
                        <div class="mt-3 pt-2 border-t border-slate-800/80 space-y-1.5 min-h-[50px]">
                            ${occ.items.length === 0 ? `
                                <p class="text-[10px] text-slate-500 italic">Hozirda polka bo'sh, yangi uskuna joylashtirish mumkin.</p>
                            ` : occ.items.slice(0, 2).map(it => {
                                const m = (DB.product_models || []).find(pm => pm.id === it.product_model_id);
                                return `
                                    <div class="flex justify-between items-center text-[10px] text-slate-300 bg-slate-950/60 px-2 py-1 rounded-lg">
                                        <span class="truncate max-w-[120px] font-semibold text-white">${m ? m.name : 'Uskuna'}</span>
                                        <span class="font-mono text-blue-400 font-bold">${it.serial_number}</span>
                                    </div>
                                `;
                            }).join('')}
                            ${occ.items.length > 2 ? `<div class="text-[9px] text-blue-400 font-bold text-right">+ yana ${occ.items.length - 2} ta asbob</div>` : ''}
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        gridContainer.appendChild(secDiv);
    });

    lucide.createIcons();
}

function filterWmsSector(sectorName) {
    wmsSelectedSector = sectorName;

    const btns = ['wms-sec-all', 'wms-sec-a', 'wms-sec-b', 'wms-sec-c', 'wms-sec-d'];
    btns.forEach(bId => {
        const el = document.getElementById(bId);
        if (!el) return;
        el.className = "px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition";
    });

    const activeMap = {
        'all': 'wms-sec-all',
        'sektor a': 'wms-sec-a',
        'sektor b': 'wms-sec-b',
        'sektor c': 'wms-sec-c',
        'sektor d': 'wms-sec-d'
    };
    const activeEl = document.getElementById(activeMap[sectorName.toLowerCase()]);
    if (activeEl) activeEl.className = "px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 transition";

    renderWarehouseMap();
}

/**
 * Detailed drawer/modal for a single warehouse shelf
 */
function openLocationDetailsModal(locationId) {
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    if (!loc) return;

    const occ = getLocationOccupancy(locationId);

    const titleEl = document.getElementById('modal-loc-title');
    const codeEl = document.getElementById('modal-loc-code');
    const detailsContainer = document.getElementById('modal-loc-items-container');

    if (titleEl) titleEl.innerText = `${loc.zone || loc.sector} - ${loc.shelf} (${loc.bin})`;
    if (codeEl) codeEl.innerText = loc.code;

    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="space-y-4">
                <!-- Info Banner -->
                <div class="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                        <div class="text-[10px] text-slate-400 uppercase font-semibold">Sig'im ko'rsatkichi:</div>
                        <div class="text-sm font-bold text-white">${occ.count} / ${occ.max} ta asbob joylashgan (${occ.availableSlots} ta bo'sh o'rin)</div>
                    </div>
                    <button type="button" onclick="printShelfBarcodeSticker(${loc.id})" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition">
                        <i data-lucide="printer" class="w-3.5 h-3.5 text-blue-400"></i>
                        <span>Polka Stikerini Chop Etish</span>
                    </button>
                </div>

                <!-- Items list -->
                <div>
                    <h4 class="text-xs font-bold text-white mb-2 uppercase tracking-wider">Polkadagi Hozirgi Asboblar:</h4>
                    ${occ.items.length === 0 ? `
                        <div class="p-6 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                            <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                            Ushbu yacheykada hozirda hech qanday asbob yo'q. Bo'sh turibdi.
                        </div>
                    ` : `
                        <div class="space-y-2">
                            ${occ.items.map((it, idx) => {
                                const m = (DB.product_models || []).find(pm => pm.id === it.product_model_id);
                                return `
                                <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">${idx + 1}</div>
                                        <div>
                                            <div class="font-bold text-white">${m ? m.name : 'Uskuna'}</div>
                                            <div class="text-[10px] text-slate-400 font-mono">SN: <b class="text-blue-400">${it.serial_number}</b> | Barcode: ${it.barcode}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${it.status === 'omborda_bosh' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}">
                                            ${it.status === 'omborda_bosh' ? 'Bo\'sh (Tayyor)' : it.status}
                                        </span>
                                        <button type="button" onclick="moveItemToOtherLocation(${it.id})" class="px-2.5 py-1 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-semibold" title="Boshqa polkaga ko'chirish">
                                            Ko'chirish &rarr;
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    openModal('modal-location-details');
    lucide.createIcons();
}

/**
 * Moves an item from one shelf to another
 */
function moveItemToOtherLocation(itemId) {
    const item = (DB.product_items || []).find(u => u.id === itemId);
    if (!item) return;

    const newLocIdStr = prompt(
        `Asbob: ${item.serial_number}\nYangi polka ID sini kiriting:\n` +
        DB.warehouse_locations.map(l => `${l.id}: [${l.code}] ${l.zone} - ${l.shelf}`).join('\n')
    );

    if (!newLocIdStr) return;
    const newLocId = parseInt(newLocIdStr);
    const targetLoc = (DB.warehouse_locations || []).find(l => l.id === newLocId);

    if (!targetLoc) {
        alert("Noto'g'ri polka ID si kiritildi!");
        return;
    }

    item.warehouse_location_id = newLocId;
    saveDB();
    showNotification(`Asbob ${item.serial_number} muvaffaqiyatli ${targetLoc.code} ga ko'chirildi!`, "success");
    openLocationDetailsModal(newLocId);
    renderWarehouseMap();
}

/**
 * Print 1D barcode sticker for warehouse shelves/racks
 */
function printShelfBarcodeSticker(locationId) {
    const loc = (DB.warehouse_locations || []).find(l => l.id === locationId);
    if (!loc) return;

    const modal = document.getElementById('modal-print-shelf-label');
    const nameEl = document.getElementById('shelf-sticker-name');
    const codeEl = document.getElementById('shelf-sticker-code');
    const svgEl = document.getElementById('shelf-sticker-barcode');

    if (nameEl) nameEl.innerText = `${loc.zone || loc.sector} - ${loc.shelf} (${loc.bin})`;
    if (codeEl) codeEl.innerText = loc.code;

    if (svgEl && typeof JsBarcode === 'function') {
        try {
            JsBarcode(svgEl, loc.code, {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 14
            });
        } catch(e) {}
    }

    openModal('modal-print-shelf-label');
    lucide.createIcons();
}

function printShelfStickerArea() {
    const el = document.getElementById('shelf-sticker-printable-area');
    if (!el) return;

    el.classList.add('printable-active');
    window.print();
    setTimeout(() => el.classList.remove('printable-active'), 1000);
}
