// =========================================================================
// SECTION 3: STAFF & ROLES, SUPPLIERS LEDGER (AKT-SVERKA), CUSTOMERS CRM 360
// =========================================================================

// -------------------------------------------------------------
// 1. STAFF & ROLE PERMISSIONS MATRIX
// -------------------------------------------------------------
function renderStaffTable() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const roleBadges = {
        admin: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20 font-bold"> Bosh Admin</span>',
        manager: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20"> Menejer</span>',
        cashier: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"> Kassir</span>',
        warehouseman: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20"> Skladchi</span>'
    };

    DB.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-white flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs">
                    ${user.full_name.charAt(0)}
                </div>
                <div>
                    <div>${user.full_name}</div>
                    <div class="text-[10px] text-slate-400">@${user.username}</div>
                </div>
            </td>
            <td class="py-3 px-4 text-slate-300 font-mono text-xs">${user.phone || '-'}</td>
            <td class="py-3 px-4">${roleBadges[user.role_id] || user.role_id}</td>
            <td class="py-3 px-4 text-slate-400 text-xs font-mono">${user.last_login || '-'}</td>
            <td class="py-3 px-4">
                ${user.is_active 
                    ? '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">Faol</span>'
                    : '<span class="badge-status bg-slate-700 text-slate-400 text-[10px]">Bloklangan</span>'}
            </td>
            <td class="py-3 px-4 text-right">
                <button onclick="toggleUserStatus(${user.id})" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-medium transition">
                    ${user.is_active ? 'Bloklash' : 'Faollashtirish'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPermissionsMatrix();
    lucide.createIcons();
}

function toggleUserStatus(userId) {
    const user = DB.users.find(u => u.id === userId);
    if (!user) return;
    if (user.role_id === 'admin') {
        alert("Bosh Admin hisobini bloklash mumkin emas!");
        return;
    }
    user.is_active = !user.is_active;
    saveDB();
    renderStaffTable();
    showNotification(`Xodim holati yangilandi (${user.is_active ? 'Faol' : 'Bloklandi'})`, "success");
}

function openModalAddStaff() {
    document.getElementById('staff-fullname').value = '';
    document.getElementById('staff-phone').value = '+998 ';
    document.getElementById('staff-username').value = '';
    document.getElementById('staff-password').value = '';
    
    const roleSelect = document.getElementById('staff-role-select');
    roleSelect.innerHTML = DB.roles.map(r => `<option value="${r.id}">${r.name} - ${r.description}</option>`).join('');

    openModal('modal-add-staff');
}

function handleSaveStaff(e) {
    e.preventDefault();
    const fullName = document.getElementById('staff-fullname').value.trim();
    const phone = document.getElementById('staff-phone').value.trim();
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const roleId = document.getElementById('staff-role-select').value;

    const exists = DB.users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
        alert("Bu foydalanuvchi nomi band! Boshqa login tanlang.");
        return;
    }

    const newUser = {
        id: Date.now(),
        full_name: fullName,
        phone: phone,
        username: username,
        password: password,
        role_id: roleId,
        is_active: true,
        last_login: "Hali kirmagan"
    };

    DB.users.push(newUser);
    saveDB();
    closeModal('modal-add-staff');
    renderStaffTable();
    showNotification(`Yangi xodim ${fullName} qo'shildi!`, "success");
}

function renderPermissionsMatrix() {
    const container = document.getElementById('permissions-matrix-container');
    if (!container) return;
    container.innerHTML = '';

    const roles = DB.roles;
    const permissions = DB.permissions;

    let tableHtml = `
        <table class="w-full text-left text-xs">
            <thead class="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                    <th class="py-2.5 px-3">Tizim Huquqi</th>
                    ${roles.map(r => `<th class="py-2.5 px-3 text-center">${r.name}</th>`).join('')}
                </tr>
            </thead>
            <tbody class="divide-y divide-slate-800 text-slate-300">
    `;

    permissions.forEach(p => {
        tableHtml += `
            <tr class="hover:bg-slate-800/40">
                <td class="py-2.5 px-3 font-medium text-white">${p.title}</td>
                ${roles.map(r => {
                    const isChecked = (DB.role_permissions[r.id] || []).includes(p.code);
                    const isAdmin = r.id === 'admin';
                    return `
                        <td class="py-2.5 px-3 text-center">
                            <input type="checkbox" ${isChecked ? 'checked' : ''} ${isAdmin ? 'disabled' : ''} 
                                onchange="togglePermission('${r.id}', '${p.code}', this.checked)"
                                class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500">
                        </td>
                    `;
                }).join('')}
            </tr>
        `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

function togglePermission(roleId, permCode, checked) {
    if (!DB.role_permissions[roleId]) DB.role_permissions[roleId] = [];
    if (checked) {
        if (!DB.role_permissions[roleId].includes(permCode)) {
            DB.role_permissions[roleId].push(permCode);
        }
    } else {
        DB.role_permissions[roleId] = DB.role_permissions[roleId].filter(c => c !== permCode);
    }
    saveDB();
    showNotification("Rollar huquqlari yangilandi!", "success");
}


// -------------------------------------------------------------
// 2. SUPPLIERS ACCOUNTING & AKT-SVERKA
// -------------------------------------------------------------
let selectedSupplierForDetail = null;

function renderSuppliersLedger() {
    const tbody = document.getElementById('suppliers-ledger-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    DB.suppliers.forEach(s => {
        const isDebt = s.balance < 0;
        const isPositive = s.balance > 0;
        
        let balanceBadge = '';
        if (isDebt) {
            balanceBadge = `<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20 font-bold">Qarzdormiz: ${Math.abs(s.balance).toLocaleString()} so'm</span>`;
        } else if (isPositive) {
            balanceBadge = `<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Haqdormiz: ${s.balance.toLocaleString()} so'm</span>`;
        } else {
            balanceBadge = `<span class="badge-status bg-slate-800 text-slate-300">Hisob-kitob 0</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-white">${s.company_name}</td>
            <td class="py-3 px-4 text-slate-300">${s.contact_person}</td>
            <td class="py-3 px-4 font-mono text-slate-400 text-xs">${s.phone}</td>
            <td class="py-3 px-4 text-slate-400 text-xs truncate max-w-xs">${s.address}</td>
            <td class="py-3 px-4">${balanceBadge}</td>
            <td class="py-3 px-4 text-right flex items-center justify-end gap-2">
                <button onclick="openSupplierDetailModal(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold transition">
                    Akt-sverka & Moliya
                </button>
                <button onclick="openModalSupplierPayout(${s.id})" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition">
                    Pul To'lash
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    lucide.createIcons();
}

function openSupplierDetailModal(supplierId) {
    const supplier = DB.suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    selectedSupplierForDetail = supplier;

    document.getElementById('sd-company-name').innerText = supplier.company_name;
    document.getElementById('sd-contact').innerText = `${supplier.contact_person} (${supplier.phone})`;
    document.getElementById('sd-address').innerText = supplier.address;
    document.getElementById('sd-bank').innerText = supplier.bank_details || 'Bank rekvizitlari kiritilmagan';

    // Transactions of this supplier
    const txs = DB.supplier_transactions.filter(t => t.supplier_id === supplier.id);
    let totalInbound = 0;
    let totalPaid = 0;

    txs.forEach(t => {
        if (t.type === 'kirim_tovarlar') totalInbound += t.amount;
        if (t.type === 'tolov_chiqim') totalPaid += t.amount;
    });

    document.getElementById('sd-total-inbound').innerText = `${totalInbound.toLocaleString()} so'm`;
    document.getElementById('sd-total-paid').innerText = `${totalPaid.toLocaleString()} so'm`;
    
    const balanceEl = document.getElementById('sd-current-balance');
    balanceEl.innerText = `${supplier.balance.toLocaleString()} so'm`;
    balanceEl.className = supplier.balance < 0 ? "text-xl font-bold text-red-400" : "text-xl font-bold text-emerald-400";

    const tbody = document.getElementById('sd-transactions-tbody');
    tbody.innerHTML = '';

    if (txs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">Hech qanday operatsiya topilmadi</td></tr>`;
    } else {
        const typeLabels = {
            kirim_tovarlar: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20">Kirim Tovar</span>',
            tolov_chiqim: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">To\'lov (Chiqim)</span>',
            vozvrat: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20">Vozvrat</span>'
        };

        txs.forEach(t => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-800/40";
            tr.innerHTML = `
                <td class="py-2.5 px-3 text-slate-400 font-mono text-[11px]">${t.date}</td>
                <td class="py-2.5 px-3">${typeLabels[t.type] || t.type}</td>
                <td class="py-2.5 px-3 font-mono font-bold ${t.type === 'tolov_chiqim' ? 'text-emerald-400' : 'text-slate-200'}">
                    ${t.amount.toLocaleString()} so'm
                </td>
                <td class="py-2.5 px-3 text-slate-400 uppercase text-[10px]">${t.payment_method}</td>
                <td class="py-2.5 px-3 text-slate-300 text-xs">${t.comment}</td>
                <td class="py-2.5 px-3 text-slate-400 text-xs">${t.created_by}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    openModal('modal-supplier-detail');
    lucide.createIcons();
}

function openModalSupplierPayout(supplierId) {
    const s = DB.suppliers.find(sup => sup.id === supplierId);
    if (!s) return;

    document.getElementById('payout-supplier-id').value = s.id;
    document.getElementById('payout-supplier-name').innerText = s.company_name;
    document.getElementById('payout-current-balance').innerText = `${s.balance.toLocaleString()} so'm`;
    document.getElementById('payout-amount').value = Math.abs(s.balance);
    document.getElementById('payout-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('payout-comment').value = "Navbatdagi qarz to'lovi";

    openModal('modal-supplier-payout');
}

function handleSaveSupplierPayout(e) {
    e.preventDefault();
    const supId = parseInt(document.getElementById('payout-supplier-id').value);
    const amount = parseFloat(document.getElementById('payout-amount').value) || 0;
    const method = document.getElementById('payout-method').value;
    const pDate = document.getElementById('payout-date').value;
    const comment = document.getElementById('payout-comment').value.trim();

    const supplier = DB.suppliers.find(s => s.id === supId);
    if (!supplier) return;

    // Supplier balance decreases debt (debt is negative, paying makes it more positive)
    supplier.balance += amount;

    const newTx = {
        id: Date.now(),
        supplier_id: supplier.id,
        type: "tolov_chiqim",
        amount: amount,
        payment_method: method,
        receipt_id: `TO'L-${Math.floor(1000 + Math.random() * 9000)}`,
        comment: comment,
        date: pDate,
        created_by: currentUser ? currentUser.full_name : "Kassir"
    };

    DB.supplier_transactions.unshift(newTx);
    saveDB();
    closeModal('modal-supplier-payout');
    renderSuppliersLedger();
    if (selectedSupplierForDetail && selectedSupplierForDetail.id === supplier.id) {
        openSupplierDetailModal(supplier.id);
    }
    showNotification(`Yetkazib beruvchiga ${amount.toLocaleString()} so'm to'lov qayd etildi!`, "success");
}

function printAktSverka() {
    if (!selectedSupplierForDetail) return;
    window.print();
}


// -------------------------------------------------------------
// 3. CUSTOMERS CRM 360°
// -------------------------------------------------------------
let selectedCustomerForDetail = null;

function renderCustomersCRM() {
    const grid = document.getElementById('customers-cards-grid');
    if (!grid) return;

    const search = (document.getElementById('filter-crm-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filter-crm-status')?.value || '';

    grid.innerHTML = '';

    const filtered = DB.customers.filter(c => {
        const name = (c.full_name || '').toLowerCase();
        const company = (c.company_name || '').toLowerCase();
        const phone = (c.phone_primary || '').toLowerCase();
        const passport = (c.passport_series_number || '').toLowerCase();

        const matchSearch = name.includes(search) || company.includes(search) || phone.includes(search) || passport.includes(search);
        let matchStatus = true;
        if (statusFilter === 'vip') matchStatus = c.status === 'vip';
        if (statusFilter === 'debt') matchStatus = c.current_debt > 0;
        if (statusFilter === 'blacklist') matchStatus = c.status === 'qora_royxat';

        return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center text-slate-500">Hech qanday mijoz topilmadi</div>`;
        return;
    }

    filtered.forEach(c => {
        const isBlacklist = c.status === 'qora_royxat';
        const isVip = c.status === 'vip';

        const card = document.createElement('div');
        card.className = `rounded-2xl border p-4 transition duration-200 flex flex-col justify-between ${
            isBlacklist 
            ? 'border-red-500/50 bg-red-950/20 shadow-lg shadow-red-950/30' 
            : isVip 
            ? 'border-amber-500/40 bg-amber-950/10 shadow-lg shadow-amber-950/20' 
            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
        }`;

        card.innerHTML = `
            <div>
                <div class="flex items-start justify-between gap-2 mb-3">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isBlacklist ? 'bg-red-500/20 text-red-400' : isVip ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                        }">
                            ${c.full_name.charAt(0)}
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-white leading-tight">${c.full_name}</h3>
                            ${c.company_name ? `<p class="text-[11px] text-blue-400 font-semibold">${c.company_name}</p>` : ''}
                            <p class="text-[11px] text-slate-400 font-mono">${c.phone_primary}</p>
                        </div>
                    </div>
                    <div>
                        ${isBlacklist ? '<span class="badge-status bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] animate-pulse"> Qora Ro\'yxat</span>' : ''}
                        ${isVip ? '<span class="badge-status bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]"> VIP</span>' : ''}
                        ${c.status === 'oddiy' ? '<span class="badge-status bg-slate-800 text-slate-300 text-[10px]">Oddiy</span>' : ''}
                    </div>
                </div>

                <!-- Financial status -->
                <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 mb-3 space-y-1">
                    <div class="flex justify-between text-xs">
                        <span class="text-slate-400">Joriy qarz:</span>
                        <span class="font-bold ${c.current_debt > 0 ? 'text-red-400' : 'text-slate-300'}">${c.current_debt.toLocaleString()} so'm</span>
                    </div>
                    <div class="flex justify-between text-xs">
                        <span class="text-slate-400">Bizdagi zalog:</span>
                        <span class="font-bold text-emerald-400">${c.current_deposit.toLocaleString()} so'm</span>
                    </div>
                </div>

                ${isBlacklist ? `
                    <div class="p-2 rounded-lg bg-red-900/30 border border-red-500/30 text-[11px] text-red-300 mb-3">
                        <b>Sabab:</b> ${c.blacklist_reason}
                    </div>
                ` : ''}
            </div>

            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span class="text-[10px] text-slate-500">${c.passport_series_number}</span>
                <button onclick="openCustomerDetailModal(${c.id})" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition flex items-center gap-1">
                    <i data-lucide="user-check" class="w-3.5 h-3.5 text-blue-400"></i>
                    <span>360° Kartochka</span>
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    lucide.createIcons();
}

function openCustomerDetailModal(customerId) {
    const c = DB.customers.find(cust => cust.id === customerId);
    if (!c) return;
    selectedCustomerForDetail = c;

    document.getElementById('cd-name').innerText = c.full_name;
    document.getElementById('cd-phone').innerText = c.phone_primary + (c.phone_secondary ? ` / ${c.phone_secondary}` : '');
    document.getElementById('cd-passport').innerText = c.passport_series_number;
    document.getElementById('cd-notes').innerText = c.notes || 'Izoh yo\'q';
    document.getElementById('cd-debt').innerText = `${c.current_debt.toLocaleString()} so'm`;
    document.getElementById('cd-deposit').innerText = `${c.current_deposit.toLocaleString()} so'm`;

    const blBanner = document.getElementById('cd-blacklist-banner');
    const blReason = document.getElementById('cd-blacklist-reason');
    if (c.status === 'qora_royxat') {
        blBanner.classList.remove('hidden');
        blReason.innerText = c.blacklist_reason;
    } else {
        blBanner.classList.add('hidden');
    }

    // Orders history
    const orders = DB.customer_orders.filter(o => o.customer_id === c.id);
    const ordersTbody = document.getElementById('cd-orders-tbody');
    ordersTbody.innerHTML = '';
    if (orders.length === 0) {
        ordersTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">Buyurtmalar tarixi mavjud emas</td></tr>`;
    } else {
        orders.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-2 px-3 font-mono text-white">${o.id}</td>
                <td class="py-2 px-3"><span class="badge-status bg-blue-500/10 text-blue-400 text-[10px]">${o.service_type}</span></td>
                <td class="py-2 px-3 text-slate-300 text-xs">${o.details}</td>
                <td class="py-2 px-3 font-semibold text-emerald-400 text-xs">${o.total_sum.toLocaleString()} so'm</td>
                <td class="py-2 px-3 font-mono text-slate-400 text-[11px]">${o.date}</td>
            `;
            ordersTbody.appendChild(tr);
        });
    }

    // Financial history
    const fin = DB.customer_transactions.filter(t => t.customer_id === c.id);
    const finTbody = document.getElementById('cd-fin-tbody');
    finTbody.innerHTML = '';
    if (fin.length === 0) {
        finTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">Moliya tarixi mavjud emas</td></tr>`;
    } else {
        fin.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-2 px-3 font-mono text-slate-400 text-[11px]">${t.date}</td>
                <td class="py-2 px-3 text-xs font-semibold text-slate-200">${t.type}</td>
                <td class="py-2 px-3 font-mono font-bold text-emerald-400 text-xs">${t.amount.toLocaleString()} so'm</td>
                <td class="py-2 px-3 text-slate-400 text-[10px] uppercase">${t.payment_method}</td>
                <td class="py-2 px-3 text-slate-400 text-xs">${t.created_by}</td>
            `;
            finTbody.appendChild(tr);
        });
    }

    openModal('modal-customer-detail');
    lucide.createIcons();
}

function toggleCustomerVip() {
    if (!selectedCustomerForDetail) return;
    selectedCustomerForDetail.status = selectedCustomerForDetail.status === 'vip' ? 'oddiy' : 'vip';
    saveDB();
    renderCustomersCRM();
    openCustomerDetailModal(selectedCustomerForDetail.id);
    showNotification(`Mijoz statusi o'zgartirildi: ${selectedCustomerForDetail.status.toUpperCase()}`, "success");
}

function promptBlacklistCustomer() {
    if (!selectedCustomerForDetail) return;
    if (selectedCustomerForDetail.status === 'qora_royxat') {
        if (confirm("Ushbu mijozni Qora ro'yxatdan chiqarmoqchimisiz?")) {
            selectedCustomerForDetail.status = 'oddiy';
            selectedCustomerForDetail.blacklist_reason = '';
            saveDB();
            renderCustomersCRM();
            openCustomerDetailModal(selectedCustomerForDetail.id);
            showNotification("Mijoz Qora ro'yxatdan chiqarildi!", "success");
        }
    } else {
        const reason = prompt("Qora ro'yxatga kiritish sababini yozing:");
        if (reason) {
            selectedCustomerForDetail.status = 'qora_royxat';
            selectedCustomerForDetail.blacklist_reason = reason;
            saveDB();
            renderCustomersCRM();
            openCustomerDetailModal(selectedCustomerForDetail.id);
            showNotification("Mijoz Qora ro'yxatga kiritildi!", "warning");
        }
    }
}

function openModalAddCustomer() {
    document.getElementById('crm-fullname').value = '';
    document.getElementById('crm-company').value = '';
    document.getElementById('crm-phone1').value = '+998 ';
    document.getElementById('crm-phone2').value = '';
    document.getElementById('crm-passport').value = '';
    document.getElementById('crm-notes').value = '';

    openModal('modal-add-customer');
}

function handleSaveCustomer(e) {
    e.preventDefault();
    const fullName = document.getElementById('crm-fullname').value.trim();
    const company = document.getElementById('crm-company').value.trim();
    const phone1 = document.getElementById('crm-phone1').value.trim();
    const phone2 = document.getElementById('crm-phone2').value.trim();
    const passport = document.getElementById('crm-passport').value.trim();
    const notes = document.getElementById('crm-notes').value.trim();
    const type = document.getElementById('crm-type').value;

    const newCust = {
        id: Date.now(),
        customer_type: type,
        full_name: fullName,
        company_name: company,
        phone_primary: phone1,
        phone_secondary: phone2,
        passport_series_number: passport,
        passport_scan_url: "",
        current_debt: 0,
        current_deposit: 0,
        status: "oddiy",
        blacklist_reason: "",
        notes: notes,
        created_at: new Date().toISOString().split('T')[0]
    };

    DB.customers.unshift(newCust);
    saveDB();
    closeModal('modal-add-customer');
    renderCustomersCRM();
    showNotification(`Yangi mijoz ${fullName} CRM bazasiga qo'shildi!`, "success");
}
