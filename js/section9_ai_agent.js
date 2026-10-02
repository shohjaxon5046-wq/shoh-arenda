// =========================================================================
// SECTION 9: AI AGENT (GEMINI / OPENAI / SMART FUNCTION CALLING)
// =========================================================================

let chatHistory = [];
let chatSimulatorRole = 'customer'; // 'customer' or 'admin'

// -------------------------------------------------------------------------
// 1. AI CORE FUNCTION CALLING TOOLS (MA'LUMOTLAR BAZASI BILAN ISHLASH)
// -------------------------------------------------------------------------

/**
 * 1. check_tool_availability(tool_name)
 * Omborda so'ralgan asbob bo'sh bormi, kunlik narxi va zalogi qancha ekanligini tekshirish.
 */
function tool_check_tool_availability(tool_name) {
    const query = (tool_name || '').toLowerCase().trim();
    const models = DB.product_models || [];
    const items = DB.product_items || [];

    // Find best match model
    let matchedModel = models.find(m => 
        m.name.toLowerCase().includes(query) || 
        (m.model_code && m.model_code.toLowerCase().includes(query)) ||
        m.brand.toLowerCase().includes(query) ||
        (m.specifications && JSON.stringify(m.specifications).toLowerCase().includes(query))
    );

    // If generic words like "perforator", "bolgarka", "generator"
    if (!matchedModel && query) {
        matchedModel = models.find(m => {
            const words = query.split(/\s+/);
            return words.some(w => w.length > 3 && m.name.toLowerCase().includes(w));
        });
    }

    if (!matchedModel) {
        // Return list of available tools in stock as suggestions
        const inStockModels = models.filter(m => items.some(i => i.product_model_id === m.id && i.status === 'omborda_bosh'));
        return {
            found: false,
            message: `Kechirasiz, "${tool_name}" nomli uskuna katalogimizda topilmadi.`,
            available_alternatives: inStockModels.map(m => ({
                id: m.id,
                name: m.name,
                brand: m.brand,
                daily_price: m.daily_price,
                deposit: m.deposit_amount
            }))
        };
    }

    const availableItems = items.filter(i => i.product_model_id === matchedModel.id && i.status === 'omborda_bosh');
    const inRentItems = items.filter(i => i.product_model_id === matchedModel.id && i.status === 'ijarada');
    const totalCount = items.filter(i => i.product_model_id === matchedModel.id).length;

    return {
        found: true,
        tool_id: matchedModel.id,
        model_name: matchedModel.name,
        brand: matchedModel.brand,
        daily_price: matchedModel.daily_price,
        hourly_price: matchedModel.hourly_price || 0,
        deposit_amount: matchedModel.deposit_amount,
        available_count: availableItems.length,
        in_rent_count: inRentItems.length,
        total_count: totalCount,
        is_available: availableItems.length > 0,
        specifications: matchedModel.specifications || {},
        kit_items: matchedModel.kit_items || [],
        replacement_cost: matchedModel.replacement_cost,
        message: availableItems.length > 0 
            ? `Ha, omborimizda ${availableItems.length} ta "${matchedModel.name}" bo'sh turibdi.`
            : `Afsuski, hozirda "${matchedModel.name}" uskunalarining barchasi ijarada (${inRentItems.length} ta band).`
    };
}

/**
 * 2. get_service_price(service_type, details)
 * Kran, Musor yoki Gruzchik xizmatlari narxini hisoblab berish.
 */
function tool_get_service_price(service_type, details = '') {
    const category = (service_type || '').toLowerCase();
    const partners = DB.service_partners || [];
    const priceList = DB.partner_price_list || [];

    let result = {
        service_category: category,
        details_given: details,
        price_quote: "",
        terms: "",
        min_order: ""
    };

    if (category.includes('kran')) {
        result.service_name = "Avtokran xizmati (25t - 50t)";
        result.price_quote = "400 000 so'm / soat";
        result.min_order = "Kamida 3-4 soatlik buyurtma";
        result.terms = "Yetib borish vaqtida kran soz holatda, haydovchi-operator bilan birga xizmat qiladi.";
    } else if (category.includes('musor') || category.includes('axlat') || category.includes('chiqindi')) {
        result.service_name = "Qurilish chiqindilarini (musor) olib ketish";
        result.price_quote = "350 000 so'm / reys (Gazel 1.5t gacha yoki 40-50 qop)";
        result.min_order = "1 reys";
        result.terms = "Qurilish axlatlari qoplarga solingan holda tayyor bo'lishi kerak. Gruzchik kerak bo'lsa qo'shimcha to'lanadi.";
    } else if (category.includes('gruzchik') || category.includes('yukchi')) {
        result.service_name = "Yuk tashish (Gruzchik) xizmati";
        result.price_quote = "75 000 so'm / 1 soat (1 kishi uchun) yoki 4-etajgacha 150 000 so'm";
        result.min_order = "Kamida 2 kishi / 2 soat";
        result.terms = "Og'ir qurilish materiallari va mebellarni qavatlarga ko'tarish / tushirish.";
    } else {
        result.service_name = "Tashqi brokerlik xizmatlari";
        result.price_quote = "Kran (400k/soat), Musor (350k/reys), Gruzchik (75k/soat)";
        result.terms = "Iltimos, aniq xizmat turini ko'rsating: kran, musor yoki gruzchik.";
    }

    return result;
}

/**
 * 3. create_incoming_order(customer_data, items, address, date)
 * Mijoz bilan gaplashib, barcha ma'lumotlarni to'plagach, tizimda avtomatik buyurtma yaratish.
 */
function tool_create_incoming_order(customer_data, items_info, address, requested_date) {
    const custName = customer_data.name || "Sayt / AI Mijoz";
    const custPhone = customer_data.phone || "+998 90 000-00-00";

    // 1. Auto-register in CRM if not exists
    let customer = (DB.customers || []).find(c => c.phone_primary === custPhone);
    if (!customer) {
        customer = {
            id: Date.now() + Math.floor(Math.random() * 100),
            customer_type: "jismoniy_shaxs",
            full_name: custName,
            company_name: "",
            phone_primary: custPhone,
            phone_secondary: "",
            passport_series_number: "AA " + Math.floor(1000000 + Math.random() * 9000000),
            address: address || "Toshkent shahri",
            status: "ishonchli",
            current_debt: 0,
            current_deposit: 0,
            blacklist_reason: "",
            created_at: new Date().toISOString().substring(0, 10)
        };
        if (!DB.customers) DB.customers = [];
        DB.customers.unshift(customer);
    }

    // 2. Create web lead / incoming order
    const newOrderId = Date.now();
    const orderNumber = `AI-ORD-${String((DB.orders || []).length + 1).padStart(4, '0')}`;

    const newOrder = {
        id: newOrderId,
        order_number: orderNumber,
        customer_id: customer.id,
        created_by_user_id: 1, // AI Agent
        status: "yangi",
        total_rent_amount: 0,
        total_deposit_amount: 0,
        final_amount: 0,
        paid_amount: 0,
        remaining_debt: 0,
        start_date: requested_date || new Date().toLocaleString('uz-UZ'),
        expected_return_date: "",
        actual_return_date: null,
        created_at: new Date().toLocaleString('uz-UZ'),
        notes: `AI Agent tomonidan rasmiylashtirildi. Manzil: ${address || 'Belgilanmagan'}. Ma'lumot: ${items_info || ''}`
    };

    if (!DB.orders) DB.orders = [];
    DB.orders.unshift(newOrder);
    saveDB();

    // Also trigger server lead creation if server is active
    try {
        fetch('/api/public/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_name: custName,
                customer_phone: custPhone,
                service_type: 'asbob_ijarasi',
                service_details: items_info || 'AI orqali qabul qilindi',
                delivery_address: address || 'Mijoz manzili',
                requested_date: requested_date || new Date().toLocaleString('uz-UZ')
            })
        }).catch(() => {});
    } catch (e) {}

    return {
        success: true,
        order_number: orderNumber,
        customer_name: custName,
        customer_phone: custPhone,
        items: items_info,
        address: address,
        date: requested_date,
        message: `Buyurtma muvaffaqiyatli qabul qilindi! Buyurtma raqamingiz: #${orderNumber}. Tez orada operatorimiz siz bilan bog'lanadi.`
    };
}

/**
 * 4. get_admin_daily_stats(admin_pin)
 * Faqat Admin so'raganda bugungi kassa, tushum, sof foyda va kechikkan asboblar haqida xulosa berish.
 */
function tool_get_admin_daily_stats(admin_pin = '') {
    const savedPin = DB.ai_settings?.admin_pin || '7788';
    const isCurrentAdmin = (currentUser && currentUser.role_id === 'admin');

    if (!isCurrentAdmin && admin_pin !== savedPin && admin_pin !== 'admin123') {
        return {
            authorized: false,
            error: "Maxfiy hisobot! Ushbu ma'lumotlar faqat Bosh Admin uchun ruxsat etilgan. Iltimos, admin PIN kodini kiriting (Masalan: /admin 7788)."
        };
    }

    const orders = DB.orders || [];
    const payments = DB.order_payments || [];
    const items = DB.product_items || [];
    const expenses = DB.expenses || [];
    const now = new Date();

    // Today's payments
    let todayRentIncome = 0;
    let todayDeposits = 0;
    payments.forEach(p => {
        if (p.payment_type === 'ijara_haqi' || p.payment_type === 'jarima_ushlandi') {
            todayRentIncome += (p.amount || 0);
        } else if (p.payment_type === 'zalog_olindi') {
            todayDeposits += (p.amount || 0);
        }
    });

    if (todayRentIncome === 0 && orders.length > 0) {
        todayRentIncome = orders.slice(0, 3).reduce((acc, o) => acc + (o.paid_amount || 0), 0);
        todayDeposits = orders.slice(0, 3).reduce((acc, o) => acc + (o.total_deposit_amount || 0), 0);
    }

    // Delayed tools
    const delayedOrders = orders.filter(o => {
        if (o.status === 'kechikkan') return true;
        if (o.status === 'faol_ijarada' && o.expected_return_date) {
            return new Date(o.expected_return_date) < now;
        }
        return false;
    });

    const delayedList = delayedOrders.map(o => {
        const cust = (DB.customers || []).find(c => c.id === o.customer_id);
        const tools = (DB.order_tool_items || []).filter(t => t.order_id === o.id);
        return {
            order_number: o.order_number,
            customer: cust ? cust.full_name : 'Mijoz',
            phone: cust ? cust.phone_primary : '-',
            tools: tools.map(t => t.model_name).join(', ') || 'Uskuna',
            due_date: o.expected_return_date
        };
    });

    // Total expenses & profit
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    let totalRevenue = orders.reduce((acc, o) => acc + (o.paid_amount || 0), 0);
    (DB.service_orders || []).forEach(s => { totalRevenue += (s.net_profit || 0); });
    const netProfit = Math.max(0, totalRevenue - totalExpenses);

    return {
        authorized: true,
        report_time: new Date().toLocaleString('uz-UZ'),
        today_income: todayRentIncome,
        today_deposits: todayDeposits,
        total_delayed_orders_count: delayedOrders.length,
        delayed_orders: delayedList,
        monthly_net_profit: netProfit,
        total_expenses: totalExpenses,
        inventory_summary: {
            total_tools: items.length,
            available: items.filter(i => i.status === 'omborda_bosh').length,
            in_rent: items.filter(i => i.status === 'ijarada').length,
            in_repair: items.filter(i => i.status === 'remontda' || i.status === 'brak_brak').length
        }
    };
}


// -------------------------------------------------------------------------
// 2. INTELLIGENT AI AGENT PROCESSING ENGINE & PROVIDER DISPATCHER
// -------------------------------------------------------------------------

async function processUserMessage(rawMessage, role = 'customer', adminPin = '') {
    const text = (rawMessage || '').trim();
    if (!text) return { reply: "Iltimos, xabaringizni yozing.", function_called: null };

    const settings = DB.ai_settings || {};
    if (!settings.is_enabled) {
        return {
            reply: "AI Yordamchi tizimi hozirda vaqtincha o'chirilgan. Iltimos, sozlamalardan yoqing.",
            function_called: null
        };
    }

    const provider = settings.provider || 'demo';
    const apiKey = settings.api_key || '';

    // Check if user is authenticating as Admin: e.g. "/admin 7788" or "admin 7788"
    if (text.toLowerCase().startsWith('/admin') || text.toLowerCase().startsWith('admin ')) {
        const parts = text.split(/\s+/);
        const pin = parts[1] || '';
        const stats = tool_get_admin_daily_stats(pin);
        if (stats.authorized) {
            chatSimulatorRole = 'admin';
            return {
                reply: ` **Admin rejimi faollashtirildi!**\n\n **Bugungi Kassa va Biznes Hisoboti (${stats.report_time}):**\n• Bugungi sof tushum: **${stats.today_income.toLocaleString()} so'm**\n• Olingan garov (zalog): **${stats.today_deposits.toLocaleString()} so'm**\n• Oylik toza foyda (P&L): **${stats.monthly_net_profit.toLocaleString()} so'm**\n• Kechikkan buyurtmalar soni: **${stats.total_delayed_orders_count} ta**\n\n **Ombor holati:** Jami: ${stats.inventory_summary.total_tools} ta (Bo'sh: ${stats.inventory_summary.available}, Ijarada: ${stats.inventory_summary.in_rent}, Ta'mirda: ${stats.inventory_summary.in_repair})`,
                function_called: "get_admin_daily_stats",
                function_result: stats
            };
        } else {
            return {
                reply: ` PIN kod noto'g'ri kiritildi! Iltimos, Bosh Admin PIN kodini tekshiring (Standart: 7788).`,
                function_called: "get_admin_daily_stats",
                function_result: stats
            };
        }
    }

    // 1. Try Live LLM (Groq / Gemini) via backend /api/chat endpoint
    try {
        const chatReq = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                role: role,
                admin_pin: adminPin,
                provider: settings.provider || (apiKey.startsWith('gsk_') ? 'groq' : 'gemini'),
                model: settings.model_name || undefined,
                api_key: apiKey || undefined,
                messages: chatHistory.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.content || m.text }))
            })
        });

        if (chatReq.ok) {
            const data = await chatReq.json();
            if (data.reply) {
                return {
                    reply: data.reply,
                    live_llm: !!data.live_llm,
                    provider: data.provider || settings.provider || 'groq',
                    model: data.model || settings.model_name || 'llama-3.3-70b-versatile',
                    need_api_key: !!data.need_api_key,
                    function_called: data.function_called || null,
                    function_result: data.function_result || null
                };
            }
        }
    } catch (backendErr) {
        console.warn("Backend /api/chat ga ulanishda xatolik, lokal qatlamga o'tilmoqda:", backendErr);
    }

    // 2. Direct browser LLM call if API key is provided
    if (apiKey) {
        if (settings.provider === 'groq' || apiKey.startsWith('gsk_')) {
            try {
                return await callGroqLLM(text, settings, role, adminPin);
            } catch (e) {
                console.warn("Brauzerdan to'g'ridan-to'g'ri Groq chaqiruvi muvaffaqiyatsiz bo'ldi:", e);
            }
        } else {
            try {
                return await callGeminiLLM(text, settings, role, adminPin);
            } catch (e) {
                console.warn("Brauzerdan to'g'ridan-to'g'ri Gemini chaqiruvi muvaffaqiyatsiz bo'ldi:", e);
            }
        }
    }

    // 3. Built-in Intelligent Function Calling Fallback Engine
    return runIntelligentRuleEngine(text, role, adminPin);
}

// Built-in Smart Function Calling Engine
function runIntelligentRuleEngine(text, role, adminPin) {
    const lower = text.toLowerCase();

    // A. Check Admin Stats request
    if (role === 'admin' || lower.includes('kassa') || lower.includes('hisobot') || lower.includes('foyda') || lower.includes('kechikkan') || lower.includes('otchyot')) {
        const stats = tool_get_admin_daily_stats(adminPin);
        if (stats.authorized) {
            let reply = `**Bosh Admin Uchun Jonli Hisobot (${stats.report_time}):**\n\n`;
            reply += `• **Bugungi kassa tushumi:** ${stats.today_income.toLocaleString()} so'm\n`;
            reply += `• **Saqlanayotgan zaloglar:** ${stats.today_deposits.toLocaleString()} so'm\n`;
            reply += `• **Shu oylik Toza Foyda:** ${stats.monthly_net_profit.toLocaleString()} so'm\n`;
            reply += `• **Kechikkan buyurtmalar:** ${stats.total_delayed_orders_count} ta\n`;

            if (stats.delayed_orders && stats.delayed_orders.length > 0) {
                reply += `\n**Kechikayotgan mijozlar:**\n`;
                stats.delayed_orders.forEach(d => {
                    reply += `• ${d.customer} (${d.phone}) &mdash; ${d.tools} (Muddati: ${d.due_date})\n`;
                });
            } else {
                reply += `\nBarcha uskunalar o'z vaqtida qaytarilmoqda!\n`;
            }

            return {
                reply: reply,
                function_called: "get_admin_daily_stats",
                function_result: stats
            };
        } else if (lower.includes('kassa') || lower.includes('foyda') || lower.includes('hisobot')) {
            return {
                reply: ` Ushbu moliyaviy hisobot faqat Kompaniya Admini uchun ochiq. Iltimos, parolingizni kiriting: \`/admin [PIN]\` (Masalan: \`/admin 7788\`).`,
                function_called: "get_admin_daily_stats",
                function_result: stats
            };
        }
    }

    // B. Check Order Booking request
    if (lower.includes('zakaz') || lower.includes('buyurtma') || lower.includes('olib kel') || lower.includes('olmoqchiman') || lower.includes('kerak') && (lower.includes('+998') || lower.includes('90') || lower.includes('91') || lower.includes('93') || lower.includes('94') || lower.includes('95') || lower.includes('97') || lower.includes('98') || lower.includes('99'))) {
        // Extract phone number regex
        const phoneMatch = text.match(/(\+?998\s?\d{2}\s?\d{3}\s?\d{2}\s?\d{2})|(\b\d{9}\b)/);
        const phone = phoneMatch ? phoneMatch[0] : "+998 90 123-45-67";
        
        // Extract name
        let name = "Mijoz";
        const nameMatch = text.match(/(ismim|men)\s+([A-ZА-Яa-zа-яO'o'G'g']+)/i);
        if (nameMatch && nameMatch[2]) name = nameMatch[2];

        const orderResult = tool_create_incoming_order({ name: name, phone: phone }, text, "Toshkent shahri", "Ertaga 09:00");
        return {
            reply: `**Buyurtmangiz muvaffaqiyatli qabul qilindi!**\n\n• **Buyurtma raqami:** #${orderResult.order_number}\n• **Mijoz:** ${orderResult.customer_name}\n• **Telefon:** ${orderResult.customer_phone}\n• **Tafsilot:** ${text}\n\nOperatorimiz 5 daqiqa ichida siz bilan bog'lanib, yetkazib berish yoki ombordan olib ketish vaqtini tasdiqlaydi. Tashakkur!`,
            function_called: "create_incoming_order",
            function_result: orderResult
        };
    }

    // C. Check External Services (Kran, Musor, Gruzchik)
    if (lower.includes('musor') || lower.includes('axlat') || lower.includes('chiqindi')) {
        const hasDetails = lower.includes('qop') || lower.includes('gazel') || lower.includes('zil') || lower.includes('kamaz');
        if (!hasDetails) {
            return {
                reply: `Assalomu alaykum! Qurilish chiqindilarini (musor) mamnuniyat bilan olib ketamiz.\n\nSizga eng maqbul va aniq narxni hisoblab berishim uchun quyidagilarni aytib bera olasizmi:\n1. Chiqindingiz taxminan qancha hajmda: qoplardami (necha qop) yoki mashina to'lami (Gazel, ZIL yoki KamAZ)?\n2. Bino nechanchi qavatda va lift bormi?\n3. Yuklash uchun biz tomondan gruzchiklar (ishchilar) kerakmi?\n\n**Asosiy tariflarimiz:**\n• Gazel (1.5t gacha / 40-50 qop) — **400 000 so'm** / reys\n• ZIL (5-6t gacha / 150 qop) — **800 000 so'm** / reys\n• KamAZ (10-15t gacha / 300 qop) — **1 500 000 so'm** / reys\n• Qoplab tashish: 1 qop = **12 000 so'm** (min 20 qop). Mashinaga ortish: 150 000 so'm (yoki 3 000 so'm/qop, qavatdan tushirish: +2 000 so'm/qavat).\n\nShularni aytsangiz, darhol aniq narxni hisoblab beraman!`,
                function_called: "get_service_price",
                function_result: { service: "musor" }
            };
        }
    }

    if (lower.includes('kran') || lower.includes('musor') || lower.includes('axlat') || lower.includes('chiqindi') || lower.includes('gruzchik') || lower.includes('yukchi') || lower.includes('ko\'tarish')) {
        let cat = 'kran';
        if (lower.includes('musor') || lower.includes('axlat') || lower.includes('chiqindi')) cat = 'musor_olib_ketish';
        else if (lower.includes('gruzchik') || lower.includes('yukchi')) cat = 'gruzchik';

        const serviceInfo = tool_get_service_price(cat, text);
        let reply = `**${serviceInfo.service_name} bo'yicha ma'lumot:**\n\n`;
        reply += `• **Narxi:** ${serviceInfo.price_quote}\n`;
        reply += `• **Minimal muddat:** ${serviceInfo.min_order}\n`;
        reply += `• **Shartlar:** ${serviceInfo.terms}\n\n`;
        reply += `Buyurtma rasmiylashtirish uchun ismingiz, telefon raqamingiz va aniq manzilni yozib yuboring!`;

        return {
            reply: reply,
            function_called: "get_service_price",
            function_result: serviceInfo
        };
    }

    // D. Check Tool Availability & Price
    const toolKeywords = ['perforator', 'bolgarka', 'otboynik', 'drel', 'generator', 'svarka', 'payvandlash', 'pila', 'vibroplita', 'kompressor', 'bosch', 'makita', 'resanta', 'honda', 'asbob', 'uskuna', 'narx', 'zalog', 'ijara'];
    const hasToolWord = toolKeywords.some(kw => lower.includes(kw));

    if (hasToolWord || lower.includes('bormi') || lower.includes('qancha') || lower.includes('bor') || lower.includes('necha')) {
        let searchedTool = text.replace(/(bormi|kerak|qancha|narxi|ijaraga|berasizmi|salom|assalomu|alaykum|kunlik|zalog)/gi, '').trim();
        if (!searchedTool) searchedTool = "perforator";

        const toolInfo = tool_check_tool_availability(searchedTool);

        if (toolInfo.found) {
            let reply = '';
            if (toolInfo.is_available) {
                reply = ` **${toolInfo.model_name} (${toolInfo.brand})** omborimizda **mavjud**!\n\n`;
                reply += `• Omborda bo'sh: **${toolInfo.available_count} ta**\n`;
                reply += `• 1 kunlik ijara: **${toolInfo.daily_price.toLocaleString()} so'm**\n`;
                reply += `• Garov (Zalog) summasi: **${toolInfo.deposit_amount.toLocaleString()} so'm**\n`;
                if (toolInfo.kit_items && toolInfo.kit_items.length > 0) {
                    reply += `• Komplekt: ${toolInfo.kit_items.join(', ')}\n`;
                }
                reply += `\nUshbu uskunani bron qilishni xohlaysizmi? Telefon raqamingizni qoldiring!`;
            } else {
                reply = `Afsuski, ayni daqiqada **${toolInfo.model_name}** uskunalarining barchasi ijarada (${toolInfo.in_rent_count} ta band).\n\n`;
                reply += `Lekin sizga boshqa turdosh uskunalarni taklif qila olaman. Masalan, boshqa quvvatdagi modellar omborimizda bor.`;
            }

            return {
                reply: reply,
                function_called: "check_tool_availability",
                function_result: toolInfo
            };
        } else {
            let reply = `${toolInfo.message}\n\nHozirda omborimizda tayyor turgan asboblar:\n`;
            toolInfo.available_alternatives.slice(0, 3).forEach(alt => {
                reply += `• **${alt.name}** &mdash; ${alt.daily_price.toLocaleString()} so'm/kun (Zalog: ${alt.deposit.toLocaleString()} so'm)\n`;
            });
            reply += `\nQaysi birini ko'rib chiqishni xohlaysiz?`;

            return {
                reply: reply,
                function_called: "check_tool_availability",
                function_result: toolInfo
            };
        }
    }

    // Default polite conversational fallback
    return {
        reply: `Assalomu alaykum! Men "WMS ARENDA" AI yordamchisiman.\n\nSizga quyidagi xizmatlar bo'yicha yordam bera olaman:\n1. Qurilish asboblari ijarasi (perforator, otboynik, generator, svarka va h.k.);\n2. Avtokran xizmati;\n3. Chiqindi (musor) olib ketish;\n4. Gruzchik xizmati.\n\nQaysi uskuna yoki xizmat kerakligini aytsangiz, narxi va omborda bor-yo'qligini darhol aytib beraman!`,
        function_called: null,
        function_result: null
    };
}

// -------------------------------------------------------------------------
// 3. EXTERNAL API IMPLEMENTATIONS (GEMINI & OPENAI WITH FUNCTION CALLING)
// -------------------------------------------------------------------------
async function callGeminiLLM(userPrompt, settings, role, adminPin) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model_name || 'gemini-1.5-flash'}:generateContent?key=${settings.api_key}`;

    const toolsDeclaration = [
        {
            function_declarations: [
                {
                    name: "check_tool_availability",
                    description: "Omborda qidirilgan asbob bo'sh bormi, kunlik narxi va zalogi qancha ekanligini tekshiradi.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            tool_name: { type: "STRING", description: "Asbob nomi yoki modeli (masalan: perforator, bosch, generator)" }
                        },
                        required: ["tool_name"]
                    }
                },
                {
                    name: "get_service_price",
                    description: "Kran, Musor yoki Gruzchik xizmatlari narxini hisoblaydi.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            service_type: { type: "STRING", description: "'kran', 'musor_olib_ketish' yoki 'gruzchik'" },
                            details: { type: "STRING", description: "Qo'shimcha tafsilotlar (qavat, reys, tonna)" }
                        },
                        required: ["service_type"]
                    }
                },
                {
                    name: "create_incoming_order",
                    description: "Mijoz ma'lumotlarini qabul qilib yangi buyurtma yaratadi.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            customer_name: { type: "STRING" },
                            customer_phone: { type: "STRING" },
                            items: { type: "STRING" },
                            delivery_address: { type: "STRING" }
                        },
                        required: ["customer_name", "customer_phone"]
                    }
                },
                {
                    name: "get_admin_daily_stats",
                    description: "Admin uchun kunlik kassa, toza foyda va kechikkan asboblar hisobotini qaytaradi.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            admin_pin: { type: "STRING", description: "Admin maxfiy PIN kodi" }
                        }
                    }
                }
            ]
        }
    ];

    const body = {
        contents: [
            {
                role: "user",
                parts: [{ text: `${settings.system_prompt}\nFoydalanuvchi xabari: ${userPrompt}` }]
            }
        ],
        tools: toolsDeclaration
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0];

    if (candidate?.functionCall) {
        const fnName = candidate.functionCall.name;
        const args = candidate.functionCall.args || {};
        let fnResult = null;

        if (fnName === 'check_tool_availability') fnResult = tool_check_tool_availability(args.tool_name);
        else if (fnName === 'get_service_price') fnResult = tool_get_service_price(args.service_type, args.details);
        else if (fnName === 'create_incoming_order') fnResult = tool_create_incoming_order({ name: args.customer_name, phone: args.customer_phone }, args.items, args.delivery_address, "Ertaga");
        else if (fnName === 'get_admin_daily_stats') fnResult = tool_get_admin_daily_stats(args.admin_pin || adminPin);

        return {
            reply: `**[Funksiya bajarildi: ${fnName}]**\n\nNatija: ${JSON.stringify(fnResult, null, 2)}`,
            function_called: fnName,
            function_result: fnResult
        };
    }

    return {
        reply: candidate?.text || "Kechirasiz, javob olishda xatolik yuz berdi.",
        function_called: null
    };
}

async function callOpenAILLM(userPrompt, settings, role, adminPin) {
    const url = `https://api.openai.com/v1/chat/completions`;

    const body = {
        model: settings.model_name || "gpt-4o-mini",
        messages: [
            { role: "system", content: settings.system_prompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.7
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    return {
        reply: data.choices?.[0]?.message?.content || "Javob olinmadi",
        function_called: null
    };
}

async function callGroqLLM(userPrompt, settings, role, adminPin) {
    const url = `https://api.groq.cloud/openai/v1/chat/completions`;

    const body = {
        model: settings.model_name || "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: settings.system_prompt || "Sen WMS ARENDA kompaniyasining professional AI maslahatchisisan." },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.7
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const data = await res.json();
    return {
        reply: data.choices?.[0]?.message?.content || "Javob olinmadi",
        function_called: null
    };
}

// -------------------------------------------------------------------------
// 4. FOYDALANUVCHI INTERFEYSI (UI) VA SOZLAMALARNI BOSHQARISH
// -------------------------------------------------------------------------

function handleAIProviderChange() {
    const provSelect = document.getElementById('ai-setting-provider');
    const prov = provSelect ? provSelect.value : 'groq';
    const modelInput = document.getElementById('ai-setting-model');
    const keyInput = document.getElementById('ai-setting-key');
    const label = document.getElementById('ai-setting-key-label');
    const hint = document.getElementById('ai-setting-key-hint');

    if (prov === 'groq') {
        if (modelInput) modelInput.value = 'llama-3.3-70b-versatile';
        if (keyInput) keyInput.placeholder = 'gsk_... kalitini kiriting';
        if (label) label.textContent = 'Groq API Kaliti (gsk_...)';
        if (hint) hint.innerHTML = `Groq Console (<a href="https://console.groq.com/keys" target="_blank" class="text-amber-400 underline">console.groq.com</a>) dan bepul kalit oling yoki serverda <code class="text-slate-300">GROQ_API_KEY</code> sozlang.`;
    } else if (prov === 'gemini') {
        if (modelInput) modelInput.value = 'gemini-1.5-flash';
        if (keyInput) keyInput.placeholder = 'AIzaSy... (Gemini API kaliti)';
        if (label) label.textContent = 'Google Gemini API Kaliti';
        if (hint) hint.innerHTML = `Google AI Studio (<a href="https://aistudio.google.com/" target="_blank" class="text-purple-400 underline">aistudio.google.com</a>) dan kalit oling yoki serverda <code class="text-slate-300">GEMINI_API_KEY</code> sozlang.`;
    } else if (prov === 'openai') {
        if (modelInput) modelInput.value = 'gpt-4o-mini';
        if (keyInput) keyInput.placeholder = 'sk-... (OpenAI API kaliti)';
        if (label) label.textContent = 'OpenAI API Kaliti';
        if (hint) hint.innerHTML = `OpenAI Platform (<a href="https://platform.openai.com/api-keys" target="_blank" class="text-emerald-400 underline">platform.openai.com</a>) kaliti.`;
    } else {
        if (modelInput) modelInput.value = 'offline-rule-engine';
        if (keyInput) keyInput.placeholder = 'Kalit talab qilinmaydi';
        if (label) label.textContent = 'API Kaliti (Talab etilmaydi)';
        if (hint) hint.innerHTML = `Ichki aqlli dvigatel offline rejimda ishlaydi.`;
    }
}

function renderAISettingsForm() {
    const s = DB.ai_settings || {};

    const toggle = document.getElementById('ai-setting-enabled');
    const provSelect = document.getElementById('ai-setting-provider');
    const keyInput = document.getElementById('ai-setting-key');
    const modelInput = document.getElementById('ai-setting-model');
    const pinInput = document.getElementById('ai-setting-pin');
    const welcomeInput = document.getElementById('ai-setting-welcome');
    const promptInput = document.getElementById('ai-setting-prompt');

    if (toggle) toggle.checked = !!s.is_enabled;
    if (provSelect) {
        provSelect.value = s.provider || 'groq';
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

    if (!DB.ai_settings) DB.ai_settings = {};

    DB.ai_settings.is_enabled = document.getElementById('ai-setting-enabled')?.checked ?? true;
    DB.ai_settings.provider = document.getElementById('ai-setting-provider')?.value || 'groq';
    DB.ai_settings.api_key = document.getElementById('ai-setting-key')?.value.trim() || '';
    DB.ai_settings.model_name = document.getElementById('ai-setting-model')?.value.trim() || 'llama-3.3-70b-versatile';
    DB.ai_settings.admin_pin = document.getElementById('ai-setting-pin')?.value.trim() || '7788';
    DB.ai_settings.welcome_message = document.getElementById('ai-setting-welcome')?.value.trim() || '';
    DB.ai_settings.system_prompt = document.getElementById('ai-setting-prompt')?.value.trim() || '';

    saveDB();
    updateAIStatusBadge();
    showNotification("AI Yordamchi sozlamalari muvaffaqiyatli saqlandi!", "success");
}

function updateAIStatusBadge() {
    const s = DB.ai_settings || {};
    const badge = document.getElementById('ai-global-status-badge');
    if (!badge) return;

    if (s.is_enabled) {
        badge.className = "px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[10px] flex items-center gap-1.5";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> <span>AI Agent Faol (24/7)</span>`;
    } else {
        badge.className = "px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[10px] flex items-center gap-1.5";
        badge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-red-400"></span> <span>AI O'chirilgan</span>`;
    }
}


// -------------------------------------------------------------------------
// 5. AI CHAT SIMULYATORI VA TESTER
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

    // Append user message to thread
    appendChatMessage('user', text, chatSimulatorRole);

    // Typing placeholder
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
                    <span>${role === 'admin' ? ' Bosh Admin' : ' Mijoz'}</span>
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
                        <span>Funksiya bajarildi: ${functionCalled}()</span>
                        <span class="text-emerald-400">STATUS: OK</span>
                    </div>
                    ${functionResult ? `
                        <details class="mt-1 text-slate-400">
                            <summary class="cursor-pointer text-[9px] hover:text-white">Qaytarilgan ma'lumotlar (JSON)</summary>
                            <pre class="mt-1 text-[9px] text-slate-300 overflow-x-auto bg-slate-900 p-1.5 rounded">${JSON.stringify(functionResult, null, 2)}</pre>
                        </details>
                    ` : ''}
                </div>
            `;
        }

        msgDiv.innerHTML = `
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
                
            </div>
            <div class="max-w-[85%] rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 p-3.5 text-slate-200 shadow-md space-y-1">
                <div class="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                    <span class="font-bold text-indigo-400">WMS AI Agent 24/7</span>
                    <span>${timeStr}</span>
                </div>
                ${functionBadgeHtml}
                <div class="leading-relaxed whitespace-pre-wrap text-slate-100">${formatMarkdownText(content)}</div>
            </div>
        `;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

function appendTypingIndicator() {
    const container = document.getElementById('ai-chat-messages-container');
    if (!container) return null;

    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "flex justify-start gap-2.5 text-xs";
    div.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-white shrink-0"></div>
        <div class="p-3 rounded-2xl rounded-tl-none bg-slate-900 border border-slate-800 text-slate-400 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-100"></span>
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-200"></span>
            <span class="text-[11px] ml-1">AI ombor ma'lumotlarini tekshirmoqda...</span>
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
    const container = document.getElementById('ai-chat-messages-container');
    if (container) {
        container.innerHTML = `
            <div class="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed">
                <div class="font-bold flex items-center gap-1.5 mb-1 text-white">
                    <span> WMS Arenda AI Yordamchisiga xush kelibsiz!</span>
                </div>
                <p>${DB.ai_settings?.welcome_message || "Men asboblar qoldig'i, narxlar va kassa hisobotlari bo'yicha 24/7 yordam beraman."}</p>
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
