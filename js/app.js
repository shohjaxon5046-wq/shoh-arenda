// =========================================================================
// WMS ARENDA ERP - MAIN APPLICATION CONTROLLER & ROUTER
// =========================================================================

let currentSection = 'section-dashboard';

function switchSection(secId) {
    currentSection = secId;
    const sections = ['section-dashboard', 'section-orders', 'section-kirim', 'section-catalog', 'section-partners', 'section-staff', 'section-suppliers', 'section-crm', 'section-finance', 'section-ai'];
    const navButtons = {
        'section-dashboard': 'btn-section-dashboard',
        'section-orders': 'btn-section-orders',
        'section-kirim': 'btn-section-kirim',
        'section-catalog': 'btn-section-catalog',
        'section-partners': 'btn-section-partners',
        'section-staff': 'btn-section-staff',
        'section-suppliers': 'btn-section-suppliers',
        'section-crm': 'btn-section-crm',
        'section-finance': 'btn-section-finance',
        'section-ai': 'btn-section-ai'
    };
    const breadcrumbNames = {
        'section-dashboard': "8-bo'lim: Boshqaruv Paneli (Dashboard)",
        'section-orders': "5-bo'lim: Yagona Buyurtmalar (POS & Operator)",
        'section-kirim': "1-bo'lim: Kirim Zanjiri",
        'section-catalog': "2-bo'lim: Asboblar Katalogi",
        'section-partners': "4-bo'lim: Tashqi Xizmatlar & Dispecherlik",
        'section-staff': "3-bo'lim: Xodimlar & Rollar",
        'section-suppliers': "Yetkazib Beruvchilar (Oldi-berdi)",
        'section-crm': "Mijozlar CRM (360° Kartochka)",
        'section-finance': "6-bo'lim: Kassa, Moliya & Sof Foyda (P&L)",
        'section-ai': "9-bo'lim: AI Agent (Gemini / OpenAI 24/7)"
    };

    sections.forEach(s => {
        const el = document.getElementById(s);
        const btn = document.getElementById(navButtons[s]);
        if (s === secId) {
            if (el) el.classList.remove('hidden');
            if (btn) btn.className = "w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-semibold text-xs transition";
        } else {
            if (el) el.classList.add('hidden');
            if (btn) btn.className = "w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent text-slate-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition";
        }
    });

    const bSec = document.getElementById('breadcrumb-section');
    if (bSec) bSec.innerText = breadcrumbNames[secId] || '';

    const subnavKirim = document.getElementById('subnav-kirim');
    const chevronKirim = document.getElementById('icon-chevron-kirim');
    if (secId === 'section-kirim') {
        if (subnavKirim) subnavKirim.classList.remove('hidden');
        if (chevronKirim) chevronKirim.classList.remove('-rotate-90');
        renderAllTabs();
    } else {
        if (subnavKirim) subnavKirim.classList.add('hidden');
        if (chevronKirim) chevronKirim.classList.add('-rotate-90');
    }

    if (secId === 'section-dashboard' && typeof renderDashboard === 'function') renderDashboard();
    if (secId === 'section-orders') renderOrdersSection();
    if (secId === 'section-catalog') renderCatalogCards();
    if (secId === 'section-partners') switchPartnerTab(partnerActiveSubtab || 'ptab-directory');
    if (secId === 'section-staff') renderStaffTable();
    if (secId === 'section-suppliers') renderSuppliersLedger();
    if (secId === 'section-crm') renderCustomersCRM();
    if (secId === 'section-finance') renderFinanceSection();
    if (secId === 'section-ai' && typeof renderAISettingsForm === 'function') renderAISettingsForm();

    lucide.createIcons();
}

// Fast Global Scanner / Search with Live Customer & Item Lookups
function handleGlobalScan(e) {
    const query = e.target.value.trim().toLowerCase();
    if (e.key === 'Enter' && query) {
        // 1. Check Product Items by Serial or Barcode
        const foundItem = DB.product_items.find(i => i.serial_number.toLowerCase() === query || i.barcode.toLowerCase() === query);
        if (foundItem) {
            switchSection('section-kirim');
            switchTab('tab-placement');
            const searchInput = document.getElementById('filter-item-search');
            if (searchInput) searchInput.value = foundItem.serial_number;
            renderInventoryTable();
            openPrintStickerModal(foundItem.id);
            e.target.value = '';
            return;
        }

        // 2. Check Customer by Phone or Passport (Live Chain Warning)
        const foundCustomer = DB.customers.find(c => 
            c.phone_primary.toLowerCase().includes(query) || 
            (c.phone_secondary && c.phone_secondary.toLowerCase().includes(query)) ||
            c.passport_series_number.toLowerCase().includes(query) ||
            c.full_name.toLowerCase().includes(query)
        );
        if (foundCustomer) {
            switchSection('section-crm');
            const crmSearch = document.getElementById('filter-crm-search');
            if (crmSearch) crmSearch.value = query;
            renderCustomersCRM();
            openCustomerDetailModal(foundCustomer.id);

            // Warning if debtor or blacklisted
            if (foundCustomer.status === 'qora_royxat') {
                alert(`🚨 DIQQAT: Mijoz ${foundCustomer.full_name} QORA RO'YXATDA!\nSababi: ${foundCustomer.blacklist_reason}\nUshbu mijozga asbob berish taqiqlanadi!`);
            } else if (foundCustomer.current_debt > 0) {
                alert(`⚠️ OGOHLANTIRISH: Mijoz ${foundCustomer.full_name}da ${foundCustomer.current_debt.toLocaleString()} so'm qarzdorlik mavjud!`);
            }
            e.target.value = '';
            return;
        }

        // 3. Check Order Number
        const foundOrder = (DB.orders || []).find(o => o.order_number.toLowerCase() === query);
        if (foundOrder) {
            switchSection('section-orders');
            const ordSearch = document.getElementById('filter-orders-search');
            if (ordSearch) ordSearch.value = foundOrder.order_number;
            renderOrdersTable();
            openOrderDetailModal(foundOrder.id);
            e.target.value = '';
            return;
        }

        // 4. Check Product Models
        const foundModel = DB.product_models.find(m => m.name.toLowerCase().includes(query) || (m.model_code && m.model_code.toLowerCase().includes(query)));
        if (foundModel) {
            switchSection('section-catalog');
            const catSearch = document.getElementById('filter-catalog-search');
            if (catSearch) catSearch.value = query;
            renderCatalogCards();
            openProductCardModal(foundModel.id);
            e.target.value = '';
            return;
        }

        alert(`"${query}" kodi bo'yicha uskuna, model yoki mijoz topilmadi!`);
    }
}

// Modal Helpers & Notifications
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    lucide.createIcons();
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
    if (id === 'modal-order-receipt' && !currentUser) {
        if (typeof showAuthScreen === 'function') showAuthScreen();
    }
}

function showNotification(msg, type = "success") {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md transition transform duration-300 translate-y-2 opacity-0 ${
        type === 'success' ? 'bg-emerald-600/90 border border-emerald-400/30' : 'bg-red-600/90 border border-red-400/30'
    }`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle-2' : 'alert-circle'}" class="w-4 h-4"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function copyText(str) {
    navigator.clipboard.writeText(str).then(() => {
        showNotification(`"${str}" nusxalandi!`, "success");
    }).catch(() => {
        showNotification(`"${str}" nusxalandi!`, "success");
    });
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadDB();
    checkSession();
    lucide.createIcons();
});
