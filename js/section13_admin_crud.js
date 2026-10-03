// =========================================================================
// SECTION 13: ADMIN CRUD — TAHRIRLASH (EDIT) VA O'CHIRISH (DELETE)
// Buyurtmalar, Kirim (PO), Asboblar katalogi, Hamkorlar va Xizmat buyurtmalari
// =========================================================================

function isAdminUser() {
    try {
        if (typeof currentUser === 'undefined' || !currentUser) return false;
        const role = String(currentUser.role_id || currentUser.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin' || currentUser.username === 'admin';
    } catch (e) {
        return false;
    }
}
window.isAdminUser = isAdminUser;

function requireAdmin() {
    if (!isAdminUser()) {
        showNotification("Bu amal faqat Admin uchun ruxsat etilgan!", "error");
        return false;
    }
    return true;
}

function refreshAllViews() {
    const fns = [
        'renderOrdersTable', 'renderOrdersSection', 'renderPOTable', 'renderAllTabs',
        'renderInventoryTable', 'renderCatalogCards', 'renderPartnersDirectory',
        'renderServiceOrdersTable', 'renderPartnerFinanceSummary', 'renderCashRegistersDashboard',
        'populateAvailablePosTools', 'renderDashboard'
    ];
    fns.forEach(name => {
        try {
            if (typeof window[name] === 'function') window[name]();
        } catch (e) {
            console.warn(`[AdminCRUD] ${name} refresh error:`, e);
        }
    });
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (e) {}
}

// Reusable small action buttons (rendered inside tables/cards)
function adminActionButtonsHtml(editCall, deleteCall) {
    if (!isAdminUser()) return '';
    return `
        <button onclick="${editCall}" class="p-1.5 rounded-lg border border-amber-700/60 bg-amber-950/40 hover:bg-amber-600 text-amber-400 hover:text-white transition" title="✏️ Tahrirlash">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
        </button>
        <button onclick="${deleteCall}" class="p-1.5 rounded-lg border border-red-800/60 bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white transition" title="🗑️ O'chirish">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
    `;
}
window.adminActionButtonsHtml = adminActionButtonsHtml;

// -------------------------------------------------------------------------
// GENERIC DYNAMIC EDIT MODAL
// fields: [{ name, label, type: 'text'|'number'|'date'|'datetime-local'|'select'|'textarea', value, options:[{value,label}] }]
// -------------------------------------------------------------------------
let _adminEditOnSave = null;

function ensureAdminEditModal() {
    let modal = document.getElementById('modal-admin-edit');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'modal-admin-edit';
    modal.className = 'fixed inset-0 z-[60] hidden items-center justify-center bg-black/70 backdrop-blur-sm p-4';
    modal.innerHTML = `
        <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <h3 id="admin-edit-title" class="text-sm font-bold text-white flex items-center gap-2">
                    <i data-lucide="pencil" class="w-4 h-4 text-amber-400"></i> <span>Tahrirlash</span>
                </h3>
                <button type="button" onclick="closeModal('modal-admin-edit')" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <form id="admin-edit-form" class="p-5 space-y-3">
                <div id="admin-edit-fields" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
                <div id="admin-edit-note" class="text-[11px] text-slate-400"></div>
                <div class="flex justify-end gap-2 pt-3 border-t border-slate-800">
                    <button type="button" onclick="closeModal('modal-admin-edit')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200">Bekor qilish</button>
                    <button type="submit" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5">
                        <i data-lucide="save" class="w-3.5 h-3.5"></i> Saqlash
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#admin-edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const values = {};
        modal.querySelectorAll('[data-admin-field]').forEach(el => {
            const name = el.getAttribute('data-admin-field');
            const type = el.getAttribute('data-admin-type');
            values[name] = type === 'number' ? (parseFloat(el.value) || 0) : el.value;
        });
        try {
            if (typeof _adminEditOnSave === 'function') {
                const ok = _adminEditOnSave(values);
                if (ok === false) return;
            }
            closeModal('modal-admin-edit');
        } catch (err) {
            console.error('[AdminCRUD] save error:', err);
            showNotification("Saqlashda xatolik: " + err.message, "error");
        }
    });
    return modal;
}

function escapeAttr(v) {
    return String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function openAdminEditModal(title, fields, onSave, note = '') {
    const modal = ensureAdminEditModal();
    modal.querySelector('#admin-edit-title span').textContent = title;
    modal.querySelector('#admin-edit-note').innerHTML = note;
    const container = modal.querySelector('#admin-edit-fields');
    const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none';

    container.innerHTML = fields.map(f => {
        const full = f.full ? 'sm:col-span-2' : '';
        let input = '';
        if (f.type === 'select') {
            input = `<select data-admin-field="${f.name}" data-admin-type="text" class="${inputCls}">
                ${(f.options || []).map(o => `<option value="${escapeAttr(o.value)}" ${String(o.value) === String(f.value) ? 'selected' : ''}>${escapeAttr(o.label)}</option>`).join('')}
            </select>`;
        } else if (f.type === 'textarea') {
            input = `<textarea data-admin-field="${f.name}" data-admin-type="text" rows="2" class="${inputCls}">${escapeAttr(f.value)}</textarea>`;
        } else {
            input = `<input type="${f.type || 'text'}" data-admin-field="${f.name}" data-admin-type="${f.type === 'number' ? 'number' : 'text'}" value="${escapeAttr(f.value)}" ${f.type === 'number' ? 'step="any" min="0"' : ''} class="${inputCls}">`;
        }
        return `<label class="block ${full}">
            <span class="block text-[11px] font-semibold text-slate-400 mb-1">${f.label}</span>
            ${input}
        </label>`;
    }).join('');

    _adminEditOnSave = onSave;
    openModal('modal-admin-edit');
}
window.openAdminEditModal = openAdminEditModal;

function toDateTimeLocal(v) {
    if (!v) return '';
    const s = String(v).replace(' ', 'T');
    return s.length >= 16 ? s.substring(0, 16) : s;
}

function customerOptions() {
    return (DB.customers || []).map(c => ({ value: c.id, label: `${c.full_name} (${c.phone_primary || ''})` }));
}

// =========================================================================
// 1. IJARA BUYURTMALARI (5-BO'LIM — DB.orders)
// =========================================================================
function editRentalOrder(orderId) {
    if (!requireAdmin()) return;
    try {
        const order = (DB.orders || []).find(o => o.id === orderId);
        if (!order) return showNotification("Buyurtma topilmadi!", "error");

        const tools = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
        const services = (DB.order_service_items || []).filter(s => s.order_id === order.id);

        const fields = [
            { name: 'customer_id', label: 'Mijoz', type: 'select', value: order.customer_id, options: customerOptions(), full: true },
            { name: 'start_date', label: 'Boshlanish sanasi', type: 'datetime-local', value: toDateTimeLocal(order.start_date) },
            { name: 'expected_return_date', label: 'Qaytarish muddati', type: 'datetime-local', value: toDateTimeLocal(order.expected_return_date) },
            { name: 'final_amount', label: "Umumiy summa (so'm)", type: 'number', value: order.final_amount || order.total_rent_amount || 0 },
            { name: 'paid_amount', label: "To'langan summa (so'm)", type: 'number', value: order.paid_amount || 0 },
            { name: 'total_deposit_amount', label: "Zalog (so'm)", type: 'number', value: order.total_deposit_amount || 0 },
            {
                name: 'status', label: 'Holati', type: 'select', value: order.status, options: [
                    { value: 'yangi', label: 'Yangi' },
                    { value: 'faol_ijarada', label: 'Faol ijarada' },
                    { value: 'kechikkan', label: 'Kechikkan' },
                    { value: 'yakunlangan', label: 'Yakunlangan' },
                    { value: 'bekor_qilingan', label: 'Bekor qilingan' }
                ]
            }
        ];

        tools.forEach(t => {
            fields.push({ name: `tool_days_${t.id}`, label: `🔧 ${t.model_name || 'Asbob'} (${t.serial_number || ''}) — kun`, type: 'number', value: t.rent_days || 1 });
            fields.push({ name: `tool_price_${t.id}`, label: `🔧 ${t.model_name || 'Asbob'} — kunlik narx`, type: 'number', value: t.daily_price || 0 });
        });
        services.forEach(s => {
            fields.push({ name: `srv_details_${s.id}`, label: `🛠 ${String(s.service_category || '').toUpperCase()} — tafsilot / manzil`, type: 'text', value: s.service_details || '' });
            fields.push({ name: `srv_price_${s.id}`, label: `🛠 ${String(s.service_category || '').toUpperCase()} — mijoz narxi`, type: 'number', value: s.customer_price || 0 });
        });
        fields.push({ name: 'notes', label: 'Izoh', type: 'textarea', value: order.notes || '', full: true });

        openAdminEditModal(`Buyurtmani tahrirlash — #${order.order_number}`, fields, (v) => {
            const oldPaid = order.paid_amount || 0;
            const oldDebt = order.remaining_debt || 0;
            const oldCustomerId = order.customer_id;
            const oldDeposit = order.total_deposit_amount || 0;

            // Tool & service line updates
            let recalculated = 0;
            tools.forEach(t => {
                t.rent_days = v[`tool_days_${t.id}`] || t.rent_days;
                t.daily_price = v[`tool_price_${t.id}`];
                t.total_tool_rent = (t.rent_days || 0) * (t.daily_price || 0);
                recalculated += t.total_tool_rent;
            });
            services.forEach(s => {
                s.service_details = v[`srv_details_${s.id}`];
                s.customer_price = v[`srv_price_${s.id}`];
                s.profit_margin = (s.customer_price || 0) - (s.partner_cost || 0);
                recalculated += s.customer_price || 0;
                const so = (DB.service_orders || []).find(x => x.order_number === `SRV-${order.order_number}` && x.service_category === s.service_category);
                if (so) {
                    so.details = s.service_details;
                    so.destination_address = s.service_details;
                    so.customer_total_price = s.customer_price;
                    so.net_profit = s.profit_margin;
                }
            });

            const lineTotalChanged = (tools.length + services.length) > 0 && recalculated !== (order.total_rent_amount || 0);
            const newFinal = lineTotalChanged && v.final_amount === (order.final_amount || order.total_rent_amount || 0)
                ? recalculated
                : v.final_amount;

            order.customer_id = parseInt(v.customer_id) || order.customer_id;
            order.start_date = v.start_date ? v.start_date.replace('T', ' ') : order.start_date;
            order.expected_return_date = v.expected_return_date ? v.expected_return_date.replace('T', ' ') : order.expected_return_date;
            order.total_rent_amount = newFinal;
            order.final_amount = newFinal;
            order.paid_amount = v.paid_amount;
            order.total_deposit_amount = v.total_deposit_amount;
            order.remaining_debt = Math.max(0, newFinal - v.paid_amount);
            order.status = v.status;
            order.notes = v.notes;
            order.updated_at = new Date().toLocaleString('uz-UZ');

            // Customer debt / deposit rebalancing
            const oldCust = (DB.customers || []).find(c => c.id === oldCustomerId);
            const newCust = (DB.customers || []).find(c => c.id === order.customer_id);
            if (oldCust) {
                oldCust.current_debt = Math.max(0, (oldCust.current_debt || 0) - oldDebt);
                oldCust.current_deposit = Math.max(0, (oldCust.current_deposit || 0) - oldDeposit);
            }
            if (newCust) {
                newCust.current_debt = (newCust.current_debt || 0) + order.remaining_debt;
                newCust.current_deposit = (newCust.current_deposit || 0) + order.total_deposit_amount;
            }

            // Deposit safe correction
            const depDiff = order.total_deposit_amount - oldDeposit;
            if (depDiff !== 0) {
                if (!DB.deposit_safe) DB.deposit_safe = { id: 1, total_holding_deposit: 0 };
                DB.deposit_safe.total_holding_deposit = Math.max(0, (DB.deposit_safe.total_holding_deposit || 0) + depDiff);
            }

            // Cash register correction for paid amount difference
            const paidDiff = order.paid_amount - oldPaid;
            if (paidDiff !== 0) {
                const reg = (DB.cash_registers || [])[0];
                if (reg) reg.current_balance = (reg.current_balance || 0) + paidDiff;
                if (!DB.financial_transactions) DB.financial_transactions = [];
                DB.financial_transactions.unshift({
                    id: Date.now(),
                    type: paidDiff > 0 ? 'ijara_tushumi' : 'tuzatish_chiqim',
                    cash_register_id: reg ? reg.id : 1,
                    amount: paidDiff,
                    order_id: order.order_number,
                    description: `Admin tuzatishi: #${order.order_number} to'lov summasi o'zgartirildi (${oldPaid.toLocaleString()} → ${order.paid_amount.toLocaleString()})`,
                    date: `${new Date().toISOString().substring(0, 10)} ${new Date().toTimeString().substring(0, 5)}`,
                    performed_by_user_id: currentUser ? currentUser.id : 1
                });
            }

            // If order closed/cancelled -> free tools back to warehouse
            if (order.status === 'yakunlangan' || order.status === 'bekor_qilingan') {
                tools.forEach(t => {
                    const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
                    if (unit && unit.status === 'ijarada') unit.status = 'omborda_bosh';
                    t.return_status = 'qaytarildi';
                });
            }

            saveDB();
            refreshAllViews();
            showNotification(`Buyurtma #${order.order_number} muvaffaqiyatli tahrirlandi ✅`, "success");
        }, `<i>Eslatma:</i> Asbob kunlari yoki narxi o'zgarsa, umumiy summa avtomatik qayta hisoblanadi (agar summani qo'lda o'zgartirmagan bo'lsangiz).`);
    } catch (err) {
        console.error('[AdminCRUD] editRentalOrder error:', err);
    }
}
window.editRentalOrder = editRentalOrder;

function deleteRentalOrder(orderId) {
    if (!requireAdmin()) return;
    try {
        const order = (DB.orders || []).find(o => o.id === orderId);
        if (!order) return showNotification("Buyurtma topilmadi!", "error");
        if (!confirm(`Haqiqatan ham bu buyurtmani o'chirmoqchimisiz?\n\n#${order.order_number}\n\nIjaradagi asboblar omborga (bo'sh) qaytariladi va kassa tushumi bekor qilinadi.`)) return;

        // 1. Free rented tools back to warehouse
        const toolItems = (DB.order_tool_items || []).filter(t => t.order_id === order.id);
        let freed = 0;
        toolItems.forEach(t => {
            const unit = (DB.product_items || []).find(u => u.id === t.product_item_id);
            if (unit && unit.status === 'ijarada') {
                unit.status = 'omborda_bosh';
                unit.total_rental_count = Math.max(0, (unit.total_rental_count || 1) - 1);
                unit.total_revenue = Math.max(0, (unit.total_revenue || 0) - (t.total_tool_rent || 0));
                if (t.original_location_id) unit.warehouse_location_id = t.original_location_id;
                freed++;
            }
        });

        // 2. Reverse cash register income (ijara haqi) — rent payments only
        const payments = (DB.order_payments || []).filter(p => p.order_id === order.id);
        let reversedCash = 0;
        payments.forEach(p => {
            if (p.payment_type === 'ijara_haqi' || p.payment_type === 'qarz_tolovi') {
                const reg = (DB.cash_registers || []).find(r => r.code === p.payment_method) || (DB.cash_registers || [])[0];
                if (reg) reg.current_balance = (reg.current_balance || 0) - (p.amount || 0);
                reversedCash += p.amount || 0;
            }
        });

        // 3. Reverse deposit holding (only if not already refunded)
        const customer = (DB.customers || []).find(c => c.id === order.customer_id);
        const depositHeld = order.status !== 'yakunlangan' ? (order.total_deposit_amount || 0) : 0;
        if (depositHeld > 0) {
            if (DB.deposit_safe) DB.deposit_safe.total_holding_deposit = Math.max(0, (DB.deposit_safe.total_holding_deposit || 0) - depositHeld);
            if (customer) customer.current_deposit = Math.max(0, (customer.current_deposit || 0) - depositHeld);
        }

        // 4. Reverse customer debt
        if (customer && order.remaining_debt) {
            customer.current_debt = Math.max(0, (customer.current_debt || 0) - order.remaining_debt);
        }

        // 5. Remove linked records
        DB.order_tool_items = (DB.order_tool_items || []).filter(t => t.order_id !== order.id);
        DB.order_service_items = (DB.order_service_items || []).filter(s => s.order_id !== order.id);
        DB.order_payments = (DB.order_payments || []).filter(p => p.order_id !== order.id);
        DB.service_orders = (DB.service_orders || []).filter(s => s.order_number !== `SRV-${order.order_number}`);
        DB.financial_transactions = (DB.financial_transactions || []).filter(f => f.order_id !== order.order_number);
        DB.customer_orders = (DB.customer_orders || []).filter(c => c.id !== order.order_number);
        DB.orders = (DB.orders || []).filter(o => o.id !== order.id);

        saveDB();
        refreshAllViews();
        showNotification(`🗑️ #${order.order_number} o'chirildi. ${freed} ta asbob omborga qaytdi, ${reversedCash.toLocaleString()} so'm kassadan bekor qilindi.`, "success");
    } catch (err) {
        console.error('[AdminCRUD] deleteRentalOrder error:', err);
        showNotification("O'chirishda xatolik: " + err.message, "error");
    }
}
window.deleteRentalOrder = deleteRentalOrder;

// =========================================================================
// 2. KIRIM ZANJIRI — XARID BUYURTMALARI (1-BO'LIM — DB.supplier_orders)
// =========================================================================
function editSupplierOrder(poId) {
    if (!requireAdmin()) return;
    try {
        const po = (DB.supplier_orders || []).find(o => o.id === poId);
        if (!po) return showNotification("Xarid buyurtmasi topilmadi!", "error");

        const modelOptions = (DB.product_models || []).map(m => ({ value: m.id, label: `${m.name} (${m.brand || ''})` }));
        const fields = [
            { name: 'supplier_id', label: 'Yetkazib beruvchi', type: 'select', value: po.supplier_id, options: (DB.suppliers || []).map(s => ({ value: s.id, label: s.company_name })), full: true },
            { name: 'order_date', label: 'Buyurtma sanasi', type: 'date', value: po.order_date },
            {
                name: 'status', label: 'Holati', type: 'select', value: po.status, options: [
                    { value: 'yangi', label: 'Yangi' },
                    { value: 'tasdiqlangan', label: 'Tasdiqlangan' },
                    { value: 'yetkazilmoqda', label: 'Yetkazilmoqda' },
                    { value: 'yakunlandi', label: 'Yakunlandi' },
                    { value: 'bekor', label: 'Bekor qilingan' }
                ]
            }
        ];
        (po.items || []).forEach((it, idx) => {
            fields.push({ name: `model_${idx}`, label: `📦 ${idx + 1}-tovar nomi`, type: 'select', value: it.product_model_id, options: modelOptions, full: true });
            fields.push({ name: `qty_${idx}`, label: `${idx + 1}-tovar soni (dona)`, type: 'number', value: it.quantity || 1 });
            fields.push({ name: `price_${idx}`, label: `${idx + 1}-tovar narxi (so'm)`, type: 'number', value: it.expected_price || 0 });
        });

        openAdminEditModal(`Xarid buyurtmasini tahrirlash — ${po.id}`, fields, (v) => {
            po.supplier_id = parseInt(v.supplier_id) || po.supplier_id;
            po.order_date = v.order_date || po.order_date;
            po.status = v.status;
            let total = 0;
            (po.items || []).forEach((it, idx) => {
                it.product_model_id = parseInt(v[`model_${idx}`]) || it.product_model_id;
                it.quantity = Math.max(1, Math.round(v[`qty_${idx}`] || 1));
                it.expected_price = v[`price_${idx}`] || 0;
                total += it.quantity * it.expected_price;
            });
            po.total_amount = total;
            saveDB();
            refreshAllViews();
            showNotification(`Xarid buyurtmasi ${po.id} yangilandi ✅`, "success");
        });
    } catch (err) {
        console.error('[AdminCRUD] editSupplierOrder error:', err);
    }
}
window.editSupplierOrder = editSupplierOrder;

function deleteSupplierOrder(poId) {
    if (!requireAdmin()) return;
    const po = (DB.supplier_orders || []).find(o => o.id === poId);
    if (!po) return showNotification("Xarid buyurtmasi topilmadi!", "error");
    if (!confirm(`Haqiqatan ham ${po.id} xarid buyurtmasini o'chirmoqchimisiz?\n\nBu amal qaytarib bo'lmaydi.`)) return;
    DB.supplier_orders = (DB.supplier_orders || []).filter(o => o.id !== poId);
    DB.inbound_receipts = (DB.inbound_receipts || []).filter(r => r.supplier_order_id !== poId && r.po_id !== poId);
    saveDB();
    refreshAllViews();
    showNotification(`🗑️ Xarid buyurtmasi ${po.id} o'chirildi`, "success");
}
window.deleteSupplierOrder = deleteSupplierOrder;

// =========================================================================
// 3. ASBOBLAR KATALOGI (2-BO'LIM — DB.product_models)
// =========================================================================
function editProductModel(modelId) {
    if (!requireAdmin()) return;
    if (typeof openProductCardModal === 'function') {
        openProductCardModal(modelId);
        return;
    }
    const m = (DB.product_models || []).find(x => x.id === modelId);
    if (!m) return;
    openAdminEditModal(`Asbobni tahrirlash — ${m.name}`, [
        { name: 'name', label: 'Nomi', value: m.name, full: true },
        { name: 'brand', label: 'Brend', value: m.brand },
        { name: 'model_code', label: 'Artikul', value: m.model_code },
        { name: 'daily_price', label: "Kunlik narx", type: 'number', value: m.daily_price },
        { name: 'deposit_amount', label: "Zalog", type: 'number', value: m.deposit_amount }
    ], (v) => {
        Object.assign(m, v);
        saveDB();
        refreshAllViews();
        showNotification("Asbob yangilandi ✅", "success");
    });
}
window.editProductModel = editProductModel;

function deleteProductModel(modelId) {
    if (!requireAdmin()) return;
    const m = (DB.product_models || []).find(x => x.id === modelId);
    if (!m) return;
    const units = (DB.product_items || []).filter(i => i.product_model_id === modelId);
    const rented = units.filter(i => i.status === 'ijarada').length;
    if (rented > 0) {
        alert(`"${m.name}" modelidan ${rented} ta dona hozir IJARADA. Avval ularni qaytarib oling (Priyomka), keyin o'chiring.`);
        return;
    }
    if (!confirm(`Haqiqatan ham "${m.name}" asbobini katalogdan o'chirmoqchimisiz?\n\nUnga tegishli ${units.length} ta dona (seriya raqami) ham ombordan o'chiriladi.`)) return;
    DB.product_models = (DB.product_models || []).filter(x => x.id !== modelId);
    DB.product_items = (DB.product_items || []).filter(i => i.product_model_id !== modelId);
    saveDB();
    refreshAllViews();
    showNotification(`🗑️ "${m.name}" katalogdan o'chirildi`, "success");
}
window.deleteProductModel = deleteProductModel;

// =========================================================================
// 4. HAMKORLAR (4-BO'LIM — DB.service_partners)
// =========================================================================
function editPartner(partnerId) {
    if (!requireAdmin()) return;
    const p = (DB.service_partners || []).find(x => x.id === partnerId);
    if (!p) return showNotification("Hamkor topilmadi!", "error");
    openAdminEditModal(`Hamkorni tahrirlash — ${p.company_name}`, [
        { name: 'company_name', label: 'Kompaniya nomi', value: p.company_name, full: true },
        { name: 'contact_person', label: "Mas'ul shaxs", value: p.contact_person },
        {
            name: 'service_category', label: 'Xizmat turi', type: 'select', value: p.service_category, options: [
                { value: 'kran', label: 'Avtokran' },
                { value: 'musor_olib_ketish', label: 'Musor olib ketish' },
                { value: 'gruzchik', label: 'Gruzchik' }
            ]
        },
        { name: 'phone_primary', label: 'Asosiy telefon', value: p.phone_primary },
        { name: 'phone_secondary', label: "Qo'shimcha telefon", value: p.phone_secondary || '' },
        { name: 'address', label: 'Manzil', value: p.address || '', full: true },
        { name: 'rating', label: 'Reyting (1-5)', type: 'number', value: p.rating || 5 }
    ], (v) => {
        const phoneChanged = (v.phone_primary || '').replace(/\D/g, '') !== (p.phone_primary || '').replace(/\D/g, '');
        Object.assign(p, v);
        if (phoneChanged) p.telegram_chat_id = null; // re-link required for new number
        saveDB();
        refreshAllViews();
        showNotification(`Hamkor "${p.company_name}" yangilandi ✅`, "success");
    });
}
window.editPartner = editPartner;

function deletePartner(partnerId) {
    if (!requireAdmin()) return;
    const p = (DB.service_partners || []).find(x => x.id === partnerId);
    if (!p) return;
    const active = (DB.service_orders || []).filter(o => o.assigned_partner_id === partnerId &&
        !['bajarildi', 'bekor_qilindi', 'rad_etildi'].includes(o.order_status)).length;
    const warn = active > 0 ? `\n\n⚠️ Diqqat: unga biriktirilgan ${active} ta faol buyurtma bor! Ular "Biriktirilmagan" bo'lib qoladi.` : '';
    if (!confirm(`Haqiqatan ham "${p.company_name}" hamkorini o'chirmoqchimisiz?${warn}`)) return;
    DB.service_partners = (DB.service_partners || []).filter(x => x.id !== partnerId);
    DB.partner_price_list = (DB.partner_price_list || []).filter(x => x.partner_id !== partnerId);
    (DB.service_orders || []).forEach(o => {
        if (o.assigned_partner_id === partnerId && !['bajarildi'].includes(o.order_status)) o.assigned_partner_id = null;
    });
    saveDB();
    refreshAllViews();
    showNotification(`🗑️ Hamkor "${p.company_name}" o'chirildi`, "success");
}
window.deletePartner = deletePartner;

// =========================================================================
// 5. XIZMAT BUYURTMALARI (4-BO'LIM DISPECHERLIK — DB.service_orders)
// =========================================================================
function editServiceOrder(orderId) {
    if (!requireAdmin()) return;
    const o = (DB.service_orders || []).find(x => x.id === orderId);
    if (!o) return showNotification("Xizmat buyurtmasi topilmadi!", "error");
    openAdminEditModal(`Xizmat buyurtmasini tahrirlash — ${o.order_number}`, [
        { name: 'customer_id', label: 'Mijoz', type: 'select', value: o.customer_id, options: customerOptions(), full: true },
        { name: 'assigned_partner_id', label: 'Hamkor', type: 'select', value: o.assigned_partner_id, options: (DB.service_partners || []).map(p => ({ value: p.id, label: `${p.company_name} (${p.service_category})` })), full: true },
        { name: 'service_date', label: 'Sana', type: 'date', value: o.service_date },
        { name: 'execution_time', label: 'Vaqt', type: 'time', value: o.execution_time },
        { name: 'destination_address', label: 'Manzil', value: o.destination_address, full: true },
        { name: 'details', label: 'Tafsilot', value: o.details, full: true },
        { name: 'customer_total_price', label: "Mijoz narxi", type: 'number', value: o.customer_total_price || 0 },
        { name: 'partner_payout_amount', label: "Hamkor haqi", type: 'number', value: o.partner_payout_amount || 0 },
        {
            name: 'order_status', label: 'Holati', type: 'select', value: o.order_status, options: [
                { value: 'yangi', label: 'Yangi' },
                { value: 'hamkorga_uzatildi', label: 'Uzatildi' },
                { value: 'hamkor_qabul_qildi', label: 'Hamkor qabul qildi' },
                { value: 'rad_etildi', label: 'Rad etildi' },
                { value: 'bajarilmoqda', label: 'Bajarilmoqda' },
                { value: 'bajarildi', label: 'Bajarildi' },
                { value: 'bekor_qilindi', label: 'Bekor qilindi' }
            ]
        }
    ], (v) => {
        const partnerChanged = String(v.assigned_partner_id) !== String(o.assigned_partner_id);
        o.customer_id = parseInt(v.customer_id) || o.customer_id;
        o.assigned_partner_id = parseInt(v.assigned_partner_id) || o.assigned_partner_id;
        o.service_date = v.service_date;
        o.execution_time = v.execution_time;
        o.destination_address = v.destination_address;
        o.details = v.details;
        o.customer_total_price = v.customer_total_price;
        o.partner_payout_amount = v.partner_payout_amount;
        o.net_profit = v.customer_total_price - v.partner_payout_amount;
        o.order_status = partnerChanged && ['rad_etildi', 'hamkorga_uzatildi'].includes(v.order_status) ? 'yangi' : v.order_status;
        saveDB();
        refreshAllViews();
        showNotification(`Xizmat buyurtmasi ${o.order_number} yangilandi ✅`, "success");
        if (partnerChanged && typeof autoDispatchOrderToPartner === 'function') autoDispatchOrderToPartner(o);
    }, "Hamkor o'zgartirilsa, yangi hamkorning Telegramiga buyurtma avtomatik yuboriladi.");
}
window.editServiceOrder = editServiceOrder;

function deleteServiceOrder(orderId) {
    if (!requireAdmin()) return;
    const o = (DB.service_orders || []).find(x => x.id === orderId);
    if (!o) return;
    if (!confirm(`Haqiqatan ham ${o.order_number} xizmat buyurtmasini o'chirmoqchimisiz?`)) return;
    if (o.order_status === 'bajarildi') {
        const p = (DB.service_partners || []).find(x => x.id === o.assigned_partner_id);
        if (p) p.balance = (p.balance || 0) + (o.partner_payout_amount || 0); // undo payable to partner
    }
    DB.service_orders = (DB.service_orders || []).filter(x => x.id !== orderId);
    DB.customer_orders = (DB.customer_orders || []).filter(c => c.id !== o.order_number);
    saveDB();
    refreshAllViews();
    showNotification(`🗑️ ${o.order_number} o'chirildi`, "success");
}
window.deleteServiceOrder = deleteServiceOrder;
