// =========================================================================
// SECTION 9: STATEFUL SMART AI AGENT (MULTI-TURN CONVERSATION ENGINE)
// =========================================================================

let chatHistory = [];
let chatSimulatorRole = 'customer'; // 'customer' or 'admin'

// -------------------------------------------------------------------------
// 1. DIALOG XOTIRASI VA BOSQICHLAR (CONVERSATION STATE MACHINE)
// -------------------------------------------------------------------------
let currentSession = {
    step: 'init', // 'init' | 'awaiting_address' | 'awaiting_time' | 'awaiting_phone' | 'completed'
    service_type: null, // 'kran' | 'musor' | 'gruzchik' | 'asbob'
    service_title: null, // 'Avtokran xizmati (25t)'
    tool_id: null,
    tool_model: null,
    estimated_price: 0,
    deposit_amount: 0,
    details: null,
    address: null,
    booking_time: null,
    phone: null,
    customer_name: null,
    created_order: null
};

function resetSession() {
    currentSession = {
        step: 'init',
        service_type: null,
        service_title: null,
        tool_id: null,
        tool_model: null,
        estimated_price: 0,
        deposit_amount: 0,
        details: null,
        address: null,
        booking_time: null,
        phone: null,
        customer_name: null,
        created_order: null
    };
    return currentSession;
}

// -------------------------------------------------------------------------
// 2. SMART PARSING (AQLLI MATN TUSHUNISH)
// -------------------------------------------------------------------------

/**
 * Telefon raqami formatini aniqlash va normalizatsiya qilish (+998 90 123-45-67)
 */
function extractPhoneNumber(text) {
    if (!text) return null;
    const cleanStr = text.replace(/[\s\-\(\)\.]/g, '');
    
    // 1. Full uzbek number: +998901234567 or 998901234567
    const fullMatch = cleanStr.match(/(?:\+?998)(9\d|88|33|77|95|99|97|98|94|93|91)\d{7}/);
    if (fullMatch) {
        const d = fullMatch[0].replace('+', '');
        const code = d.slice(3, 5);
        const p1 = d.slice(5, 8);
        const p2 = d.slice(8, 10);
        const p3 = d.slice(10, 12);
        return `+998 ${code} ${p1}-${p2}-${p3}`;
    }

    // 2. Short 9-digit: 901234567 or 93 123 45 67
    const shortMatch = cleanStr.match(/\b(9\d|88|33|77|95|99|97|98|94|93|91)\d{7}\b/);
    if (shortMatch) {
        const d = shortMatch[0];
        const code = d.slice(0, 2);
        const p1 = d.slice(2, 5);
        const p2 = d.slice(5, 7);
        const p3 = d.slice(7, 9);
        return `+998 ${code} ${p1}-${p2}-${p3}`;
    }

    // 3. Generic 7-12 digits if preceded by tel, telefon, raqam
    const genericMatch = text.match(/(?:tel|telefon|raqam|nomer|тел|номер|phone)\s*:?\s*([+\d\s\-()]{7,18})/i);
    if (genericMatch && genericMatch[1]) {
        const d = genericMatch[1].replace(/[^\d+]/g, '');
        if (d.length >= 7) return d;
    }

    return null;
}

/**
 * Vaqt yoki sana iboralarini aniqlash
 */
function extractBookingTime(text) {
    if (!text) return null;

    // Explicit: vaqti: ertaga 14:00 da
    const explicitMatch = text.match(/(?:vaqti|vaqt|время)\s*:?\s*([^\n,;]+?(?=(?:manzil|tel|telefon|\+?998|$)))/i);
    if (explicitMatch && explicitMatch[1].trim().length > 2) {
        return explicitMatch[1].trim();
    }

    // Pattern matching: "ertaga soat 14:00 da", "bugun 16:00 ga", "soat 10:00 da"
    const timeMatch = text.match(/(?:ertaga|bugun|indin|завтра|сегодня|dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba)\s*(?:soat|v|k)?\s*\d{1,2}(?:[:.]\d{2})?\s*(?:da|ga|gacha)?/i)
                   || text.match(/soat\s*\d{1,2}(?:[:.]\d{2})?\s*(?:da|ga|gacha)?/i)
                   || text.match(/\b\d{1,2}[:.]\d{2}\s*(?:da|ga|gacha)?/i);

    if (timeMatch) {
        return timeMatch[0].trim();
    }

    const lower = text.toLowerCase();
    const timeKeywords = ['ertaga', 'bugun', 'indin', 'ertalab', 'kechqurun', 'завтра', 'сегодня'];
    if (timeKeywords.some(w => lower.includes(w))) {
        let clean = text.split(/(?:tel|phone|telefon|manzil|\+?998)/i)[0].trim();
        return clean.replace(/[,;]+$/, '').trim();
    }

    return null;
}

/**
 * Manzilni aniqlash
 */
function extractAddress(text) {
    if (!text) return null;

    // Explicit: manzil: Qoratosh 52 11
    const explicitMatch = text.match(/(?:manzil|manzili|адрес)\s*:?\s*([^\n,;]+?(?=(?:vaqti|vaqt|soat|tel|telefon|\+?998|$)))/i);
    if (explicitMatch && explicitMatch[1].trim().length > 2) {
        return explicitMatch[1].trim();
    }

    const lower = text.toLowerCase();
    const addressKeywords = [
        "ko'cha", "kucha", "uy", "kv", "kvartal", "mavze", "massiv", "prospekt",
        "tuman", "tumani", "rayon", "shahar", "shahri", "dom", "ulitsa", "etaj", "qavat",
        "qoratosh", "chilonzor", "yunusobod", "sergeli", "olmazor", "yakkasaroy", "mirobod", "uchtepa",
        "bektemir", "yashnobod", "shayxontohur", "mirzo ulug'bek", "navoiy", "qorasaroy", "toshkent", "samarqand",
        "улица", "дом", "квартал", "массив", "чиланзар", "юнусабад", "каракамыш"
    ];

    const hasKeyword = addressKeywords.some(w => lower.includes(w));
    const hasStreetAndNumber = /[a-zA-Zа-яА-Яo'O'g'G'\s]{3,}\s+\d+/.test(text) && !text.includes('+998');

    if (hasKeyword || hasStreetAndNumber) {
        let clean = text.replace(/^(manzil\s*:?|manzili\s*:?|адрес\s*:?)/i, '').trim();
        clean = clean.split(/(?:tel|phone|telefon|vaqt|vaqti|\+?998)/i)[0].trim();
        return clean.replace(/[,;]+$/, '').trim();
    }

    return null;
}

/**
 * Xizmat yoki uskunani aniqlash (Kran, Musor, Gruzchik, Asboblar)
 */
function detectServiceAndTool(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // 1. Kran
    if (lower.includes('kran') || lower.includes('avtokran') || lower.includes('кран') || lower.includes('автокран')) {
        let title = "Avtokran xizmati (25t)";
        let quote = "Avtokran xizmati: 16t kran — 300 000 so'm/soat (minimal 2 soat), 25t kran — 350 000 so'm/soat (minimal 3 soat).";
        let estPrice = 1050000;
        if (lower.includes('16') || lower.includes('16t')) {
            title = "Avtokran 16t";
            quote = "16 tonnalik avtokran: soatiga 300 000 so'm (minimal 2 soat buyurtma).";
            estPrice = 600000;
        } else if (lower.includes('50') || lower.includes('50t')) {
            title = "Avtokran 50t";
            quote = "50 tonnalik avtokran: soatiga 600 000 so'm (minimal 4 soat buyurtma).";
            estPrice = 2400000;
        }
        return {
            service_type: 'kran',
            service_title: title,
            price_quote: quote,
            estimated_price: estPrice,
            deposit_amount: 0
        };
    }

    // 2. Musor (Chiqindi)
    if (lower.includes('musor') || lower.includes('chiqindi') || lower.includes('axlat') || lower.includes('мусор') || lower.includes('отход')) {
        let title = "Qurilish chiqindilarini (musor) olib ketish";
        let quote = "Qurilish chiqindilarini (musor) olib ketish narxlari: Gazel (1.5t gacha) — 400 000 so'm, ZIL (5t) — 800 000 so'm. Agar qoplarda bo'lsa — donasi 12 000 so'mdan.";
        let estPrice = 400000;
        if (lower.includes('zil') || lower.includes('зил')) {
            title = "Musor olib ketish (ZIL 5t)";
            estPrice = 800000;
        } else if (lower.includes('qop') || lower.includes('мешок')) {
            title = "Qoplangan qurilish chiqindisi";
            estPrice = 240000;
        }
        return {
            service_type: 'musor',
            service_title: title,
            price_quote: quote,
            estimated_price: estPrice,
            deposit_amount: 0
        };
    }

    // 3. Gruzchik
    if (lower.includes('gruzchik') || lower.includes('ishchi') || lower.includes('yukchi') || lower.includes('yuk tashish') || lower.includes('etajga') || lower.includes('грузчик')) {
        return {
            service_type: 'gruzchik',
            service_title: "Yuk ko'taruvchilar (Gruzchik) xizmati",
            price_quote: "Yuk ko'taruvchilar (Gruzchik) xizmati: 1 qop uchun 1 qavatga 3 000 so'm (liftda 1 500 so'm). Soatbay ish bo'lsa: 50 000 so'm/soat (kamida 2 soat).",
            estimated_price: 150000,
            deposit_amount: 0
        };
    }

    // 4. Asboblar ijarasi (Catalog lookup)
    const models = (typeof DB !== 'undefined' && DB.product_models) ? DB.product_models : [];
    const items = (typeof DB !== 'undefined' && DB.product_items) ? DB.product_items : [];

    let matchedModel = models.find(m => 
        lower.includes(m.name.toLowerCase()) || 
        m.name.toLowerCase().split(/\s+/).some(part => part.length > 3 && lower.includes(part))
    );

    if (!matchedModel) {
        if (lower.includes('perforator') || lower.includes('перфоратор')) {
            matchedModel = models.find(m => m.name.toLowerCase().includes('perforator')) || models[0];
        } else if (lower.includes('otboynik') || lower.includes('отбойник')) {
            matchedModel = models.find(m => m.name.toLowerCase().includes('otboyniy')) || models[1];
        } else if (lower.includes('generator') || lower.includes('генератор')) {
            matchedModel = models.find(m => m.name.toLowerCase().includes('generator')) || models[2];
        } else if (lower.includes('svarka') || lower.includes('сварка') || lower.includes('payvandlash')) {
            matchedModel = models.find(m => m.name.toLowerCase().includes('resanta') || m.name.toLowerCase().includes('svarka')) || models[3];
        } else if (lower.includes('bolgarka') || lower.includes('болгарка')) {
            matchedModel = models.find(m => m.name.toLowerCase().includes('bolgarka')) || models[0];
        }
    }

    if (matchedModel) {
        const availableItems = items.filter(i => i.product_model_id === matchedModel.id && i.status === 'omborda_bosh');
        const count = availableItems.length;
        const countTxt = count > 0 ? `(omborda ${count} ta mavjud)` : `(hozirda ijarada band)`;
        return {
            service_type: 'asbob',
            service_title: matchedModel.name,
            tool_id: matchedModel.id,
            tool_model: matchedModel,
            price_quote: `${matchedModel.name} — Kunlik ijarasi: ${matchedModel.daily_price.toLocaleString()} so'm, Zalog: ${matchedModel.deposit_amount.toLocaleString()} so'm ${countTxt}.`,
            estimated_price: matchedModel.daily_price,
            deposit_amount: matchedModel.deposit_amount
        };
    }

    return null;
}

// -------------------------------------------------------------------------
// 3. BUYURTMANI RASMIYLASHTIRISH VA BAZAGA DARHOL YOZISH (STEP 4)
// -------------------------------------------------------------------------

/**
 * Buyurtmani yakunlash va tizim bazasiga status: 'yangi' qilib qo'shish
 */
function finalizeAndCreateOrder(session) {
    const custPhone = session.phone || '+998 90 000-00-00';
    const custName = session.customer_name || 'AI Mijoz';
    const address = session.address || 'Toshkent shahri';
    const bookingTime = session.booking_time || 'Kelishilgan vaqtda';
    const serviceTitle = session.service_title || 'Xizmat';
    const estPrice = session.estimated_price || 0;
    const deposit = session.deposit_amount || 0;

    // 1. CRM mijozlar bazasida tekshirish yoki yangi mijoz yaratish
    if (typeof DB !== 'undefined') {
        if (!DB.customers) DB.customers = [];
        let customer = DB.customers.find(c => {
            const cPhone = (c.phone_primary || '').replace(/\D/g, '');
            const sPhone = custPhone.replace(/\D/g, '');
            return (cPhone.length >= 9 && sPhone.length >= 9 && (cPhone.endsWith(sPhone.slice(-9)) || sPhone.endsWith(cPhone.slice(-9))));
        });

        if (!customer) {
            customer = {
                id: Date.now() + Math.floor(Math.random() * 100),
                customer_type: "jismoniy_shaxs",
                full_name: custName,
                company_name: "",
                phone_primary: custPhone,
                phone_secondary: "",
                passport_series_number: "AA " + Math.floor(1000000 + Math.random() * 9000000),
                address: address,
                status: "ishonchli",
                current_debt: 0,
                current_deposit: 0,
                blacklist_reason: "",
                created_at: new Date().toISOString().substring(0, 10)
            };
            DB.customers.unshift(customer);
        }

        // 2. Tizimdagi asosiy "Buyurtmalar" (Orders) bazasiga status: 'yangi' qilib qo'shish
        const newOrderId = Date.now();
        const orderNumber = `ORD-${String((DB.orders || []).length + 1).padStart(4, '0')}`;

        const newOrder = {
            id: newOrderId,
            uuid: `ord-${newOrderId}-${Math.random().toString(36).substring(2, 8)}`,
            order_number: orderNumber,
            customer_id: customer.id,
            customer_name: customer.full_name,
            created_by_user_id: 1, // AI Agent
            status: "yangi",
            total_rent_amount: estPrice,
            total_deposit_amount: deposit,
            final_amount: estPrice,
            paid_amount: 0,
            remaining_debt: estPrice,
            start_date: bookingTime,
            expected_return_date: "",
            actual_return_date: null,
            created_at: new Date().toLocaleString('uz-UZ'),
            delivery_address: address,
            notes: `AI Agent orqali qabul qilindi. Xizmat: ${serviceTitle}. Manzil: ${address}. Vaqt: ${bookingTime}. Tel: ${custPhone}`
        };

        if (!DB.orders) DB.orders = [];
        DB.orders.unshift(newOrder);

        // 3. Agar kran, musor yoki gruzchik bo'lsa, Section 4 (service_orders) ga ham biriktirish
        if (session.service_type === 'kran' || session.service_type === 'musor' || session.service_type === 'gruzchik') {
            if (!DB.service_orders) DB.service_orders = [];
            const srvNumber = `SRV-2026-${String(DB.service_orders.length + 1).padStart(3, '0')}`;
            const catMap = { kran: 'kran', musor: 'musor_olib_ketish', gruzchik: 'gruzchik' };
            const partners = DB.service_partners || [];
            const partner = partners.find(p => p.service_category === catMap[session.service_type]) || partners[0];

            const srvOrder = {
                id: Date.now() + 1,
                order_number: srvNumber,
                customer_id: customer.id,
                service_category: catMap[session.service_type] || session.service_type,
                order_date: new Date().toISOString().substring(0, 10),
                service_date: bookingTime,
                execution_time: bookingTime,
                destination_address: address,
                details: `${serviceTitle}. Manzil: ${address}. Tel: ${custPhone}`,
                assigned_partner_id: partner ? partner.id : 1,
                customer_total_price: estPrice,
                partner_payout_amount: Math.round(estPrice * 0.8),
                net_profit: Math.round(estPrice * 0.2),
                order_status: "yangi",
                payment_status: "tolanmadi",
                created_at: new Date().toLocaleString('uz-UZ')
            };
            DB.service_orders.unshift(srvOrder);
        } else if (session.service_type === 'asbob' && session.tool_model) {
            // Asbob buyurtma bandi
            if (!DB.order_tool_items) DB.order_tool_items = [];
            const items = DB.product_items || [];
            const avail = items.find(i => i.product_model_id === session.tool_model.id && i.status === 'omborda_bosh');

            DB.order_tool_items.unshift({
                id: Date.now() + 2,
                order_id: newOrderId,
                product_item_id: avail ? avail.id : null,
                model_name: session.tool_model.name,
                serial_number: avail ? avail.serial_number : 'SN-AI-LEAD',
                daily_price: session.tool_model.daily_price,
                rent_days: 1,
                total_rent: session.tool_model.daily_price,
                deposit_amount: session.tool_model.deposit_amount,
                status: 'yangi'
            });
        }

        // 4. Har bir o'zgarishni darhol faylga (SQLite bazasiga) yozish!
        if (typeof saveDB === 'function') {
            saveDB();
        }

        // 5. Interfeys jadvallari va statistikalarni yangilash
        try {
            if (typeof updateStatsAndBadges === 'function') updateStatsAndBadges();
            if (typeof renderOrdersSection === 'function') renderOrdersSection();
            if (typeof renderPartnersDirectory === 'function') renderPartnersDirectory();
            if (typeof renderCustomersCRM === 'function') renderCustomersCRM();
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof showNotification === 'function') {
                showNotification(`Yangi buyurtma #${orderNumber} AI Agent tomonidan ochildi!`, 'success');
            }
        } catch (e) {}

        // Sessiyani tugatilgan holatga o'tkazish
        session.step = 'completed';
        session.created_order = newOrder;

        // Aniq formatlangan xulosa cheki
        const receipt = 
`🎉 BUYURTMANGIZ QABUL QILINDI! #${orderNumber}

🛠 Xizmat: ${serviceTitle}
📍 Manzil: ${address}
🕒 Vaqt: ${bookingTime}
📞 Telefon: ${custPhone}

Operatorimiz 5 daqiqada siz bilan bog'lanadi!`;

        return {
            reply: receipt,
            order_number: orderNumber,
            order: newOrder,
            step: 'completed'
        };
    } else {
        const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        session.step = 'completed';
        const receipt = 
`🎉 BUYURTMANGIZ QABUL QILINDI! #${orderNumber}

🛠 Xizmat: ${serviceTitle}
📍 Manzil: ${address}
🕒 Vaqt: ${bookingTime}
📞 Telefon: ${custPhone}

Operatorimiz 5 daqiqada siz bilan bog'lanadi!`;

        return {
            reply: receipt,
            order_number: orderNumber,
            step: 'completed'
        };
    }
}

// -------------------------------------------------------------------------
// 4. STATEFUL CONVERSATION ENGINE (ASOSIY DIALOG DVIGATELI)
// -------------------------------------------------------------------------

/**
 * Kontekstni to'liq eslab qoluvchi va bosqichma-bosqich buyurtma oluvchi markaziy funksiya
 */
function processStatefulConversation(rawMessage, role = 'customer', adminPin = '') {
    const text = (rawMessage || '').trim();
    if (!text) return { reply: "Iltimos, xabaringizni yozing." };

    const lower = text.toLowerCase();

    // 1. Buyurtmani bekor qilish yoki boshidan boshlash
    if (lower === 'bekor qilish' || lower === 'boshidan' || lower === 'yangi zakaz' || lower === 'yangi buyurtma' || 
        lower === 'отмена' || lower === 'сначала' || lower === 'новый заказ' || lower === 'reset') {
        resetSession();
        return {
            reply: "Joriy suhbat tozalandi. Qanday xizmat kerak: Avtokran, Musor olib ketish, Gruzchik yoki Qurilish asbobi?",
            step: 'init'
        };
    }

    // 2. Admin moliyaviy hisoboti (/admin 7788)
    if (lower.startsWith('/admin') || lower.startsWith('admin ') || (role === 'admin' && (lower.includes('kassa') || lower.includes('hisobot') || lower.includes('foyda')))) {
        return handleAdminStatsReport(text, role, adminPin);
    }

    // ---------------------------------------------------------------------
    // SMART PARSING: Matndan telefon, manzil, vaqt va xizmatni ajratib olish
    // ---------------------------------------------------------------------
    const extractedPhone = extractPhoneNumber(text);
    const extractedTime = extractBookingTime(text);
    const extractedAddress = extractAddress(text);
    const detectedService = detectServiceAndTool(text);

    // Agar matnda yangi xizmat so'ralgan bo'lsa, xizmatni saqlab olamiz
    if (detectedService) {
        currentSession.service_type = detectedService.service_type;
        currentSession.service_title = detectedService.service_title;
        currentSession.tool_id = detectedService.tool_id;
        currentSession.tool_model = detectedService.tool_model;
        currentSession.estimated_price = detectedService.estimated_price;
        currentSession.deposit_amount = detectedService.deposit_amount;
    }

    // Agar matnda telefon uchrasa, darhol telefon sifatida saqlaymiz
    if (extractedPhone) {
        currentSession.phone = extractedPhone;
    }

    // Agar matnda vaqt uchrasa, saqlaymiz
    if (extractedTime && currentSession.step !== 'awaiting_address') {
        currentSession.booking_time = extractedTime;
    }

    // ---------------------------------------------------------------------
    // STATE MACHINE DISPATCH
    // ---------------------------------------------------------------------

    // Agar avvalgi buyurtma yakunlangan bo'lsa va yangi xizmat yozilgan bo'lsa:
    if (currentSession.step === 'completed' && detectedService) {
        currentSession.step = 'init';
        currentSession.address = null;
        currentSession.booking_time = null;
        currentSession.phone = null;
        currentSession.created_order = null;
    }

    // BOSQICH 4: TELEFON KUTILMOQDA (yoki telefon aniqlandi)
    if (currentSession.step === 'awaiting_phone' || (extractedPhone && currentSession.service_type && currentSession.address)) {
        if (extractedPhone) {
            currentSession.phone = extractedPhone;
            // Agar vaqt hali berilmagan bo'lsa, standart vaqt belgilash
            if (!currentSession.booking_time) {
                currentSession.booking_time = extractedTime || "Bugun / Ertaga";
            }
            return finalizeAndCreateOrder(currentSession);
        } else {
            // Foydalanuvchi telefon o'rniga boshqa narsa yozdi
            return {
                reply: "Iltimos, buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)",
                step: 'awaiting_phone'
            };
        }
    }

    // BOSQICH 3: VAQT KUTILMOQDA
    if (currentSession.step === 'awaiting_time') {
        // Foydalanuvchi vaqtni yozdi (masalan: "Ertaga soat 14:00 da")
        currentSession.booking_time = extractedTime || text;

        // Agar shu xabarning o'zida telefon ham yozilgan bo'lsa, darhol buyurtmani yakunlash
        if (extractedPhone) {
            currentSession.phone = extractedPhone;
            return finalizeAndCreateOrder(currentSession);
        }

        // Aks holda telefonni so'rash
        currentSession.step = 'awaiting_phone';
        return {
            reply: "Ajoyib! Buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)",
            step: 'awaiting_phone'
        };
    }

    // BOSQICH 2: MANZIL KUTILMOQDA
    if (currentSession.step === 'awaiting_address') {
        // Foydalanuvchi manzilni yozdi (masalan: "Qoratosh 52 11" yoki "Yunusobod 14-mavze 12-uy")
        const addr = extractedAddress || text;
        currentSession.address = addr;

        // Agar xabarda vaqt ham birga berilgan bo'lsa
        if (extractedTime) {
            currentSession.booking_time = extractedTime;
            if (extractedPhone) {
                currentSession.phone = extractedPhone;
                return finalizeAndCreateOrder(currentSession);
            }
            currentSession.step = 'awaiting_phone';
            return {
                reply: `Manzil: ${currentSession.address} qabul qilindi! ✅\nAjoyib! Buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)`,
                step: 'awaiting_phone'
            };
        }

        // Qoidaga ko'ra: Boshidan salomlashmasdan manzilni tasdiqlab, vaqtni so'raymiz
        currentSession.step = 'awaiting_time';
        return {
            reply: `Manzil: ${currentSession.address} qabul qilindi! ✅ Uskuna / xizmat qaysi kunga va soat nechiga kerak?`,
            step: 'awaiting_time'
        };
    }

    // BOSQICH 1: XIZMAT SO'RALGANDA (Kran, Musor, Gruzchik, Asbob)
    if (detectedService) {
        // Barcha parametrlar bitta xabarda kelgan bo'lsa (Smart all-in-one message)
        const addrInMsg = extractedAddress;
        const timeInMsg = extractedTime;
        const phoneInMsg = extractedPhone;

        if (addrInMsg && timeInMsg && phoneInMsg) {
            currentSession.address = addrInMsg;
            currentSession.booking_time = timeInMsg;
            currentSession.phone = phoneInMsg;
            return finalizeAndCreateOrder(currentSession);
        }

        if (addrInMsg) {
            currentSession.address = addrInMsg;
            currentSession.step = 'awaiting_time';
            return {
                reply: `${detectedService.price_quote}\n\nManzil: ${currentSession.address} qabul qilindi! ✅ Uskuna / xizmat qaysi kunga va soat nechiga kerak?`,
                step: 'awaiting_time'
            };
        }

        // Standart 1-bosqich: Narxini aytadi va manzilni so'raydi
        currentSession.step = 'awaiting_address';
        return {
            reply: `${detectedService.price_quote}\n\nManzilingizni yozing (ko'cha, uy raqami)?`,
            step: 'awaiting_address'
        };
    }

    // Salomlashish yoki umumiy savollar
    const isGreeting = lower === 'salom' || lower.startsWith('salom') || lower.startsWith('assalom') || 
                       lower.includes('privet') || lower.includes('привет') || lower.includes('здравствуй');

    if (isGreeting || currentSession.step === 'init') {
        return {
            reply: `Assalomu alaykum! WMS Arenda xizmatiga xush kelibsiz!\n\nBizning asosiy xizmatlarimiz:\n1. 🏗 **Avtokran xizmati** (16t, 25t, 50t);\n2. 🚛 **Qurilish chiqindilarini (musor) olib ketish**;\n3. 👷‍♂️ **Yuk ko'taruvchilar (Gruzchik) xizmati**;\n4. 🛠 **Qurilish asboblari ijarasi** (Perforator, Otboynik, Generator, Svarka va boshqalar).\n\nSizga qaysi xizmat yoki uskuna kerak?`,
            step: 'init'
        };
    }

    return {
        reply: `Qaysi xizmat yoki uskuna kerakligini aytsangiz (masalan: "Kran kerak", "Musor olib ketish", "Perforator bormi?"), darhol narxini hisoblab, buyurtmangizni rasmiylashtirib beraman!`,
        step: 'init'
    };
}

// -------------------------------------------------------------------------
// 5. ADMIN HISOBOTI ISHLOVCHISI (/admin 7788)
// -------------------------------------------------------------------------
function handleAdminStatsReport(text, role, adminPin) {
    const savedPin = (typeof DB !== 'undefined' && DB.ai_settings?.admin_pin) || '7788';
    const isPinCorrect = text.includes('7788') || text.includes(savedPin) || adminPin === savedPin || (role === 'admin');

    if (!isPinCorrect) {
        return {
            reply: "🔒 Ushbu moliyaviy hisobot faqat Bosh Admin uchun ochiq. Iltimos, PIN kodni kiriting (Masalan: /admin 7788).",
            function_called: "get_admin_daily_stats"
        };
    }

    chatSimulatorRole = 'admin';
    const orders = (typeof DB !== 'undefined' && DB.orders) ? DB.orders : [];
    const payments = (typeof DB !== 'undefined' && DB.order_payments) ? DB.order_payments : [];
    const items = (typeof DB !== 'undefined' && DB.product_items) ? DB.product_items : [];
    const expenses = (typeof DB !== 'undefined' && DB.expenses) ? DB.expenses : [];

    let todayRentIncome = 0;
    let todayDeposits = 0;
    payments.forEach(p => {
        if (p.payment_type === 'ijara_haqi') todayRentIncome += (p.amount || 0);
        else if (p.payment_type === 'zalog_olindi') todayDeposits += (p.amount || 0);
    });

    if (todayRentIncome === 0 && orders.length > 0) {
        todayRentIncome = orders.slice(0, 3).reduce((acc, o) => acc + (o.paid_amount || 0), 0);
        todayDeposits = orders.slice(0, 3).reduce((acc, o) => acc + (o.total_deposit_amount || 0), 0);
    }

    const delayedOrders = orders.filter(o => o.status === 'kechikkan');
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    let totalRevenue = orders.reduce((acc, o) => acc + (o.paid_amount || 0), 0);
    const netProfit = Math.max(0, totalRevenue - totalExpenses);

    const timeStr = new Date().toLocaleString('uz-UZ');

    return {
        reply: `🔒 **Bosh Admin Rejimi Faol!**\n\n📊 **Bugungi Kassa va Biznes Hisoboti (${timeStr}):**\n• Bugungi sof tushum: **${todayRentIncome.toLocaleString()} so'm**\n• Olingan garov (zalog): **${todayDeposits.toLocaleString()} so'm**\n• Oylik toza foyda: **${netProfit.toLocaleString()} so'm**\n• Kechikkan buyurtmalar soni: **${delayedOrders.length} ta**\n\n📦 **Ombor qoldig'i:** Jami: ${items.length} ta (Bo'sh: ${items.filter(i => i.status === 'omborda_bosh').length} ta, Ijarada: ${items.filter(i => i.status === 'ijarada').length} ta)`,
        function_called: "get_admin_daily_stats"
    };
}

// -------------------------------------------------------------------------
// 6. PROCESS USER MESSAGE DISPATCHER (UI / API)
// -------------------------------------------------------------------------
async function processUserMessage(rawMessage, role = 'customer', adminPin = '') {
    const text = (rawMessage || '').trim();
    if (!text) return { reply: "Iltimos, xabaringizni yozing.", function_called: null };

    // Stateful Conversation Engine orqali qayta ishlash
    const result = processStatefulConversation(text, role, adminPin);

    // Xabarlar tarixiga qo'shish
    chatHistory.push({ sender: 'user', content: text, timestamp: new Date() });
    chatHistory.push({ sender: 'assistant', content: result.reply, timestamp: new Date() });

    return result;
}

// -------------------------------------------------------------------------
// 7. UI SOZLAMALARI VA BOSHQARUV TUGMALARI
// -------------------------------------------------------------------------

function handleAIProviderChange() {
    const select = document.getElementById('ai-setting-provider');
    if (!select) return;
    const val = select.value;
    const label = document.getElementById('ai-setting-key-label');
    const hint = document.getElementById('ai-setting-key-hint');
    const modelInput = document.getElementById('ai-setting-model');
    const keyInput = document.getElementById('ai-setting-key');

    if (val === 'builtin') {
        if (modelInput) modelInput.value = 'builtin-nlp';
        if (keyInput) keyInput.placeholder = 'Kalit talab qilinmaydi (100% Avtonom & Offline)';
        if (label) label.textContent = 'API Kaliti (Talab etilmaydi — 100% Avtonom)';
        if (hint) hint.innerHTML = `<span class="text-emerald-400 font-semibold">100% Avtonom:</span> Ichki dvigatel to'liq offline rejimda ishlaydi.`;
    } else {
        if (label) label.textContent = 'API Kaliti';
        if (hint) hint.innerHTML = `Tanlangan LLM provayderi kalitini kiriting.`;
    }
}

function renderAISettingsForm() {
    const s = (typeof DB !== 'undefined' && DB.ai_settings) ? DB.ai_settings : {};

    const toggle = document.getElementById('ai-setting-enabled');
    const provSelect = document.getElementById('ai-setting-provider');
    const keyInput = document.getElementById('ai-setting-key');
    const modelInput = document.getElementById('ai-setting-model');
    const pinInput = document.getElementById('ai-setting-pin');
    const welcomeInput = document.getElementById('ai-setting-welcome');
    const promptInput = document.getElementById('ai-setting-prompt');

    if (toggle) toggle.checked = !!s.is_enabled;
    if (provSelect) {
        provSelect.value = s.provider || 'builtin';
        handleAIProviderChange();
    }
    if (keyInput && s.api_key) keyInput.value = s.api_key;
    if (modelInput && s.model_name) modelInput.value = s.model_name;
    if (pinInput) pinInput.value = s.admin_pin || '7788';
    if (welcomeInput) welcomeInput.value = s.welcome_message || '';
    if (promptInput) promptInput.value = s.system_prompt || '';

    updateAIStatusBadge();
}

function saveAISettings(e) {
    if (e) e.preventDefault();

    if (typeof DB !== 'undefined') {
        if (!DB.ai_settings) DB.ai_settings = {};

        DB.ai_settings.is_enabled = document.getElementById('ai-setting-enabled')?.checked ?? true;
        DB.ai_settings.provider = document.getElementById('ai-setting-provider')?.value || 'builtin';
        DB.ai_settings.api_key = document.getElementById('ai-setting-key')?.value.trim() || '';
        DB.ai_settings.model_name = document.getElementById('ai-setting-model')?.value.trim() || 'builtin-nlp';
        DB.ai_settings.admin_pin = document.getElementById('ai-setting-pin')?.value.trim() || '7788';
        DB.ai_settings.welcome_message = document.getElementById('ai-setting-welcome')?.value.trim() || '';
        DB.ai_settings.system_prompt = document.getElementById('ai-setting-prompt')?.value.trim() || '';

        if (typeof saveDB === 'function') saveDB();
        updateAIStatusBadge();
        if (typeof showNotification === 'function') {
            showNotification("AI Yordamchi sozlamalari muvaffaqiyatli saqlandi!", "success");
        }
    }
}

function updateAIStatusBadge() {
    const s = (typeof DB !== 'undefined' && DB.ai_settings) ? DB.ai_settings : {};
    const badge = document.getElementById('ai-global-status-badge');
    if (!badge) return;

    if (s.is_enabled !== false) {
        badge.className = "px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1.5";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> <span>AI Agent Faol (24/7)</span>`;
    } else {
        badge.className = "px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] flex items-center gap-1.5";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> <span>AI O'chirilgan</span>`;
    }
}

// -------------------------------------------------------------------------
// 8. CHAT SIMULYATORI VA INTERFEYS
// -------------------------------------------------------------------------

function setChatSimulatorRole(role) {
    chatSimulatorRole = role;
    const btnCust = document.getElementById('btn-sim-role-customer');
    const btnAdmin = document.getElementById('btn-sim-role-admin');

    if (role === 'customer') {
        if (btnCust) btnCust.className = "px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm transition";
        if (btnAdmin) btnAdmin.className = "px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-semibold text-xs transition";
    } else {
        if (btnCust) btnCust.className = "px-3 py-1.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-semibold text-xs transition";
        if (btnAdmin) btnAdmin.className = "px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm transition";
    }
}

function sendQuickPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
        input.value = promptText;
        handleSendAIChatMessage();
    }
}

async function handleSendAIChatMessage(e) {
    if (e) e.preventDefault();

    const input = document.getElementById('ai-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';

    // Foydalanuvchi xabarini ekranga chiqarish
    appendChatMessage('user', text, chatSimulatorRole);

    // Kutilmoqda animatsiyasi
    const typingId = appendTypingIndicator();

    try {
        const adminPin = (chatSimulatorRole === 'admin') ? (DB.ai_settings?.admin_pin || '7788') : '';
        const response = await processUserMessage(text, chatSimulatorRole, adminPin);

        removeTypingIndicator(typingId);
        appendChatMessage('assistant', response.reply, 'assistant', response.function_called, response.function_result);
    } catch (err) {
        removeTypingIndicator(typingId);
        appendChatMessage('assistant', `Xatolik: ${err.message}`, 'assistant');
    }
}

function appendChatMessage(sender, content, role = 'customer', functionCalled = null, functionResult = null) {
    const container = document.getElementById('ai-chat-messages-container');
    if (!container) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement('div');

    if (sender === 'user') {
        msgDiv.className = "flex justify-end gap-2 text-xs";
        msgDiv.innerHTML = `
            <div class="max-w-[80%] rounded-2xl rounded-tr-none bg-blue-600 p-3 text-white shadow-md">
                <div class="flex items-center justify-between gap-3 text-[10px] text-blue-200 mb-1 border-b border-blue-500/40 pb-0.5">
                    <span>${role === 'admin' ? '👤 Bosh Admin' : '👤 Mijoz'}</span>
                    <span>${timeStr}</span>
                </div>
                <div class="leading-relaxed whitespace-pre-wrap">${escapeHtml(content)}</div>
            </div>
        `;
    } else {
        msgDiv.className = "flex justify-start gap-2.5 text-xs";

        let functionBadgeHtml = '';
        if (functionCalled) {
            functionBadgeHtml = `
                <div class="mb-2 p-2 rounded-xl bg-slate-950 border border-blue-500/30 text-[10px] font-mono text-blue-300">
                    <div class="flex items-center justify-between font-bold text-blue-400">
                        <span>⚙️ Funksiya bajarildi: ${functionCalled}()</span>
                        <span class="text-emerald-400">STATUS: OK</span>
                    </div>
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                🤖
            </div>
            <div class="max-w-[85%] rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 p-3.5 text-slate-200 shadow-md space-y-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                    <span class="font-bold text-indigo-400">WMS AI Agent 24/7 (Kontekstli)</span>
                    <span>${timeStr}</span>
                </div>
                ${functionBadgeHtml}
                <div class="leading-relaxed whitespace-pre-wrap text-slate-100">${formatMarkdownText(content)}</div>
            </div>
        `;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

function appendTypingIndicator() {
    const container = document.getElementById('ai-chat-messages-container');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "flex justify-start gap-2.5 text-xs";
    div.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0">🤖</div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-100"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-200"></span>
            <span class="text-[11px] ml-1">AI xabaringizni qayta ishlamoqda...</span>
        </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
}

function clearChatHistory() {
    chatHistory = [];
    resetSession();
    const container = document.getElementById('ai-chat-messages-container');
    if (container) {
        container.innerHTML = `
            <div class="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                <div class="font-bold flex items-center gap-1.5 mb-1 text-white">
                    <span>👋 WMS Arenda AI Yordamchisiga xush kelibsiz!</span>
                </div>
                <p>Men muloqot kontekstini eslab qoluvchi va to'g'ridan-to'g'ri buyurtma rasmiylashtiruvchi aqlli yordamchiman. Qaysi xizmat kerakligini ayting (Avtokran, Musor, Gruzchik yoki Asboblar):</p>
            </div>
        `;
    }
}

function escapeHtml(text) {
    return (text || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function formatMarkdownText(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>');
}
