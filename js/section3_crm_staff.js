// =========================================================================
// SECTION 3: STAFF & ROLES, SUPPLIERS LEDGER (AKT-SVERKA), CUSTOMERS CRM 360
// =========================================================================

// -------------------------------------------------------------
// 1. STAFF & ROLE PERMISSIONS MATRIX
// -------------------------------------------------------------
// Selected staff user for profile card
let selectedStaffUserForCard = null;

function renderStaffTable() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const roleBadges = {
        admin: '<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20 font-bold">👑 Bosh Admin</span>',
        manager: '<span class="badge-status bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">👔 Menejer</span>',
        cashier: '<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">💳 Kassir</span>',
        warehouseman: '<span class="badge-status bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">📦 Skladchi</span>'
    };

    (DB.users || []).forEach(user => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-semibold text-white flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center font-bold text-xs">
                    ${(user.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                    <div>${user.full_name || 'Xodim'}</div>
                    <div class="text-[10px] text-slate-400">@${user.username || 'user'}</div>
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
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openStaffProfileModal(${user.id})" class="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white text-[11px] font-semibold transition flex items-center gap-1" title="Xodim Shaxsiy Kartochkasi & KPI">
                        <i data-lucide="user" class="w-3 h-3"></i>
                        <span>Profil</span>
                    </button>
                    <button onclick="openModalEditStaff(${user.id})" class="px-2.5 py-1 rounded-lg bg-amber-600/20 border border-amber-500/30 text-amber-400 hover:bg-amber-600 hover:text-white text-[11px] font-semibold transition flex items-center gap-1" title="Tahrirlash">
                        <i data-lucide="edit-3" class="w-3 h-3"></i>
                        <span>Tahrirlash</span>
                    </button>
                    <button onclick="toggleUserStatus(${user.id})" class="px-2.5 py-1 rounded-lg ${user.is_active ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white' : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white'} text-[11px] font-semibold transition" title="${user.is_active ? 'Bloklash' : 'Faollashtirish'}">
                        ${user.is_active ? 'Bloklash' : 'Faollashtirish'}
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPermissionsMatrix();
    if (window.lucide) lucide.createIcons();
}

function toggleUserStatus(userId) {
    const user = (DB.users || []).find(u => u.id === userId);
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
    try {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('staff-fullname', '');
        setVal('staff-phone', '+998 ');
        setVal('staff-username', '');
        setVal('staff-password', '');
        
        const roleSelect = document.getElementById('staff-role-select');
        if (roleSelect) {
            roleSelect.innerHTML = (DB.roles || []).map(r => `<option value="${r.id}">${r.name} - ${r.description}</option>`).join('');
        }

        openModal('modal-add-staff');
    } catch (err) {
        console.error("openModalAddStaff error:", err);
    }
}

function handleSaveStaff(e) {
    e.preventDefault();
    const fullName = document.getElementById('staff-fullname').value.trim();
    const phone = document.getElementById('staff-phone').value.trim();
    const username = document.getElementById('staff-username').value.trim();
    const password = document.getElementById('staff-password').value.trim();
    const roleId = document.getElementById('staff-role-select').value;

    const exists = (DB.users || []).some(u => u.username.toLowerCase() === username.toLowerCase());
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

    DB.users = DB.users || [];
    DB.users.push(newUser);
    saveDB();
    closeModal('modal-add-staff');
    renderStaffTable();
    showNotification(`Yangi xodim ${fullName} qo'shildi!`, "success");
}

// -------------------------------------------------------------
// EDIT STAFF MODAL (FIO, Phone, Username, Password, Role)
// -------------------------------------------------------------
function openModalEditStaff(userId) {
    try {
        const user = (DB.users || []).find(u => u.id === userId);
        if (!user) return;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('staff-edit-id', user.id);
        setVal('staff-edit-fullname', user.full_name || '');
        setVal('staff-edit-phone', user.phone || '+998 ');
        setVal('staff-edit-username', user.username || '');
        setVal('staff-edit-password', '');
        
        const roleSelect = document.getElementById('staff-edit-role-select');
        if (roleSelect) {
            roleSelect.value = user.role_id || 'manager';
        }

        openModal('modal-edit-staff');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("openModalEditStaff error:", err);
    }
}

function handleSaveEditStaff(e) {
    if (e && e.preventDefault) e.preventDefault();
    const userId = parseInt(document.getElementById('staff-edit-id')?.value);
    const user = (DB.users || []).find(u => u.id === userId);
    if (!user) return;

    const fullName = document.getElementById('staff-edit-fullname')?.value.trim();
    const phone = document.getElementById('staff-edit-phone')?.value.trim();
    const username = document.getElementById('staff-edit-username')?.value.trim();
    const password = document.getElementById('staff-edit-password')?.value.trim();
    const roleId = document.getElementById('staff-edit-role-select')?.value;

    // Check duplicate username if changed
    if (username && username.toLowerCase() !== (user.username || '').toLowerCase()) {
        const exists = (DB.users || []).some(u => u.id !== userId && u.username.toLowerCase() === username.toLowerCase());
        if (exists) {
            alert("Bu foydalanuvchi nomi band! Boshqa login tanlang.");
            return;
        }
        user.username = username;
    }

    if (fullName) user.full_name = fullName;
    if (phone) user.phone = phone;
    if (roleId) user.role_id = roleId;
    if (password) user.password = password;

    saveDB();
    closeModal('modal-edit-staff');
    renderStaffTable();
    if (selectedStaffUserForCard && selectedStaffUserForCard.id === userId) {
        openStaffProfileModal(userId);
    }
    showNotification(`Xodim ${user.full_name} ma'lumotlari yangilandi!`, "success");
}

// -------------------------------------------------------------
// COMPREHENSIVE STAFF PROFILE CARD MODAL
// -------------------------------------------------------------
function openStaffProfileModal(userId) {
    try {
        const user = (DB.users || []).find(u => u.id === userId);
        if (!user) return;
        selectedStaffUserForCard = user;

        const roleNames = {
            admin: "Bosh Admin",
            manager: "Menejer (Sotuvchi)",
            cashier: "Kassir",
            warehouseman: "Skladchi (WMS)"
        };

        // 1. Header & Personal Info
        const avatarEl = document.getElementById('staff-card-avatar');
        if (avatarEl) avatarEl.innerText = (user.full_name || 'U').charAt(0).toUpperCase();

        const nameEl = document.getElementById('staff-card-fullname');
        if (nameEl) nameEl.innerText = user.full_name || 'Xodim';

        const subEl = document.getElementById('staff-card-subtitle');
        if (subEl) subEl.innerText = `@${user.username || 'user'} | ${roleNames[user.role_id] || user.role_id}`;

        const phoneEl = document.getElementById('staff-card-phone');
        if (phoneEl) phoneEl.innerText = user.phone || 'Kiritilmagan';

        const userEl = document.getElementById('staff-card-username');
        if (userEl) userEl.innerText = `@${user.username || 'user'}`;

        const statusBadge = document.getElementById('staff-card-status-badge');
        if (statusBadge) {
            statusBadge.className = user.is_active 
                ? "badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]"
                : "badge-status bg-slate-700 text-slate-400 text-[10px]";
            statusBadge.innerText = user.is_active ? "Faol" : "Bloklangan";
        }

        const roleSelect = document.getElementById('staff-card-role-select');
        if (roleSelect) roleSelect.value = user.role_id || 'manager';

        const pwdInput = document.getElementById('staff-card-new-password');
        if (pwdInput) pwdInput.value = '';

        // 2. Staff KPI Calculations
        const allOrders = DB.orders || [];
        const userOrders = allOrders.filter(o => 
            o.created_by_user_id === user.id || 
            (o.notes && o.notes.includes(user.full_name)) || 
            (o.created_by && o.created_by === user.full_name)
        );

        const totalOrdersCount = userOrders.length;
        const totalSalesSum = userOrders.reduce((sum, o) => sum + (o.total_rent_amount || o.final_amount || o.paid_amount || 0), 0);
        const activeRentalsCount = userOrders.filter(o => o.status === 'faol_ijarada' || o.status === 'faol' || o.status === 'ijarada').length;

        const kpiOrdersEl = document.getElementById('staff-card-kpi-total-orders');
        if (kpiOrdersEl) kpiOrdersEl.innerText = `${totalOrdersCount} ta`;

        const kpiSalesEl = document.getElementById('staff-card-kpi-total-sales');
        if (kpiSalesEl) kpiSalesEl.innerText = `${totalSalesSum.toLocaleString()} so'm`;

        const kpiRentalsEl = document.getElementById('staff-card-kpi-active-rentals');
        if (kpiRentalsEl) kpiRentalsEl.innerText = `${activeRentalsCount} ta`;

        // 3. Orders History Table
        const tbody = document.getElementById('staff-card-orders-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            if (userOrders.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-500">Ushbu xodim tomonidan hali buyurtmalar ochilmagan (0 ta)</td></tr>`;
            } else {
                userOrders.forEach(o => {
                    const cust = (DB.customers || []).find(c => c.id === o.customer_id);
                    const custName = cust ? cust.full_name : (o.customer_name || 'Mijoz');
                    
                    // Tool details
                    const toolItems = (DB.order_tool_items || []).filter(t => t.order_id === o.id);
                    let toolDetails = o.service_details || 'Ijara buyurtmasi';
                    if (toolItems.length > 0) {
                        toolDetails = toolItems.map(t => t.model_name).join(', ');
                    }

                    const sum = (o.total_rent_amount || o.final_amount || 0).toLocaleString();
                    const date = o.start_date || o.created_at || '-';
                    
                    const statusColors = {
                        faol_ijarada: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                        faol: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                        kechikkan: "bg-red-500/10 text-red-400 border border-red-500/20 font-bold animate-pulse",
                        qaytarildi: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        yopildi: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                        yangi: "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    };

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-800/40 transition cursor-pointer";
                    tr.innerHTML = `
                        <td class="py-2.5 px-3 font-mono font-bold text-white">${o.order_number || `#${o.id}`}</td>
                        <td class="py-2.5 px-3 font-medium text-slate-200">${custName}</td>
                        <td class="py-2.5 px-3 text-slate-300 truncate max-w-xs">${toolDetails}</td>
                        <td class="py-2.5 px-3 font-mono font-bold text-emerald-400">${sum} so'm</td>
                        <td class="py-2.5 px-3 font-mono text-slate-400 text-[11px]">${date}</td>
                        <td class="py-2.5 px-3"><span class="badge-status ${statusColors[o.status] || 'bg-slate-800 text-slate-300'} text-[10px]">${(o.status || 'yangi').toUpperCase()}</span></td>
                        <td class="py-2.5 px-3 text-right">
                            <button onclick="openOrderDetailModal(${o.id})" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition" title="Batafsil ko'rish">
                                👁 Ko'rish
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        openModal('modal-staff-profile');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("openStaffProfileModal error:", err);
    }
}

function saveStaffRoleFromCard() {
    if (!selectedStaffUserForCard) return;
    const newRole = document.getElementById('staff-card-role-select')?.value;
    if (!newRole) return;

    selectedStaffUserForCard.role_id = newRole;
    saveDB();
    renderStaffTable();
    openStaffProfileModal(selectedStaffUserForCard.id);
    showNotification(`Xodim roli muvaffaqiyatli saqlandi: ${newRole.toUpperCase()}`, "success");
}

function updateStaffPasswordFromCard() {
    if (!selectedStaffUserForCard) return;
    const newPassword = document.getElementById('staff-card-new-password')?.value.trim();
    if (!newPassword) {
        alert("Iltimos, yangi parol kiriting!");
        return;
    }

    selectedStaffUserForCard.password = newPassword;
    saveDB();
    document.getElementById('staff-card-new-password').value = '';
    showNotification(`Xodim ${selectedStaffUserForCard.full_name} paroli yangilandi!`, "success");
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
// -------------------------------------------------------------
// 2. SUPPLIERS ACCOUNTING & AKT-SVERKA
// -------------------------------------------------------------
let selectedSupplierForDetail = null;

function renderSuppliersLedger() {
    const tbody = document.getElementById('suppliers-ledger-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const suppliers = DB.suppliers || [];

    if (suppliers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">Hozircha birorta ham yetkazib beruvchi mavjud emas. Yuqoridagi "+ Yangi Yetkazib Beruvchi" tugmasi orqali qo'shing.</td></tr>`;
        return;
    }

    suppliers.forEach(s => {
        const isDebt = (s.balance || 0) < 0;
        const isPositive = (s.balance || 0) > 0;
        
        let balanceBadge = '';
        if (isDebt) {
            balanceBadge = `<span class="badge-status bg-red-500/10 text-red-400 border border-red-500/20 font-bold">Biz qarzdormiz: ${Math.abs(s.balance).toLocaleString()} so'm</span>`;
        } else if (isPositive) {
            balanceBadge = `<span class="badge-status bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">Haqdormiz: ${(s.balance || 0).toLocaleString()} so'm</span>`;
        } else {
            balanceBadge = `<span class="badge-status bg-slate-800 text-slate-300">Hisob-kitob 0</span>`;
        }

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-800/40 transition";
        tr.innerHTML = `
            <td class="py-3 px-4 font-bold text-white flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    ${(s.company_name || 'T').charAt(0).toUpperCase()}
                </div>
                <span>${s.company_name}</span>
            </td>
            <td class="py-3 px-4 text-slate-300">${s.contact_person || '-'}</td>
            <td class="py-3 px-4 font-mono text-slate-400 text-xs">${s.phone || '-'}</td>
            <td class="py-3 px-4 text-slate-400 text-xs truncate max-w-xs">${s.address || '-'}</td>
            <td class="py-3 px-4">${balanceBadge}</td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                    <button onclick="openSupplierDetailModal(${s.id})" class="px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold transition flex items-center gap-1" title="Akt-sverka & Kartochka">
                        <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                        <span>Kartochka</span>
                    </button>
                    <button onclick="openModalSupplierPayout(${s.id})" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1" title="Pul To'lash">
                        <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                        <span>Pul To'lash</span>
                    </button>
                    <button onclick="openModalEditSupplier(${s.id})" class="p-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" title="Tahrirlash">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-400"></i>
                    </button>
                    <button onclick="deleteSupplier(${s.id})" class="p-1 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white transition" title="O'chirish">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) lucide.createIcons();
}

// -------------------------------------------------------------
// ADD & EDIT SUPPLIER MODALS
// -------------------------------------------------------------
function openModalAddSupplier() {
    try {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('supplier-add-name', '');
        setVal('supplier-add-contact', '');
        setVal('supplier-add-phone', '+998 ');
        setVal('supplier-add-address', '');
        setVal('supplier-add-bank', '');
        setVal('supplier-add-balance', '0');

        openModal('modal-add-supplier');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("openModalAddSupplier error:", err);
    }
}

function handleSaveSupplier(e) {
    if (e && e.preventDefault) e.preventDefault();
    const name = document.getElementById('supplier-add-name')?.value.trim();
    const contact = document.getElementById('supplier-add-contact')?.value.trim();
    const phone = document.getElementById('supplier-add-phone')?.value.trim();
    const address = document.getElementById('supplier-add-address')?.value.trim();
    const bank = document.getElementById('supplier-add-bank')?.value.trim();
    const balance = parseFloat(document.getElementById('supplier-add-balance')?.value) || 0;

    if (!name) {
        alert("Iltimos, yetkazib beruvchi nomini kiriting!");
        return;
    }

    const newSupplier = {
        id: Date.now(),
        company_name: name,
        contact_person: contact || name,
        phone: phone || '+998 ',
        address: address || 'Toshkent shahri',
        bank_details: bank || '',
        balance: balance,
        created_at: new Date().toISOString().split('T')[0]
    };

    if (!DB.suppliers) DB.suppliers = [];
    DB.suppliers.unshift(newSupplier);

    // If starting balance was entered, record an opening balance transaction
    if (balance !== 0) {
        if (!DB.supplier_transactions) DB.supplier_transactions = [];
        DB.supplier_transactions.unshift({
            id: Date.now() + 1,
            supplier_id: newSupplier.id,
            type: balance < 0 ? "kirim_tovarlar" : "tolov_chiqim",
            amount: Math.abs(balance),
            payment_method: "boshlangich_qoldiq",
            receipt_id: `SALDO-${Math.floor(1000 + Math.random() * 9000)}`,
            comment: "Boshlang'ich qoldiq saldo",
            date: new Date().toISOString().split('T')[0],
            created_by: currentUser ? currentUser.full_name : "Admin"
        });
    }

    saveDB();
    closeModal('modal-add-supplier');
    renderSuppliersLedger();
    showNotification(`Yangi yetkazib beruvchi "${name}" muvaffaqiyatli qo'shildi!`, "success");
}

function openModalEditSupplier(supplierId) {
    try {
        const s = (DB.suppliers || []).find(sup => sup.id === supplierId);
        if (!s) return;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('supplier-edit-id', s.id);
        setVal('supplier-edit-name', s.company_name || '');
        setVal('supplier-edit-contact', s.contact_person || '');
        setVal('supplier-edit-phone', s.phone || '+998 ');
        setVal('supplier-edit-address', s.address || '');
        setVal('supplier-edit-bank', s.bank_details || '');
        setVal('supplier-edit-balance', s.balance || 0);

        openModal('modal-edit-supplier');
        if (window.lucide) lucide.createIcons();
    } catch (err) {
        console.error("openModalEditSupplier error:", err);
    }
}

function handleSaveEditSupplier(e) {
    if (e && e.preventDefault) e.preventDefault();
    const supId = parseInt(document.getElementById('supplier-edit-id')?.value);
    const s = (DB.suppliers || []).find(sup => sup.id === supId);
    if (!s) return;

    const name = document.getElementById('supplier-edit-name')?.value.trim();
    const contact = document.getElementById('supplier-edit-contact')?.value.trim();
    const phone = document.getElementById('supplier-edit-phone')?.value.trim();
    const address = document.getElementById('supplier-edit-address')?.value.trim();
    const bank = document.getElementById('supplier-edit-bank')?.value.trim();
    const balance = parseFloat(document.getElementById('supplier-edit-balance')?.value) || 0;

    if (name) s.company_name = name;
    if (contact) s.contact_person = contact;
    if (phone) s.phone = phone;
    if (address) s.address = address;
    if (bank !== undefined) s.bank_details = bank;
    s.balance = balance;

    saveDB();
    closeModal('modal-edit-supplier');
    renderSuppliersLedger();
    if (selectedSupplierForDetail && selectedSupplierForDetail.id === s.id) {
        openSupplierDetailModal(s.id);
    }
    showNotification(`Yetkazib beruvchi "${s.company_name}" ma'lumotlari yangilandi!`, "success");
}

function deleteSupplier(supplierId) {
    const s = (DB.suppliers || []).find(sup => sup.id === supplierId);
    if (!s) return;

    if (confirm(`Haqiqatan ham "${s.company_name}" yetkazib beruvchisini bazadan o'chirmoqchimisiz?`)) {
        DB.suppliers = (DB.suppliers || []).filter(sup => sup.id !== supplierId);
        saveDB();
        renderSuppliersLedger();
        showNotification(`Yetkazib beruvchi "${s.company_name}" o'chirildi!`, "warning");
    }
}

// -------------------------------------------------------------
// SUPPLIER PROFILE & AKT-SVERKA MODAL
// -------------------------------------------------------------
function openSupplierDetailModal(supplierId) {
    const supplier = (DB.suppliers || []).find(s => s.id === supplierId);
    if (!supplier) return;
    selectedSupplierForDetail = supplier;

    const nameEl = document.getElementById('sd-company-name');
    if (nameEl) nameEl.innerText = supplier.company_name;

    const contactEl = document.getElementById('sd-contact');
    if (contactEl) contactEl.innerText = `${supplier.contact_person} (${supplier.phone})`;

    const addrEl = document.getElementById('sd-address');
    if (addrEl) addrEl.innerText = supplier.address || 'Kiritilmagan';

    const bankEl = document.getElementById('sd-bank');
    if (bankEl) bankEl.innerText = supplier.bank_details || 'Bank rekvizitlari kiritilmagan';

    // Transactions of this supplier
    const txs = (DB.supplier_transactions || []).filter(t => t.supplier_id === supplier.id);
    let totalInbound = 0;
    let totalPaid = 0;

    txs.forEach(t => {
        if (t.type === 'kirim_tovarlar') totalInbound += (t.amount || 0);
        if (t.type === 'tolov_chiqim') totalPaid += (t.amount || 0);
    });

    // Also factor in supplier_orders
    const orders = (DB.supplier_orders || []).filter(o => o.supplier_id === supplier.id || o.supplier_name === supplier.company_name);
    orders.forEach(o => {
        if (!txs.some(t => t.receipt_id === o.id || (t.comment && t.comment.includes(o.id)))) {
            totalInbound += (o.total_amount || 0);
        }
    });

    const inboundEl = document.getElementById('sd-total-inbound');
    if (inboundEl) inboundEl.innerText = `${totalInbound.toLocaleString()} so'm`;

    const paidEl = document.getElementById('sd-total-paid');
    if (paidEl) paidEl.innerText = `${totalPaid.toLocaleString()} so'm`;
    
    const balanceEl = document.getElementById('sd-current-balance');
    if (balanceEl) {
        const bal = supplier.balance || 0;
        if (bal < 0) {
            balanceEl.innerText = `Biz qarzdormiz: ${Math.abs(bal).toLocaleString()} so'm`;
            balanceEl.className = "text-lg font-bold text-red-400 mt-1";
        } else if (bal > 0) {
            balanceEl.innerText = `Haqdormiz: ${bal.toLocaleString()} so'm`;
            balanceEl.className = "text-lg font-bold text-emerald-400 mt-1";
        } else {
            balanceEl.innerText = `0 so'm (Hisob-kitob yopilgan)`;
            balanceEl.className = "text-lg font-bold text-slate-300 mt-1";
        }
    }

    // 1. Render Inbound Orders (Xaridlar)
    const ordersTbody = document.getElementById('sd-orders-tbody');
    if (ordersTbody) {
        ordersTbody.innerHTML = '';
        if (orders.length === 0) {
            ordersTbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">Ushbu ta'minotchidan hali xaridlar (PO) qabul qilinmagan</td></tr>`;
        } else {
            orders.forEach(o => {
                const tr = document.createElement('tr');
                const itemsStr = (o.items || []).map(i => `${i.model_name} (${i.quantity} dona)`).join(', ') || 'Tovarlar';
                const statusBadge = o.status === 'yakunlandi' 
                    ? '<span class="badge-status bg-emerald-500/10 text-emerald-400 text-[10px]">Qabul qilingan</span>'
                    : '<span class="badge-status bg-blue-500/10 text-blue-400 text-[10px]">Kutilmoqda</span>';
                
                tr.innerHTML = `
                    <td class="py-2.5 px-3 font-mono font-bold text-white">${o.id}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-400 text-[11px]">${o.order_date || '-'}</td>
                    <td class="py-2.5 px-3 text-slate-200">${itemsStr}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-white">${(o.total_amount || 0).toLocaleString()} so'm</td>
                    <td class="py-2.5 px-3">${statusBadge}</td>
                `;
                ordersTbody.appendChild(tr);
            });
        }
    }

    // 2. Render Transactions (Akt-sverka)
    const tbody = document.getElementById('sd-transactions-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        if (txs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-500">Hech qanday to'lov yoki kirim tranzaksiyasi topilmadi</td></tr>`;
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
                        ${(t.amount || 0).toLocaleString()} so'm
                    </td>
                    <td class="py-2.5 px-3 text-slate-400 uppercase text-[10px]">${t.payment_method || '-'}</td>
                    <td class="py-2.5 px-3 text-slate-300 text-xs">${t.comment || '-'}</td>
                    <td class="py-2.5 px-3 text-slate-400 text-xs">${t.created_by || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    openModal('modal-supplier-detail');
    if (window.lucide) lucide.createIcons();
}

function openModalSupplierPayoutFromDetail() {
    if (!selectedSupplierForDetail) return;
    openModalSupplierPayout(selectedSupplierForDetail.id);
}

function openModalSupplierPayout(supplierId) {
    try {
        const s = (DB.suppliers || []).find(sup => sup.id === supplierId);
        if (!s) return;

        const idEl = document.getElementById('payout-supplier-id');
        if (idEl) idEl.value = s.id;
        const nameEl = document.getElementById('payout-supplier-name');
        if (nameEl) nameEl.innerText = s.company_name || '';
        const balEl = document.getElementById('payout-current-balance');
        if (balEl) balEl.innerText = `${(s.balance || 0).toLocaleString()} so'm`;
        const amtEl = document.getElementById('payout-amount');
        if (amtEl) amtEl.value = s.balance < 0 ? Math.abs(s.balance) : '';
        const dateEl = document.getElementById('payout-date');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
        const comEl = document.getElementById('payout-comment');
        if (comEl) comEl.value = "Yetkazib beruvchiga qarz to'lovi";

        openModal('modal-supplier-payout');
    } catch (err) {
        console.error("openModalSupplierPayout error:", err);
    }
}

function handleSaveSupplierPayout(e) {
    if (e && e.preventDefault) e.preventDefault();
    const supId = parseInt(document.getElementById('payout-supplier-id')?.value);
    const amount = parseFloat(document.getElementById('payout-amount')?.value) || 0;
    const method = document.getElementById('payout-method')?.value || 'naqd';
    const pDate = document.getElementById('payout-date')?.value || new Date().toISOString().split('T')[0];
    const comment = document.getElementById('payout-comment')?.value.trim() || "Yetkazib beruvchiga to'lov";

    const supplier = (DB.suppliers || []).find(s => s.id === supId);
    if (!supplier) return;
    if (amount <= 0) {
        alert("To'lov summasi 0 dan katta bo'lishi kerak!");
        return;
    }

    // 1. Supplier balance decreases debt (negative balance becomes more positive)
    supplier.balance = (supplier.balance || 0) + amount;

    // 2. Deduct from cash register
    let reg = (DB.cash_registers || []).find(r => r.code === method) || (DB.cash_registers || [])[0];
    if (reg) {
        reg.current_balance = (reg.current_balance || 0) - amount;
    }

    // 3. Record in financial transactions & expenses
    if (!DB.financial_transactions) DB.financial_transactions = [];
    DB.financial_transactions.unshift({
        id: Date.now(),
        type: 'chiqim',
        category: 'yetkazib_beruvchi_tolov',
        amount: amount,
        payment_method: method,
        cash_register_id: reg ? reg.id : 1,
        description: `Ta'minotchi: ${supplier.company_name} ga to'lov (${comment})`,
        date: pDate,
        created_by: currentUser ? currentUser.full_name : "Kassir"
    });

    // 4. Record in supplier transactions
    if (!DB.supplier_transactions) DB.supplier_transactions = [];
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
    showNotification(`Yetkazib beruvchi ${supplier.company_name}ga ${amount.toLocaleString()} so'm to'lov qayd etildi! Kassa balansi yangilandi.`, "success");
}

function printSupplierAktSverka() {
    if (!selectedSupplierForDetail) return;
    const s = selectedSupplierForDetail;
    const txs = (DB.supplier_transactions || []).filter(t => t.supplier_id === s.id);
    const today = new Date().toLocaleDateString('uz-UZ');

    let rowsHtml = txs.map((t, idx) => `
        <tr>
            <td style="border:1px solid #333; padding:6px; text-align:center;">${idx + 1}</td>
            <td style="border:1px solid #333; padding:6px; text-align:center;">${t.date}</td>
            <td style="border:1px solid #333; padding:6px;">${t.type === 'kirim_tovarlar' ? 'Tovar kirimi' : 'Pul to\'lovi (Chiqim)'} - ${t.comment || ''}</td>
            <td style="border:1px solid #333; padding:6px; text-align:right;">${t.type === 'kirim_tovarlar' ? t.amount.toLocaleString() + " so'm" : '-'}</td>
            <td style="border:1px solid #333; padding:6px; text-align:right;">${t.type === 'tolov_chiqim' ? t.amount.toLocaleString() + " so'm" : '-'}</td>
        </tr>
    `).join('');

    const printWin = window.open('', '_blank', 'width=800,height=900');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Akt-sverka: ${s.company_name}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; line-height: 1.4; }
                h2, h3 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
                th { border: 1px solid #333; background: #f0f0f0; padding: 6px; font-weight: bold; }
                .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
                .sig-box { width: 45%; border-top: 1px solid #333; padding-top: 8px; text-align: center; }
            </style>
        </head>
        <body>
            <h2>SOLISHTIRMA DALOLATNOMA (AKT-SVERKA)</h2>
            <h3>WMS Arenda ERP & "${s.company_name}"</h3>
            <p style="text-align:center; color:#555;">Sana: ${today}</p>
            
            <p><b>Ta'minotchi:</b> ${s.company_name} | <b>Mas'ul:</b> ${s.contact_person} (${s.phone})<br>
            <b>Manzil:</b> ${s.address || '-'}</p>

            <table>
                <thead>
                    <tr>
                        <th>№</th>
                        <th>Sana</th>
                        <th>Operatsiya mazmuni</th>
                        <th>Olingan tovarlar (Debet)</th>
                        <th>To'langan pullar (Kredit)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding:10px;">Tranzaksiyalar mavjud emas</td></tr>'}
                </tbody>
            </table>

            <div style="margin-top:20px; font-size:13px;">
                <b>Yakuniy Saldo Balans:</b> 
                <span style="font-weight:bold; color:${s.balance < 0 ? '#d00' : '#080'};">
                    ${s.balance < 0 ? "Bizning qarzdorligimiz: " + Math.abs(s.balance).toLocaleString() + " so'm" : "Ortiqcha to'langan haq: " + s.balance.toLocaleString() + " so'm"}
                </span>
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <b>"WMS Arenda" MCHJ</b><br><br><br>
                    Rahbar / Bosh buxgalter: ________________
                </div>
                <div class="sig-box">
                    <b>"${s.company_name}"</b><br><br><br>
                    Mas'ul shaxs: ________________
                </div>
            </div>
            <script>
                window.onload = function() { window.print(); };
            <\/script>
        </body>
        </html>
    `);
    printWin.document.close();
}

function printAktSverka() {
    printSupplierAktSverka();
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
    try {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        setVal('crm-fullname', '');
        setVal('crm-company', '');
        setVal('crm-phone1', '+998 ');
        setVal('crm-phone2', '');
        setVal('crm-passport', '');
        setVal('crm-notes', '');

        openModal('modal-add-customer');
    } catch (err) {
        console.error("openModalAddCustomer error:", err);
    }
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
