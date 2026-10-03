// =========================================================================
// SECTION 2: ASBOBLAR KATALOGI, MUKAMMAL TOVAR KARTOCHKASI, NARXLAR & TO
// =========================================================================

let selectedCategoryFilter = 0;
let currentEditingModel = null;
let currentKitItems = [];
let currentConsumables = [];

function renderCatalogCards() {
    renderCategoryPills();

    const grid = document.getElementById('catalog-cards-grid');
    if (!grid) return;
    const search = (document.getElementById('filter-catalog-search')?.value || '').toLowerCase();
    const availFilter = document.getElementById('filter-catalog-availability')?.value || '';

    grid.innerHTML = '';

    const filtered = DB.product_models.filter(model => {
        const matchCat = selectedCategoryFilter === 0 || model.category_id === selectedCategoryFilter;
        const matchSearch = model.name.toLowerCase().includes(search) || 
                            model.brand.toLowerCase().includes(search) || 
                            (model.model_code || '').toLowerCase().includes(search);

        const items = DB.product_items.filter(i => i.product_model_id === model.id);
        const availableCount = items.filter(i => i.status === 'omborda_bosh').length;
        const rentedCount = items.filter(i => i.status === 'ijarada').length;
        const repairCount = items.filter(i => i.status === 'remontda').length;

        let matchAvail = true;
        if (availFilter === 'available') matchAvail = availableCount > 0;
        if (availFilter === 'rented') matchAvail = rentedCount > 0 && availableCount === 0;
        if (availFilter === 'repair') matchAvail = repairCount > 0;

        return matchCat && matchSearch && matchAvail;
    });

    const bCat = document.getElementById('badge-catalog-count');
    if (bCat) bCat.innerText = DB.product_models.length;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-16 text-center text-slate-500">
                <i data-lucide="package-x" class="w-12 h-12 mx-auto mb-2 text-slate-600"></i>
                <p class="text-sm font-semibold">Hech qanday uskuna modeli topilmadi</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    filtered.forEach(model => {
        const cat = DB.categories.find(c => c.id === model.category_id);
        const items = DB.product_items.filter(i => i.product_model_id === model.id && i.status !== 'vozvrat_qilingan');
        const totalUnits = items.length;
        const availableUnits = items.filter(i => i.status === 'omborda_bosh').length;
        const rentedUnits = items.filter(i => i.status === 'ijarada').length;
        const repairUnits = items.filter(i => i.status === 'remontda').length;

        const card = document.createElement('div');
        card.className = "rounded-2xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-700 hover:shadow-2xl transition duration-200 flex flex-col justify-between group";

        card.innerHTML = `
            <div>
                <div class="relative w-full h-40 rounded-xl bg-slate-950 overflow-hidden mb-3.5 flex items-center justify-center p-2 border border-slate-800/80">
                    <img src="${model.image || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80'}" alt="${model.name}" class="h-full w-full object-contain group-hover:scale-105 transition duration-300">
                    <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] font-bold text-slate-300">
                        ${model.brand}
                    </span>
                    <span class="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-semibold border border-blue-500/30">
                        ${cat ? cat.name : 'Uskuna'}
                    </span>
                </div>

                <div class="mb-2">
                    <h3 class="text-sm font-bold text-white group-hover:text-emerald-400 transition truncate" title="${model.name}">${model.name}</h3>
                    <p class="text-[11px] text-slate-400 font-mono">${model.model_code || 'Artikul yo\'q'}</p>
                </div>

                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] text-slate-400">Kunlik ijara:</span>
                        <span class="text-xs font-extrabold text-emerald-400">${(model.daily_price || 0).toLocaleString()} so'm</span>
                    </div>
                    <div class="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Zalog depozit:</span>
                        <span class="font-semibold text-slate-300">${(model.deposit_amount || 0).toLocaleString()} so'm</span>
                    </div>
                </div>

                <div class="mb-3 space-y-1.5">
                    <div class="flex items-center justify-between text-[11px]">
                        <span class="text-slate-400 font-medium">Ombordagi zaxira:</span>
                        <span class="font-bold ${availableUnits > 0 ? 'text-emerald-400' : 'text-red-400'}">
                            ${availableUnits} / ${totalUnits} dona bo'sh
                        </span>
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                        <div class="bg-emerald-500 h-full" style="width: ${totalUnits > 0 ? (availableUnits/totalUnits)*100 : 0}%" title="Omborda bo'sh"></div>
                        <div class="bg-blue-500 h-full" style="width: ${totalUnits > 0 ? (rentedUnits/totalUnits)*100 : 0}%" title="Ijarada"></div>
                        <div class="bg-amber-500 h-full" style="width: ${totalUnits > 0 ? (repairUnits/totalUnits)*100 : 0}%" title="Remontda"></div>
                    </div>
                    <div class="flex items-center gap-2 text-[9px] text-slate-400 pt-0.5">
                        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ${availableUnits} bo'sh</span>
                        <span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> ${rentedUnits} ijarada</span>
                        ${repairUnits > 0 ? `<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> ${repairUnits} remont</span>` : ''}
                    </div>
                </div>
            </div>

            <div class="pt-2 border-t border-slate-800 flex items-center gap-2">
                <button onclick="openProductCardModal(${model.id})" class="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center justify-center gap-1.5">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5 text-blue-400"></i>
                    <span>Batafsil kartochka</span>
                </button>
                <button onclick="openAddUnitForModel(${model.id})" title="Yangi dona qo'shish" class="p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition">
                    <i data-lucide="plus" class="w-4 h-4"></i>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    lucide.createIcons();
}

function renderCategoryPills() {
    const container = document.getElementById('catalog-category-pills');
    if (!container) return;
    container.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.onclick = () => { selectedCategoryFilter = 0; renderCatalogCards(); };
    allBtn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
        selectedCategoryFilter === 0 
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
    }`;
    allBtn.innerText = "Barcha Uskunalar";
    container.appendChild(allBtn);

    DB.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.onclick = () => { selectedCategoryFilter = cat.id; renderCatalogCards(); };
        btn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
            selectedCategoryFilter === cat.id 
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' 
            : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
        }`;
        btn.innerText = cat.name;
        container.appendChild(btn);
    });
}

function switchProductCardTab(tabId) {
    const tabs = ['p-tab-general', 'p-tab-prices', 'p-tab-checklist', 'p-tab-units', 'p-tab-maintenance'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        const btn = document.getElementById(t.replace('p-tab-', 'p-btn-'));
        if (t === tabId) {
            if (el) el.classList.remove('hidden');
            if (btn) btn.className = "pt-3 pb-2.5 px-3 text-xs font-bold border-b-2 border-emerald-500 text-emerald-400 flex items-center gap-2";
        } else {
            if (el) el.classList.add('hidden');
            if (btn) btn.className = "pt-3 pb-2.5 px-3 text-xs font-bold border-b-2 border-transparent text-slate-400 hover:text-white flex items-center gap-2";
        }
    });
    lucide.createIcons();
}

function openModalCreateProductModel() {
    try {
        currentEditingModel = null;
        currentKitItems = ["Keys/Chemodan", "Qo'shimcha tutqich", "Pasport/Yo'riqnoma"];
        currentConsumables = [];

        const title = document.getElementById('mp-title');
        if (title) title.innerText = "Yangi Tovar Qo'shish";
        const subtitle = document.getElementById('mp-subtitle');
        if (subtitle) subtitle.innerText = "Yangi uskuna modeli, texnik ko'rsatkichlari va narxlari";
        const idEl = document.getElementById('mp-id');
        if (idEl) idEl.value = '';

        const nameEl = document.getElementById('mp-name');
        if (nameEl) nameEl.value = '';
        const brandEl = document.getElementById('mp-brand');
        if (brandEl) brandEl.value = '';
        const codeEl = document.getElementById('mp-model-code');
        if (codeEl) codeEl.value = '';
        const imgUrlEl = document.getElementById('mp-image-url');
        if (imgUrlEl) imgUrlEl.value = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80';
        const imgPrevEl = document.getElementById('mp-image-preview');
        if (imgPrevEl) imgPrevEl.src = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80';

        const catSel = document.getElementById('mp-category-select');
        if (catSel) {
            catSel.innerHTML = (DB.categories || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('mp-spec-power', '800 W');
        setVal('mp-spec-impact', '2.5 J');
        setVal('mp-spec-chuck', 'SDS-Plus');
        setVal('mp-spec-weight', '2.8 kg');
        setVal('mp-spec-fuel', '220V Tarmoq');
        setVal('mp-spec-extra', '');

        setVal('mp-daily-price', 80000);
        setVal('mp-hourly-price', 15000);
        setVal('mp-deposit-amount', 500000);
        setVal('mp-discount-3days', 70000);
        setVal('mp-discount-7days', 60000);
        setVal('mp-late-fee', 20000);
        setVal('mp-replacement-cost', 1800000);

        applyPricePermissions();
        renderKitItemsTags();
        renderConsumablesTags();
        renderModelUnitsTable([]);
        renderModelMaintenanceTable([]);

        switchProductCardTab('p-tab-general');
        openModal('modal-product-card');
    } catch (err) {
        console.error("openModalCreateProductModel error:", err);
    }
}

function openProductCardModal(modelId) {
    try {
        const model = (DB.product_models || []).find(m => m.id === modelId);
        if (!model) return;

        currentEditingModel = model;
        currentKitItems = [...(model.kit_items || [])];
        currentConsumables = [...(model.consumables || [])];

        const title = document.getElementById('mp-title');
        if (title) title.innerText = `${model.name} (${model.brand})`;
        const subtitle = document.getElementById('mp-subtitle');
        if (subtitle) subtitle.innerText = `Model kodi: ${model.model_code || 'Yo\'q'}`;
        const idEl = document.getElementById('mp-id');
        if (idEl) idEl.value = model.id;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('mp-name', model.name || '');
        setVal('mp-brand', model.brand || '');
        setVal('mp-model-code', model.model_code || '');
        setVal('mp-image-url', model.image || '');
        const imgPrev = document.getElementById('mp-image-preview');
        if (imgPrev) imgPrev.src = model.image || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80';

        const catSel = document.getElementById('mp-category-select');
        if (catSel) {
            catSel.innerHTML = (DB.categories || []).map(c => `<option value="${c.id}" ${c.id === model.category_id ? 'selected' : ''}>${c.name}</option>`).join('');
        }

        const sp = model.specifications || {};
        setVal('mp-spec-power', sp.power || '');
        setVal('mp-spec-impact', sp.impact || '');
        setVal('mp-spec-chuck', sp.chuck || '');
        setVal('mp-spec-weight', sp.weight || '');
        setVal('mp-spec-fuel', sp.fuel || '');
        setVal('mp-spec-extra', sp.extra || '');

        setVal('mp-daily-price', model.daily_price || 0);
        setVal('mp-hourly-price', model.hourly_price || 0);
        setVal('mp-deposit-amount', model.deposit_amount || 0);
        setVal('mp-discount-3days', model.discount_3_days || 0);
        setVal('mp-discount-7days', model.discount_7_days || 0);
        setVal('mp-late-fee', model.late_fee_per_hour || 0);
        setVal('mp-replacement-cost', model.replacement_cost || 0);

        applyPricePermissions();
        renderKitItemsTags();
        renderConsumablesTags();

        const units = (DB.product_items || []).filter(i => i.product_model_id === model.id);
        renderModelUnitsTable(units);

        const mLogs = (DB.maintenance_logs || []).filter(m => {
            const item = (DB.product_items || []).find(it => it.id === m.product_item_id);
            return item && item.product_model_id === model.id;
        });
        renderModelMaintenanceTable(mLogs);

        switchProductCardTab('p-tab-general');
        openModal('modal-product-card');
    } catch (err) {
        console.error("openProductCardModal error:", err);
    }
}

function applyPricePermissions() {
    const isAdmin = currentUser && (currentUser.role_id === 'admin' || currentUser.role === 'admin');
    const priceInputs = document.querySelectorAll('.price-input');
    const warnBox = document.getElementById('mp-role-restriction-warning');
    const adminBadge = document.getElementById('mp-admin-badge');

    if (isAdmin) {
        priceInputs.forEach(inp => inp.disabled = false);
        if (warnBox) warnBox.classList.add('hidden');
        if (adminBadge) {
            adminBadge.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1";
            adminBadge.innerHTML = `<i data-lucide="shield-check" class="w-3.5 h-3.5"></i> <span>Admin (Tahrirlash ochiq)</span>`;
        }
    } else {
        priceInputs.forEach(inp => inp.disabled = true);
        if (warnBox) warnBox.classList.remove('hidden');
        if (adminBadge) {
            adminBadge.className = "px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1";
            adminBadge.innerHTML = `<i data-lucide="lock" class="w-3.5 h-3.5"></i> <span>Faqat ko'rish (${currentUser ? currentUser.role_id : 'xodim'})</span>`;
        }
    }
    lucide.createIcons();
}

function renderKitItemsTags() {
    const container = document.getElementById('kit-items-list');
    if (!container) return;
    container.innerHTML = '';
    if (currentKitItems.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-500">Hech qanday komplektatsiya biriktirilmagan</span>`;
        return;
    }
    currentKitItems.forEach((item, idx) => {
        const tag = document.createElement('span');
        tag.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200";
        tag.innerHTML = `
            <i data-lucide="check" class="w-3 h-3 text-emerald-400"></i>
            <span>${item}</span>
            <button type="button" onclick="removeKitItem(${idx})" class="text-slate-400 hover:text-red-400 ml-1">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        container.appendChild(tag);
    });
    lucide.createIcons();
}

function addKitItem() {
    const input = document.getElementById('new-kit-item-input');
    const val = input.value.trim();
    if (val) {
        currentKitItems.push(val);
        input.value = '';
        renderKitItemsTags();
    }
}

function removeKitItem(idx) {
    currentKitItems.splice(idx, 1);
    renderKitItemsTags();
}

function renderConsumablesTags() {
    const container = document.getElementById('consumables-list');
    if (!container) return;
    container.innerHTML = '';
    if (currentConsumables.length === 0) {
        container.innerHTML = `<span class="text-xs text-slate-500">Tavsiya qilinadigan sarf materiallari kiritilmagan</span>`;
        return;
    }
    currentConsumables.forEach((item, idx) => {
        const tag = document.createElement('span');
        tag.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300";
        tag.innerHTML = `
            <i data-lucide="tag" class="w-3 h-3 text-blue-400"></i>
            <span>${item}</span>
            <button type="button" onclick="removeConsumableItem(${idx})" class="text-slate-400 hover:text-red-400 ml-1">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        container.appendChild(tag);
    });
    lucide.createIcons();
}

function addConsumableItem() {
    const input = document.getElementById('new-consumable-input');
    const val = input.value.trim();
    if (val) {
        currentConsumables.push(val);
        input.value = '';
        renderConsumablesTags();
    }
}

function removeConsumableItem(idx) {
    currentConsumables.splice(idx, 1);
    renderConsumablesTags();
}

function renderModelUnitsTable(units) {
    const tbody = document.getElementById('mp-units-table-body');
    const badge = document.getElementById('mp-units-count-badge');
    if (badge) badge.innerText = units.length;
    if (!tbody) return;
    tbody.innerHTML = '';

    if (units.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500">Hozircha ushbu model bo'yicha dona mavjud emas</td></tr>`;
        return;
    }

    const statusBadges = {
        omborda_bosh: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Omborda bo\'sh</span>',
        ijarada: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">Ijarada</span>',
        remontda: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">Remontda</span>',
        tozalanmoqda: '<span class="badge-status bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">Tozalanmoqda</span>',
        brak: '<span class="badge-status bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">Brak</span>',
        vozvrat_qilingan: '<span class="badge-status bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">Qaytarilgan</span>'
    };

    units.forEach(u => {
        const loc = DB.warehouse_locations.find(l => l.id === u.warehouse_location_id);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40";
        tr.innerHTML = `
            <td class="py-2.5 px-3 font-mono font-bold text-white flex items-center gap-1.5">
                <span>${u.serial_number}</span>
                <button type="button" onclick="copyText('${u.serial_number}')" title="Nusxalash" class="text-slate-400 hover:text-white">
                    <i data-lucide="copy" class="w-3 h-3"></i>
                </button>
            </td>
            <td class="py-2.5 px-3 font-mono text-emerald-400">${u.barcode}</td>
            <td class="py-2.5 px-3 text-slate-300">${loc ? `${loc.shelf} (${loc.bin})` : '-'}</td>
            <td class="py-2.5 px-3">${statusBadges[u.status] || u.status}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-200">${u.total_rental_count || 0} marta</td>
            <td class="py-2.5 px-3 font-semibold text-emerald-400">${(u.total_revenue || 0).toLocaleString()} so'm</td>
            <td class="py-2.5 px-3 text-right">
                <button type="button" onclick="openPrintStickerModal(${u.id})" class="px-2 py-1 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-medium">
                    Stiker
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderModelMaintenanceTable(logs) {
    const tbody = document.getElementById('mp-maintenance-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">Hech qanday texnik ta'mirlash yozuvi yo'q</td></tr>`;
        return;
    }

    const typeBadges = {
        profilaktika: '<span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold text-[10px]">Profilaktika</span>',
        moy_almashtirish: '<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold text-[10px]">Moy almashtirish</span>',
        detal_almashtirish: '<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold text-[10px]">Detal almashuvi</span>',
        tozalash: '<span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-semibold text-[10px]">Tozalash</span>'
    };

    logs.forEach(l => {
        const item = DB.product_items.find(i => i.id === l.product_item_id);
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40";
        tr.innerHTML = `
            <td class="py-2.5 px-3 text-slate-400 font-mono">${l.date}</td>
            <td class="py-2.5 px-3 font-mono font-bold text-white">${item ? item.serial_number : 'Uskuna'}</td>
            <td class="py-2.5 px-3">${typeBadges[l.maintenance_type] || l.maintenance_type}</td>
            <td class="py-2.5 px-3 text-slate-200">${l.description}</td>
            <td class="py-2.5 px-3 font-semibold text-emerald-400">${(l.cost || 0).toLocaleString()} so'm</td>
            <td class="py-2.5 px-3 text-slate-400">${l.performed_by}</td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function handleSaveProductModel(e) {
    e.preventDefault();
    const idVal = document.getElementById('mp-id').value;
    const isEditing = Boolean(idVal);

    const name = document.getElementById('mp-name').value.trim();
    const brand = document.getElementById('mp-brand').value.trim();
    const categoryId = parseInt(document.getElementById('mp-category-select').value);
    const modelCode = document.getElementById('mp-model-code').value.trim();
    const imageUrl = document.getElementById('mp-image-url').value.trim();

    const specs = {
        power: document.getElementById('mp-spec-power').value.trim(),
        impact: document.getElementById('mp-spec-impact').value.trim(),
        chuck: document.getElementById('mp-spec-chuck').value.trim(),
        weight: document.getElementById('mp-spec-weight').value.trim(),
        fuel: document.getElementById('mp-spec-fuel').value.trim(),
        extra: document.getElementById('mp-spec-extra').value.trim()
    };

    const dailyPrice = parseFloat(document.getElementById('mp-daily-price').value) || 0;
    const hourlyPrice = parseFloat(document.getElementById('mp-hourly-price').value) || 0;
    const depositAmount = parseFloat(document.getElementById('mp-deposit-amount').value) || 0;
    const discount3Days = parseFloat(document.getElementById('mp-discount-3days').value) || 0;
    const discount7Days = parseFloat(document.getElementById('mp-discount-7days').value) || 0;
    const lateFee = parseFloat(document.getElementById('mp-late-fee').value) || 0;
    const replacementCost = parseFloat(document.getElementById('mp-replacement-cost').value) || 0;

    const now = new Date().toISOString().split('T')[0];

    if (isEditing) {
        const model = DB.product_models.find(m => m.id === parseInt(idVal));
        if (!model) return;

        if (currentUser && (currentUser.role_id === 'admin' || currentUser.role === 'admin')) {
            if (model.daily_price !== dailyPrice) {
                DB.price_change_logs.unshift({
                    id: Date.now(),
                    product_model_id: model.id,
                    changed_by_user: `${currentUser.full_name} (Admin)`,
                    old_price: `${model.daily_price.toLocaleString()} so'm`,
                    new_price: `${dailyPrice.toLocaleString()} so'm`,
                    field_name: "Kunlik Ijara Narxi",
                    change_date: new Date().toLocaleString('uz-UZ')
                });
                model.daily_price = dailyPrice;
            }
            if (model.deposit_amount !== depositAmount) {
                DB.price_change_logs.unshift({
                    id: Date.now() + 1,
                    product_model_id: model.id,
                    changed_by_user: `${currentUser.full_name} (Admin)`,
                    old_price: `${model.deposit_amount.toLocaleString()} so'm`,
                    new_price: `${depositAmount.toLocaleString()} so'm`,
                    field_name: "Zalog Depozit",
                    change_date: new Date().toLocaleString('uz-UZ')
                });
                model.deposit_amount = depositAmount;
            }
            model.hourly_price = hourlyPrice;
            model.discount_3_days = discount3Days;
            model.discount_7_days = discount7Days;
            model.late_fee_per_hour = lateFee;
            model.replacement_cost = replacementCost;
        }

        model.name = name;
        model.brand = brand;
        model.category_id = categoryId;
        model.model_code = modelCode;
        model.image = imageUrl;
        model.specifications = specs;
        model.kit_items = [...currentKitItems];
        model.consumables = [...currentConsumables];
        model.updated_at = now;

        showNotification(`"${model.name}" ma'lumotlari saqlandi!`, "success");
    } else {
        const newId = DB.product_models.length > 0 ? Math.max(...DB.product_models.map(m => m.id)) + 1 : 1;
        const newModel = {
            id: newId,
            category_id: categoryId,
            name: name,
            brand: brand,
            model_code: modelCode,
            image: imageUrl,
            specifications: specs,
            hourly_price: hourlyPrice,
            daily_price: dailyPrice,
            discount_3_days: discount3Days,
            discount_7_days: discount7Days,
            late_fee_per_hour: lateFee,
            deposit_amount: depositAmount,
            replacement_cost: replacementCost,
            kit_items: [...currentKitItems],
            consumables: [...currentConsumables],
            created_at: now,
            updated_at: now
        };

        DB.product_models.push(newModel);
        showNotification(`Yangi tovar "${newModel.name}" qo'shildi!`, "success");
    }

    saveDB();
    closeModal('modal-product-card');
    renderCatalogCards();
}

function openModalPriceLogs() {
    try {
        const tbody = document.getElementById('price-logs-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const logs = DB.price_change_logs || [];
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">Narxlar o'zgarishi tarixi bo'sh</td></tr>`;
        } else {
            logs.forEach(log => {
                const model = (DB.product_models || []).find(m => m.id === log.product_model_id);
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/40";
                tr.innerHTML = `
                    <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${log.change_date}</td>
                    <td class="py-2.5 px-3 font-semibold text-white">${model ? model.name : 'Model'}</td>
                    <td class="py-2.5 px-3 text-blue-400 font-medium">${log.changed_by_user}</td>
                    <td class="py-2.5 px-3 line-through text-slate-400">${log.old_price}</td>
                    <td class="py-2.5 px-3 font-bold text-emerald-400">${log.new_price}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        openModal('modal-price-logs');
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (err) {
        console.error("openModalPriceLogs error:", err);
    }
}

function openModalAddMaintenance() {
    try {
        const select = document.getElementById('m-unit-select');
        const items = DB.product_items || [];
        if (select) {
            select.innerHTML = items.length > 0 
                ? items.map(it => {
                    const model = (DB.product_models || []).find(m => m.id === it.product_model_id);
                    return `<option value="${it.id}">SN: ${it.serial_number} — ${model ? model.name : ''}</option>`;
                }).join('')
                : '<option value="">-- Ombor asboblari mavjud emas --</option>';
        }

        const dateEl = document.getElementById('m-date');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
        const costEl = document.getElementById('m-cost');
        if (costEl) costEl.value = '45000';
        const descEl = document.getElementById('m-description');
        if (descEl) descEl.value = '';
        const perfEl = document.getElementById('m-performed-by');
        if (perfEl) perfEl.value = currentUser ? currentUser.full_name : 'Usta';

        openModal('modal-add-maintenance');
    } catch (err) {
        console.error("openModalAddMaintenance error:", err);
    }
}

function handleSaveMaintenanceLog(e) {
    e.preventDefault();
    const unitId = parseInt(document.getElementById('m-unit-select').value);
    const mType = document.getElementById('m-type-select').value;
    const mDate = document.getElementById('m-date').value;
    const cost = parseFloat(document.getElementById('m-cost').value) || 0;
    const desc = document.getElementById('m-description').value.trim();
    const perf = document.getElementById('m-performed-by').value.trim();

    const newLog = {
        id: Date.now(),
        product_item_id: unitId,
        date: mDate,
        maintenance_type: mType,
        cost: cost,
        description: desc,
        performed_by: perf
    };

    DB.maintenance_logs.unshift(newLog);
    saveDB();
    closeModal('modal-add-maintenance');

    if (currentEditingModel) {
        const mLogs = DB.maintenance_logs.filter(m => {
            const item = DB.product_items.find(it => it.id === m.product_item_id);
            return item && item.product_model_id === currentEditingModel.id;
        });
        renderModelMaintenanceTable(mLogs);
    }

    showNotification("Texnik xizmat qaydi muvaffaqiyatli saqlandi!", "success");
}

function openAddUnitForModel(modelId) {
    switchSection('section-kirim');
    switchTab('tab-placement');
    openModalAddDirectItem(modelId);
}

function openAddUnitForCurrentModel() {
    if (!currentEditingModel) return;
    closeModal('modal-product-card');
    openAddUnitForModel(currentEditingModel.id);
}

function printModelSticker() {
    if (!currentEditingModel) return;
    const items = DB.product_items.filter(i => i.product_model_id === currentEditingModel.id);
    if (items.length > 0) {
        openPrintStickerModal(items[0].id);
    } else {
        alert("Ushbu modelga tegishli hech bo'lmaganda 1 dona uskuna kiritilgan bo'lishi kerak!");
    }
}
