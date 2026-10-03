// =========================================================================
// WMS ARENDA ERP - MAIN APPLICATION CONTROLLER & ROUTER
// =========================================================================

let currentSection = 'section-dashboard';
if (typeof window !== 'undefined') window.currentSection = currentSection;

const SECTION_ALIASES = {
    'dashboard': 'section-dashboard',
    'boshqaruv': 'section-dashboard',
    'paneli': 'section-dashboard',
    'boshqaruv paneli': 'section-dashboard',
    'section-dashboard': 'section-dashboard',
    
    'ombor': 'section-kirim',
    'warehouse': 'section-kirim',
    'kirim': 'section-kirim',
    'inbound': 'section-kirim',
    'po': 'section-kirim',
    'kirim zanjiri': 'section-kirim',
    'section-kirim': 'section-kirim',
    
    'catalog': 'section-catalog',
    'katalog': 'section-catalog',
    'asboblar': 'section-catalog',
    'asboblar katalogi': 'section-catalog',
    'tools': 'section-catalog',
    'section-catalog': 'section-catalog',
    
    'staff': 'section-staff',
    'xodimlar': 'section-staff',
    'rollar': 'section-staff',
    'xodimlar va rollar': 'section-staff',
    'users': 'section-staff',
    'section-staff': 'section-staff',
    
    'partners': 'section-partners',
    'hamkorlar': 'section-partners',
    'tashqi': 'section-partners',
    'tashqi xizmatlar': 'section-partners',
    'xizmatlar': 'section-partners',
    'kran': 'section-partners',
    'musor': 'section-partners',
    'gruzchik': 'section-partners',
    'section-partners': 'section-partners',
    
    'orders': 'section-orders',
    'buyurtmalar': 'section-orders',
    'pos': 'section-orders',
    'zakazlar': 'section-orders',
    'operator': 'section-orders',
    'section-orders': 'section-orders',
    
    'suppliers': 'section-suppliers',
    'yetkazib_beruvchilar': 'section-suppliers',
    'yetkazib-beruvchilar': 'section-suppliers',
    'yetkazibberuvchilar': 'section-suppliers',
    'yetkazib beruvchilar': 'section-suppliers',
    'section-suppliers': 'section-suppliers',
    
    'crm': 'section-crm',
    'mijozlar': 'section-crm',
    'mijozlar crm': 'section-crm',
    'customers': 'section-crm',
    'section-crm': 'section-crm',
    
    'finance': 'section-finance',
    'kassa': 'section-finance',
    'moliya': 'section-finance',
    'kassa & moliya': 'section-finance',
    'kassa va moliya': 'section-finance',
    'pnl': 'section-finance',
    'pl': 'section-finance',
    'foyda': 'section-finance',
    'section-finance': 'section-finance',
    
    'ai': 'section-ai',
    'agent': 'section-ai',
    'ai agent': 'section-ai',
    'bot': 'section-ai',
    'gemini': 'section-ai',
    'section-ai': 'section-ai'
};

function normalizeSectionId(rawId) {
    if (!rawId) return 'section-dashboard';
    const clean = String(rawId).toLowerCase().trim();
    if (SECTION_ALIASES[clean]) return SECTION_ALIASES[clean];
    if (clean.startsWith('section-')) return clean;
    return `section-${clean}`;
}

function isCurrentAdmin() {
    try {
        if (typeof currentUser === 'undefined' || !currentUser) return false;
        const role = String(currentUser.role_id || currentUser.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin' || currentUser.username === 'admin';
    } catch (e) {
        return false;
    }
}
window.isCurrentAdmin = isCurrentAdmin;

function applyRolePermissions() {
    const isAdmin = isCurrentAdmin();
    
    // Admin-only sidebar navigation IDs
    const adminOnlyNav = [
        'btn-section-dashboard',
        'btn-section-kirim',
        'btn-section-staff',
        'btn-section-partners',
        'btn-section-suppliers',
        'btn-section-crm',
        'btn-section-finance',
        'btn-section-ai'
    ];
    
    adminOnlyNav.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            const container = btn.closest('div') || btn;
            if (isAdmin) {
                btn.classList.remove('hidden');
                btn.style.setProperty('display', 'flex', 'important');
                if (container && container !== btn && container.parentElement?.tagName === 'NAV') {
                    container.classList.remove('hidden');
                    container.style.setProperty('display', 'block', 'important');
                }
            } else {
                btn.classList.add('hidden');
                btn.style.setProperty('display', 'none', 'important');
                if (container && container !== btn && container.parentElement?.tagName === 'NAV') {
                    container.classList.add('hidden');
                    container.style.setProperty('display', 'none', 'important');
                }
            }
        }
    });

    // Hide Kirim quick tile in sidebar for Manager
    const quickKirim = document.querySelector("button[onclick*='section-kirim']");
    if (quickKirim) {
        if (isAdmin) {
            quickKirim.classList.remove('hidden');
            quickKirim.style.removeProperty('display');
        } else {
            quickKirim.classList.add('hidden');
            quickKirim.style.setProperty('display', 'none', 'important');
        }
    }
}
window.applyRolePermissions = applyRolePermissions;

function switchSection(secId) {
    if (!secId) secId = isCurrentAdmin() ? 'section-dashboard' : 'section-orders';
    const clean = String(secId).toLowerCase().trim();

    // Enforce role guard: non-admin can only access orders & catalog
    const isAdmin = isCurrentAdmin();

    // Check if it refers to a subtab inside Kirim Zanjiri
    if (clean.startsWith('tab-') || ['po', 'receipt', 'placement', 'returns', 'warehouse-map'].includes(clean)) {
        if (!isAdmin) {
            secId = 'section-orders';
        } else {
            secId = 'section-kirim';
            if (typeof switchTab === 'function') {
                switchTab(clean);
            }
        }
    } else {
        secId = normalizeSectionId(secId);
    }

    if (!isAdmin && secId !== 'section-orders' && secId !== 'section-catalog') {
        secId = 'section-orders';
    }

    currentSection = secId;
    if (typeof window !== 'undefined') window.currentSection = currentSection;
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
            if (el) {
                el.classList.remove('hidden');
                el.style.setProperty('display', 'flex', 'important');
            }
            if (btn) btn.className = "w-full flex items-center justify-between px-3 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 font-semibold text-xs transition";
        } else {
            if (el) {
                el.classList.add('hidden');
                el.style.setProperty('display', 'none', 'important');
            }
            if (btn) btn.className = "w-full flex items-center justify-between px-3 py-2 rounded-xl border border-transparent text-slate-300 hover:bg-slate-800 hover:text-white font-semibold text-xs transition";
        }
    });

    const bSec = document.getElementById('breadcrumb-section');
    if (bSec) bSec.innerText = breadcrumbNames[secId] || '';

    const subnavKirim = document.getElementById('subnav-kirim');
    const chevronKirim = document.getElementById('icon-chevron-kirim');
    if (secId === 'section-kirim') {
        if (subnavKirim) {
            subnavKirim.classList.remove('hidden');
            subnavKirim.style.setProperty('display', 'flex', 'important');
        }
        if (chevronKirim) chevronKirim.classList.remove('-rotate-90');
        try { if (typeof renderAllTabs === 'function') renderAllTabs(); } catch (e) { console.error(e); }
    } else {
        if (subnavKirim) {
            subnavKirim.classList.add('hidden');
            subnavKirim.style.setProperty('display', 'none', 'important');
        }
        if (chevronKirim) chevronKirim.classList.add('-rotate-90');
    }

    try {
        if (secId === 'section-dashboard' && typeof renderDashboard === 'function') renderDashboard();
        if (secId === 'section-orders' && typeof renderOrdersSection === 'function') renderOrdersSection();
        if (secId === 'section-catalog' && typeof renderCatalogCards === 'function') renderCatalogCards();
        if (secId === 'section-partners' && typeof switchPartnerTab === 'function') {
            const subtab = (typeof partnerActiveSubtab !== 'undefined' ? partnerActiveSubtab : 'ptab-directory');
            switchPartnerTab(subtab);
        }
        if (secId === 'section-staff' && typeof renderStaffTable === 'function') renderStaffTable();
        if (secId === 'section-suppliers' && typeof renderSuppliersLedger === 'function') renderSuppliersLedger();
        if (secId === 'section-crm' && typeof renderCustomersCRM === 'function') renderCustomersCRM();
        if (secId === 'section-finance' && typeof renderFinanceSection === 'function') renderFinanceSection();
        if (secId === 'section-ai' && typeof renderAISettingsForm === 'function') renderAISettingsForm();
    } catch (renderErr) {
        console.error("switchSection rendering error:", renderErr);
    }

    try {
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch (e) {}
}

// Universal alias to support both switchSection and showSection
function showSection(secId) {
    return switchSection(secId);
}

window.switchSection = switchSection;
window.showSection = showSection;

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
                alert(`DIQQAT: Mijoz ${foundCustomer.full_name} QORA RO'YXATDA!\nSababi: ${foundCustomer.blacklist_reason}\nUshbu mijozga asbob berish taqiqlanadi!`);
            } else if (foundCustomer.current_debt > 0) {
                alert(`OGOHLANTIRISH: Mijoz ${foundCustomer.full_name}da ${foundCustomer.current_debt.toLocaleString()} so'm qarzdorlik mavjud!`);
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
    try {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('hidden');
            el.style.setProperty('display', 'flex', 'important');
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    } catch(e) {
        console.error(`openModal("${id}") error:`, e);
    }
}

function closeModal(id) {
    try {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.style.setProperty('display', 'none', 'important');
        }
        if (id === 'modal-order-receipt' && !currentUser) {
            if (typeof showAuthScreen === 'function') showAuthScreen();
        }
    } catch(e) {
        console.error(`closeModal("${id}") error:`, e);
    }
}

window.openModal = openModal;
window.closeModal = closeModal;

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

function openSelfProfileModal() {
    if (!currentUser) return;
    const modal = document.getElementById('modal-user-self-profile');
    if (!modal) return;
    
    const avatarEl = document.getElementById('self-profile-avatar');
    const nameEl = document.getElementById('self-profile-fullname');
    const userEl = document.getElementById('self-profile-username');
    const phoneEl = document.getElementById('self-profile-phone');
    const roleEl = document.getElementById('self-profile-role-display');
    const passEl = document.getElementById('self-profile-password');
    const passConfEl = document.getElementById('self-profile-password-confirm');
    
    const fName = currentUser.full_name || currentUser.username || 'Foydalanuvchi';
    if (avatarEl) avatarEl.innerText = fName.charAt(0).toUpperCase();
    if (nameEl) nameEl.value = fName;
    if (userEl) userEl.value = currentUser.username || '';
    if (phoneEl) phoneEl.value = currentUser.phone || '';
    
    const roleLabels = {
        admin: "👑 Bosh Admin (To'liq Boshqaruv)",
        manager: "💼 Menejer / Sotuvchi (Buyurtmalar & Katalog)",
        cashier: "💵 Kassir",
        warehouseman: "📦 Skladchi"
    };
    if (roleEl) roleEl.value = roleLabels[currentUser.role_id] || currentUser.role_id || 'Foydalanuvchi';
    if (passEl) passEl.value = '';
    if (passConfEl) passConfEl.value = '';
    
    openModal('modal-user-self-profile');
}

function saveSelfProfile(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser) return;
    
    const fullName = (document.getElementById('self-profile-fullname')?.value || '').trim();
    const phone = (document.getElementById('self-profile-phone')?.value || '').trim();
    const newPass = (document.getElementById('self-profile-password')?.value || '').trim();
    const confirmPass = (document.getElementById('self-profile-password-confirm')?.value || '').trim();
    
    if (newPass && newPass !== confirmPass) {
        alert("Kiritilgan yangi parollar bir-biriga mos kelmadi!");
        return;
    }
    
    // Update in DB.users
    const userInDb = (DB.users || []).find(u => u.id === currentUser.id || u.username === currentUser.username);
    if (userInDb) {
        if (fullName) userInDb.full_name = fullName;
        if (phone) userInDb.phone = phone;
        if (newPass) userInDb.password = newPass;
    }
    
    if (fullName) currentUser.full_name = fullName;
    if (phone) currentUser.phone = phone;
    if (newPass) currentUser.password = newPass;
    
    try {
        localStorage.setItem('WMS_USER_SESSION', JSON.stringify(currentUser));
        if (typeof saveDB === 'function') saveDB();
    } catch(err) {}
    
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    if (userNameEl) userNameEl.innerText = currentUser.full_name;
    if (userAvatarEl) userAvatarEl.innerText = currentUser.full_name.charAt(0).toUpperCase();
    
    closeModal('modal-user-self-profile');
    showNotification("Profil ma'lumotlari muvaffaqiyatli saqlandi!", "success");
}

window.openSelfProfileModal = openSelfProfileModal;
window.saveSelfProfile = saveSelfProfile;

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    loadDB();
    checkSession();
    applyRolePermissions();
    lucide.createIcons();
});

