const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dbEngine = require('./db.js');
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const WEB_ORDERS_FILE = path.join(DATA_DIR, 'web_orders.json');

// Automatic memory and cache cleanup interval (runs every 30 minutes)
const CACHE_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
    try {
        const report = dbEngine.cleanupCache(500);
        console.log(`[Auto Cache Cleanup] Server cache and memory optimized at ${report.cleanedAt}. Memory: RSS ${(report.memoryAfter.rss / 1024 / 1024).toFixed(1)} MB, Heap ${(report.memoryAfter.heapUsed / 1024 / 1024).toFixed(1)} MB`);
    } catch (e) {
        console.error('[Auto Cache Cleanup] Error:', e.message);
    }
}, CACHE_CLEANUP_INTERVAL_MS);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
}

// Initial web orders from external website (0 in production)
const INITIAL_WEB_ORDERS = [];

function loadWebOrders() {
    try {
        if (fs.existsSync(WEB_ORDERS_FILE)) {
            const data = fs.readFileSync(WEB_ORDERS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {}
    saveWebOrders(INITIAL_WEB_ORDERS);
    return INITIAL_WEB_ORDERS;
}

function saveWebOrders(orders) {
    try {
        fs.writeFileSync(WEB_ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save web orders:', e);
    }
}

// Dynamic available tools catalog for public API
function getPublicAvailableTools(db) {
    if (!db) db = dbEngine.getEntireDB();
    const models = db.product_models || [];
    const items = db.product_items || db.tools || [];
    return models.map(m => {
        const mItems = items.filter(it => (it.model_id === m.id || it.product_model_id === m.id));
        const available = mItems.filter(it => it.status === 'omborda_bosh' || it.status === 'bosh' || it.status === 'mavjud');
        return {
            model_id: m.id,
            name: `${m.brand || ''} ${m.model_name || m.name}`.trim(),
            brand: m.brand || '',
            category: m.category_name || 'Asboblar',
            daily_price: m.daily_rental_price || m.daily_price || 0,
            hourly_price: Math.round((m.daily_rental_price || 100000) / 8),
            deposit_amount: m.base_deposit_amount || m.deposit_amount || 0,
            available_count: available.length,
            total_count: mItems.length,
            status: available.length > 0 ? "mavjud" : "mavjud_emas",
            specs: m.specs || {},
            kit_items: m.kit_items || []
        };
    }).filter(m => m.total_count > 0);
}
const PUBLIC_AVAILABLE_TOOLS = [];

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// =========================================================================
// REAL GOOGLE GEMINI 1.5 FLASH AI INTEGRATION
// =========================================================================
// REAL-TIME SYSTEM PROMPT GENERATOR FOR ERP COPILOT (BO'LIM 9)
// =========================================================================
function generateRealtimeSystemPrompt(db = {}) {
    const models = db.product_models || [];
    const items = db.product_items || [];
    const locations = db.warehouse_locations || [];
    
    // 1. Tool breakdown (Warehouse Stock)
    let availableCount = 0;
    let rentedCount = 0;
    const toolsList = [];
    items.forEach(it => {
        const m = models.find(x => x.id === it.product_model_id) || {};
        const loc = locations.find(l => l.id === it.warehouse_location_id);
        const locStr = loc ? `${loc.sector || loc.zone || 'Sektor'} - ${loc.shelf}` : 'Ombor';
        const isAvail = (it.status === 'omborda_bosh');
        if (isAvail) availableCount++;
        else if (it.status === 'ijarada') rentedCount++;
        toolsList.push(`• ${m.name || 'Asbob'} (SN: ${it.serial_number}) — Holati: ${isAvail ? 'BO\'SH (Omborda)' : it.status.toUpperCase()}, Polka: ${locStr}, Kunlik: ${(m.daily_price || 0).toLocaleString()} so'm, Zalog: ${(m.deposit_amount || 0).toLocaleString()} so'm`);
    });

    // 2. Active & Overdue orders
    const orders = db.orders || [];
    const activeOrders = orders.filter(o => o.status === 'faol_ijarada');
    const delayedOrders = orders.filter(o => o.status === 'kechikkan');
    const delayedList = delayedOrders.map(o => {
        const cust = (db.customers || []).find(c => c.id === o.customer_id);
        return `• #${o.order_number} — Mijoz: ${cust ? cust.full_name : 'Noma\'lum'} (${cust ? cust.phone_primary : ''}), Qaytarish sanasi: ${o.expected_return_date}, Garov zalog: ${(o.total_deposit_amount || 0).toLocaleString()} so'm`;
    });

    // 3. Service Partners (Kran, Musor, Gruzchik)
    const partners = db.service_partners || [];
    const partnerList = partners.map(p => {
        const statusStr = (p.is_available === false || p.status === 'band') ? '🔴 BAND' : '🟢 BO\'SH (Ishga tayyor)';
        const prices = (db.partner_price_list || []).filter(pr => pr.partner_id === p.id).map(pr => `${pr.service_type_detail}: ${pr.selling_price.toLocaleString()} so'm/${pr.unit}`).join(', ');
        return `• ${p.company_name} (${p.service_category.toUpperCase()}) — Holati: ${statusStr}, Tel: ${p.phone_primary}, Narxlar: [${prices || 'standart'}]`;
    });

    // 4. Cash, Deposits & Profit
    const registers = db.cash_registers || [];
    const cashTotal = registers.reduce((sum, r) => sum + (r.current_balance || 0), 0);
    const holdingDeposit = db.deposit_safe ? (db.deposit_safe.total_holding_deposit || 0) : 0;
    const expenses = (db.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    let totalRevenue = 0;
    orders.forEach(o => { totalRevenue += (o.paid_amount || 0); });
    const netProfit = Math.max(0, totalRevenue - expenses);

    return `Siz WMS ARENDA ERP tizimining professional AI Biznes Yordamchisisiz (ERP Copilot).
Siz korxona xodimlari (direktor, operatorlar, sotuvchilar, skladchilar) va mijozlar bilan insondek ravon, muloyim va professional tilda (O'zbek yoki Rus tillarida) gaplashasiz.
Siz bitta gapni yoki qotma shablonni takrorlamaysiz. Foydalanuvchi nima deb yozsa, o'shaning mag'zini chaqib, aniq, qisqa va faktlar asosida javob berasiz.

KOMPANIYANING AYNIDAMDAGI BARCHA REAL MA'LUMOTLARI (REAL-TIME DATA SNAPSHOT):

1. KASSA VA MOLIYA:
- Jami kassa qoldig'i: ${cashTotal.toLocaleString()} so'm
- Kassalar bo'yicha: ${registers.map(r => `${r.name}: ${(r.current_balance || 0).toLocaleString()} so'm`).join(', ')}
- Saqlanayotgan garov (zalog) depozitlari: ${holdingDeposit.toLocaleString()} so'm
- Jami ijara tushumi: ${totalRevenue.toLocaleString()} so'm, Jami chiqimlar: ${expenses.toLocaleString()} so'm
- Toza foyda: ${netProfit.toLocaleString()} so'm

2. OMBOR VA ASBOBLAR HOLATI:
- Jami uskunalar: ${items.length} ta (Bo'sh: ${availableCount} ta, Ijarada: ${rentedCount} ta)
${toolsList.length > 0 ? toolsList.join('\n') : '• Omborda hozircha ro\'yxatdan o\'tgan asboblar yo\'q (0 ta).'}

3. BUYURTMALAR VA KECHIKKANLAR:
- Faol ijaradagi buyurtmalar: ${activeOrders.length} ta
- Muddati o'tgan (kechikkan) buyurtmalar: ${delayedOrders.length} ta
${delayedList.length > 0 ? `Kechikkanlar ro'yxati:\n${delayedList.join('\n')}` : '• Hozirda birorta ham kechikkan buyurtma yo\'q, barchasi o\'z vaqtida.'}

4. TASHQI HAMKORLAR (KRAN, MUSOR, GRUZCHIK):
${partnerList.length > 0 ? partnerList.join('\n') : '• Hamkorlar: Avtokran (16t, 25t, 50t soatiga 300 000 - 600 000 so\'m), Musor (Gazel 400 000, ZIL 800 000, KamAZ 1 500 000 so\'m), Gruzchik (qopiga 1500 - 3000 so\'m, soatiga 50 000 so\'m).'}

BUYURTMA VA MULOQOT QOIDALARI:
- Agar foydalanuvchi "Manzil: Qoratosh 52" desa -> buni eslab qoling va samimiy davom ettiring: "Qoratosh 52 qabul qilindi. Qaysi asbob yoki xizmat kerak va qachonga?" deb suhbatni mantiqiy davom ettiring.
- Agar "Kassa qancha?" desa -> yuqoridagi real kassa qoldig'i (${cashTotal.toLocaleString()} so'm) va tafsilotlarini ayting.
- Agar "Kechikkanlar bormi?" desa -> yuqoridagi kechikkan buyurtmalar va mijozlar ro'yxatini ayting.
- Agar "Kran bormi?" desa -> qaysi kranlar bo'shligi va ularning stavkalarini tushuntiring.
- O'zbekcha so'ralsa o'zbekcha, ruscha so'ralsa ruscha javob bering.`;
}

function callGoogleGeminiAPI(apiKey, userMessage, conversationHistory = [], systemInstructionText = '') {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            return reject(new Error("API_KEY_REQUIRED"));
        }

        const contents = [];
        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.forEach(item => {
                const text = item.text || item.content || '';
                if (!text) return;
                const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'model';
                contents.push({ role, parts: [{ text }] });
            });
        }

        contents.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        const postData = JSON.stringify({
            system_instruction: {
                parts: [{ text: systemInstructionText || "Siz WMS ARENDA ERP Copilot yordamchisisiz." }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 1200
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let resBody = '';
            apiRes.on('data', chunk => { resBody += chunk; });
            apiRes.on('end', () => {
                if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(resBody);
                        const reply = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (reply) {
                            resolve(reply.trim());
                        } else {
                            resolve("Kechirasiz, javobni shakllantirib bo'lmadi.");
                        }
                    } catch (e) {
                        reject(new Error("Gemini javobini o'qishda xatolik: " + e.message));
                    }
                } else {
                    let errMsg = `Gemini API xatosi (${apiRes.statusCode})`;
                    try {
                        const errParsed = JSON.parse(resBody);
                        if (errParsed.error?.message) {
                            errMsg += `: ${errParsed.error.message}`;
                        }
                    } catch (e) {}
                    reject(new Error(errMsg));
                }
            });
        });

        apiReq.on('error', (err) => {
            reject(new Error("Tarmoq xatosi: " + err.message));
        });

        apiReq.setTimeout(25000, () => {
            apiReq.destroy();
            reject(new Error("Gemini API javob berish vaqti tugadi (Timeout)."));
        });

        apiReq.write(postData);
        apiReq.end();
    });
}

function callGroqAPI(apiKey, userMessage, conversationHistory = [], modelName = 'llama-3.3-70b-versatile', systemInstructionText = '') {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            return reject(new Error("GROQ_API_KEY_REQUIRED"));
        }

        const messages = [
            { role: 'system', content: systemInstructionText || "Siz WMS ARENDA ERP Copilot yordamchisisiz." }
        ];

        if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
            conversationHistory.forEach(item => {
                const text = item.text || item.content || '';
                if (!text) return;
                const role = (item.sender === 'user' || item.role === 'user') ? 'user' : 'assistant';
                messages.push({ role, content: text });
            });
        }

        messages.push({ role: 'user', content: userMessage });

        const postData = JSON.stringify({
            model: modelName || 'llama-3.3-70b-versatile',
            messages: messages,
            temperature: 0.6,
            max_tokens: 1200
        });

        const options = {
            hostname: 'api.groq.cloud',
            port: 443,
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const apiReq = https.request(options, (apiRes) => {
            let resBody = '';
            apiRes.on('data', chunk => { resBody += chunk; });
            apiRes.on('end', () => {
                if (apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(resBody);
                        const reply = parsed.choices?.[0]?.message?.content;
                        if (reply) {
                            resolve(reply.trim());
                        } else {
                            resolve("Kechirasiz, Groq javobini shakllantirib bo'lmadi.");
                        }
                    } catch (e) {
                        reject(new Error("Groq javobini o'qishda xatolik: " + e.message));
                    }
                } else {
                    let errMsg = `Groq API xatosi (${apiRes.statusCode})`;
                    try {
                        const errParsed = JSON.parse(resBody);
                        if (errParsed.error?.message) {
                            errMsg += `: ${errParsed.error.message}`;
                        }
                    } catch (e) {}
                    reject(new Error(errMsg));
                }
            });
        });

        apiReq.on('error', (err) => {
            reject(new Error("Tarmoq xatosi: " + err.message));
        });

        apiReq.setTimeout(25000, () => {
            apiReq.destroy();
            reject(new Error("Groq API javob berish vaqti tugadi (Timeout)."));
        });

        apiReq.write(postData);
        apiReq.end();
    });
}

function sendTelegramBotMessage(botToken, chatId, text, inlineKeyboard = null, replyKeyboard = null) {
    if (!botToken || !chatId) return Promise.resolve(null);
    return new Promise((resolve) => {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        };
        if (inlineKeyboard) {
            payload.reply_markup = { inline_keyboard: inlineKeyboard };
        } else if (replyKeyboard) {
            payload.reply_markup = { keyboard: replyKeyboard, resize_keyboard: true };
        }
        const postData = JSON.stringify(payload);
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', chunk => { resData += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(resData)); } catch(e) { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(8000, () => { req.destroy(); resolve(null); });
        req.write(postData);
        req.end();
    });
}

function getBotToken(db) {
    return process.env.TELEGRAM_BOT_TOKEN || 
           (db && db.ai_settings && db.ai_settings.telegram_bot_token) || 
           (db && db.system_settings && db.system_settings.telegram_bot_token) || 
           '';
}

// In-memory queue of live dispatcher events for real-time seller UI updates
const partnerLiveEvents = [];
function recordPartnerLiveEvent(event) {
    const ev = {
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('uz-UZ'),
        ...event
    };
    partnerLiveEvents.push(ev);
    if (partnerLiveEvents.length > 100) partnerLiveEvents.shift();
    return ev;
}

// =========================================================================
// SERVER-SIDE STATEFUL CONVERSATION SESSIONS (MULTI-TURN MEMORY)
// =========================================================================
const serverAISessions = new Map();
// Stateful wizard sessions for Telegram Seller order creation
const sellerWizardSessions = new Map();


function getServerSession(sessionId = 'default') {
    if (!serverAISessions.has(sessionId)) {
        serverAISessions.set(sessionId, {
            step: 'init',
            service_type: null,
            service_title: null,
            tool_id: null,
            estimated_price: 0,
            deposit_amount: 0,
            address: null,
            booking_time: null,
            phone: null
        });
    }
    return serverAISessions.get(sessionId);
}

function resetServerSession(sessionId = 'default') {
    serverAISessions.set(sessionId, {
        step: 'init',
        service_type: null,
        service_title: null,
        tool_id: null,
        estimated_price: 0,
        deposit_amount: 0,
        address: null,
        booking_time: null,
        phone: null
    });
    return serverAISessions.get(sessionId);
}

function extractServerPhoneNumber(text) {
    if (!text) return null;
    const cleanStr = text.replace(/[\s\-\(\)\.]/g, '');
    const fullMatch = cleanStr.match(/(?:\+?998)(9\d|88|33|77|95|99|97|98|94|93|91)\d{7}/);
    if (fullMatch) {
        const d = fullMatch[0].replace('+', '');
        return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10, 12)}`;
    }
    const shortMatch = cleanStr.match(/\b(9\d|88|33|77|95|99|97|98|94|93|91)\d{7}\b/);
    if (shortMatch) {
        const d = shortMatch[0];
        return `+998 ${d.slice(0, 2)} ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7, 9)}`;
    }
    const genericMatch = text.match(/(?:tel|telefon|raqam|phone)\s*:?\s*([+\d\s\-()]{7,18})/i);
    if (genericMatch && genericMatch[1]) {
        const d = genericMatch[1].replace(/[^\d+]/g, '');
        if (d.length >= 7) return d;
    }
    return null;
}

function extractServerBookingTime(text) {
    if (!text) return null;
    const explicitMatch = text.match(/(?:vaqti|vaqt|время)\s*:?\s*([^\n,;]+?(?=(?:manzil|tel|telefon|\+?998|$)))/i);
    if (explicitMatch && explicitMatch[1].trim().length > 2) return explicitMatch[1].trim();

    const timeMatch = text.match(/(?:ertaga|bugun|indin|завтра|сегодня|dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba)\s*(?:soat|v|k)?\s*\d{1,2}(?:[:.]\d{2})?\s*(?:da|ga|gacha)?/i)
                   || text.match(/soat\s*\d{1,2}(?:[:.]\d{2})?\s*(?:da|ga|gacha)?/i)
                   || text.match(/\b\d{1,2}[:.]\d{2}\s*(?:da|ga|gacha)?/i);
    if (timeMatch) return timeMatch[0].trim();
    return null;
}

function extractServerAddress(text) {
    if (!text) return null;
    const explicitMatch = text.match(/(?:manzil|manzili|адрес)\s*:?\s*([^\n,;]+?(?=(?:vaqti|vaqt|soat|tel|telefon|\+?998|$)))/i);
    if (explicitMatch && explicitMatch[1].trim().length > 2) return explicitMatch[1].trim();

    const lower = text.toLowerCase();
    const addressKeywords = ["ko'cha", "kucha", "uy", "kv", "kvartal", "mavze", "massiv", "prospekt", "qoratosh", "chilonzor", "yunusobod", "sergeli", "olmazor", "toshkent"];
    const hasKeyword = addressKeywords.some(w => lower.includes(w));
    const hasStreetAndNumber = /[a-zA-Zа-яА-Яo'O'g'G'\s]{3,}\s+\d+/.test(text) && !text.includes('+998');

    if (hasKeyword || hasStreetAndNumber) {
        let clean = text.replace(/^(manzil\s*:?|manzili\s*:?|адрес\s*:?)/i, '').trim();
        clean = clean.split(/(?:tel|phone|telefon|vaqt|vaqti|\+?998)/i)[0].trim();
        return clean.replace(/[,;]+$/, '').trim();
    }
    return null;
}

function detectServerService(text, db = null) {
    if (!text) return null;
    const lower = text.toLowerCase();

    // Check service partners from live DB
    const partners = (db && db.service_partners) ? db.service_partners : [];
    const priceList = (db && db.partner_price_list) ? db.partner_price_list : [];

    if (lower.includes('kran') || lower.includes('avtokran') || lower.includes('кран') || lower.includes('автокран')) {
        const kranPartner = partners.find(p => p.service_category === 'avtokran') || { company_name: "Toshkent Kran Servis", phone_primary: "+998 90 123-45-67", is_available: true };
        const statusText = kranPartner.is_available ? "🟢 Ayni paytda bo'sh" : "🔴 Hozir band";
        let title = "Avtokran xizmati (25t)";
        let quote = `🏗 Avtokran xizmati (${statusText}):\n• 16t kran: soatiga 300 000 so'm (minimal 2 soat)\n• 25t kran: soatiga 350 000 so'm (minimal 3 soat)\n• 50t kran: soatiga 600 000 so'm (minimal 4 soat)\nIjrochi: ${kranPartner.company_name} (${kranPartner.phone_primary})`;
        let estPrice = 1050000;
        if (lower.includes('16')) { title = "Avtokran 16t"; estPrice = 600000; }
        else if (lower.includes('50')) { title = "Avtokran 50t"; estPrice = 2400000; }
        return { service_type: 'kran', service_title: title, price_quote: quote, estimated_price: estPrice };
    }

    if (lower.includes('musor') || lower.includes('chiqindi') || lower.includes('axlat') || lower.includes('мусор') || lower.includes('отход')) {
        const musorPartner = partners.find(p => p.service_category === 'musor_tashish') || { company_name: "EcoChiqindi Trans", phone_primary: "+998 93 456-78-90", is_available: true };
        const statusText = musorPartner.is_available ? "🟢 Bo'sh, mashina tayyor" : "🔴 Hozir band";
        return {
            service_type: 'musor',
            service_title: "Qurilish chiqindilarini (musor) olib ketish",
            price_quote: `🚛 Qurilish chiqindilarini olib ketish (${statusText}):\n• Gazel (1.5t gacha): 400 000 so'm\n• ZIL (5t): 800 000 so'm\n• Qoplarda bo'lsa: donasi 12 000 so'mdan\nIjrochi: ${musorPartner.company_name} (${musorPartner.phone_primary})`,
            estimated_price: 400000
        };
    }

    if (lower.includes('gruzchik') || lower.includes('ishchi') || lower.includes('yukchi') || lower.includes('грузчик')) {
        const gruzPartner = partners.find(p => p.service_category === 'gruzchik') || { company_name: "Master Yukchilar Brigadasi", phone_primary: "+998 97 789-01-23", is_available: true };
        const statusText = gruzPartner.is_available ? "🟢 Brigada bo'sh" : "🔴 Band";
        return {
            service_type: 'gruzchik',
            service_title: "Yuk ko'taruvchilar (Gruzchik) xizmati",
            price_quote: `👷‍♂️ Yuk ko'taruvchilar (Gruzchik) xizmati (${statusText}):\n• 1 qop uchun: 1 qavatga 3 000 so'm (liftda 1 500 so'm)\n• Soatbay xizmat: 50 000 so'm/soat (minimal 2 soat)\nIjrochi: ${gruzPartner.company_name} (${gruzPartner.phone_primary})`,
            estimated_price: 150000
        };
    }

    // Dynamic Tools catalog lookup from live DB
    const models = (db && db.product_models) ? db.product_models : [];
    const items = (db && db.product_items) ? db.product_items : [];

    for (const m of models) {
        const mName = (m.model_name || '').toLowerCase();
        const mBrand = (m.brand || '').toLowerCase();
        const mCat = (m.category_name || '').toLowerCase();

        if (lower.includes(mName) || lower.includes(mBrand) || (mCat && lower.includes(mCat))) {
            const modelItems = items.filter(it => it.model_id === m.id);
            const availableItems = modelItems.filter(it => it.status === 'omborda_bosh');
            const availableCount = availableItems.length;
            const shelf = availableItems[0]?.warehouse_location_shelf || 'A-01';

            return {
                service_type: 'asbob',
                service_title: `${m.brand} ${m.model_name}`,
                tool_id: m.id,
                price_quote: `🛠 **${m.brand} ${m.model_name}**:\n• Kunlik ijara narxi: ${(m.daily_rental_price || 0).toLocaleString()} so'm\n• Garov depoziti (zalog): ${(m.base_deposit_amount || 0).toLocaleString()} so'm\n• Ombordagi holati: ${availableCount > 0 ? `🟢 ${availableCount} ta bo'sh (Polka: ${shelf})` : '🔴 Hozirda barchasi ijarada'}`,
                estimated_price: m.daily_rental_price || 0,
                deposit_amount: m.base_deposit_amount || 0
            };
        }
    }

    // Generic fallback for tools if DB is empty
    if (lower.includes('perforator') || lower.includes('otboynik') || lower.includes('generator') || lower.includes('bolgarka') || lower.includes('svarka')) {
        return {
            service_type: 'asbob',
            service_title: "Qurilish asbobi",
            price_quote: "🛠 Qurilish asbobi ijarasi: kunlik 120 000 - 300 000 so'm, garov zalogi 500 000 - 1 500 000 so'm. Aniq model bo'yicha ma'lumot berishim mumkin.",
            estimated_price: 150000,
            deposit_amount: 500000
        };
    }

    return null;
}

function generateSmartCopilotResponse(userMessage, conversationHistory = [], db = null, sessionId = 'default') {
    if (!db) {
        db = dbEngine.getEntireDB();
    }
    const raw = (userMessage || '').trim();
    const lower = raw.toLowerCase();
    const session = getServerSession(sessionId);

    // 1. Reset / restart conversation
    if (lower === 'bekor qilish' || lower === 'boshidan' || lower === 'yangi zakaz' || lower === 'yangi buyurtma' || lower === 'reset' || lower === 'отмена') {
        resetServerSession(sessionId);
        return {
            reply: "Suhbat yangilandi. Sizga qanday yordam kerak? Omborda nima bo'shligini bilish, kassa hisoboti yoki yangi buyurtma (Avtokran, Musor, Gruzchik, Asboblar) rasmiylashtirish?",
            step: 'init'
        };
    }

    // 2. Real-time Cash & Financial Report ("Kassa qancha?", "Bugungi tushum", "Moliya", "Foyda", "Hisobot")
    if (lower.includes('kassa') || lower.includes('hisobot') || lower.includes('moliya') || lower.includes('daromad') || lower.includes('foyda') || lower.includes('pul') || lower.includes('/admin')) {
        const registers = db.cash_registers || [];
        const cashTotal = registers.reduce((sum, r) => sum + (r.current_balance || 0), 0);
        const holdingDeposit = db.deposit_safe ? (db.deposit_safe.total_holding_deposit || 0) : 0;
        const expenses = (db.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
        const orders = db.orders || [];
        let totalRevenue = 0;
        orders.forEach(o => { totalRevenue += (o.paid_amount || 0); });
        const netProfit = Math.max(0, totalRevenue - expenses);
        const timeStr = new Date().toLocaleString('uz-UZ');

        const regBreakdown = registers.map(r => `  • ${r.name}: ${(r.current_balance || 0).toLocaleString()} so'm`).join('\n');

        return {
            reply: `📊 **Aynidamdagi Real Kassa va Moliya Holati (${timeStr}):**\n\n` +
                   `💰 **Jami kassa qoldig'i:** **${cashTotal.toLocaleString()} so'm**\n` +
                   (regBreakdown ? `${regBreakdown}\n` : '') +
                   `🛡 **Garov seyfidagi zaloglar:** ${holdingDeposit.toLocaleString()} so'm\n` +
                   `📈 **Jami ijara tushumi:** ${totalRevenue.toLocaleString()} so'm\n` +
                   `📉 **Jami xarajatlar:** ${expenses.toLocaleString()} so'm\n` +
                   `💵 **Toza foyda:** **${netProfit.toLocaleString()} so'm**\n\n` +
                   `Kassadagi barcha amallar SQLite bazasida to'liq saqlanmoqda.`,
            step: session.step
        };
    }

    // 3. Overdue & Debtor Orders ("Kechikkanlar bormi?", "Qarzlar", "Muddati o'tgan")
    if (lower.includes('kechikkan') || lower.includes('qarz') || lower.includes('muddati o\'tgan') || lower.includes('vozvrat')) {
        const orders = db.orders || [];
        const delayed = orders.filter(o => o.status === 'kechikkan');
        if (delayed.length === 0) {
            return {
                reply: "✅ **Hozirda birorta ham kechikkan buyurtma yo'q!**\nBarcha mijozlar asboblarni o'z vaqtida topshirishgan yoki buyurtmalar faol ijarada.",
                step: session.step
            };
        } else {
            const list = delayed.map(o => {
                const c = (db.customers || []).find(cust => cust.id === o.customer_id);
                return `• Buyurtma #${o.order_number}: Mijoz ${c ? c.full_name : 'Mijoz'} (${c ? c.phone_primary : ''}), Qaytarish sanasi: ${o.expected_return_date}, Garov: ${(o.total_deposit_amount || 0).toLocaleString()} so'm`;
            }).join('\n');
            return {
                reply: `⚠️ **Muddati o'tgan (kechikkan) buyurtmalar soni: ${delayed.length} ta:**\n\n${list}\n\nUshbu mijozlar bilan bog'lanib, asbobni qaytarishni so'rash tavsiya etiladi.`,
                step: session.step
            };
        }
    }

    // 4. Warehouse & Available Tools ("Omborda nima bo'sh?", "Asboblar", "Perforator bormi?")
    if (lower.includes('ombor') || lower.includes('qoldiq') || lower.includes('bo\'sh') || lower.includes('bosh') || lower.includes('uskuna') || lower.includes('polka')) {
        const models = db.product_models || [];
        const items = db.product_items || [];
        const availableItems = items.filter(i => i.status === 'omborda_bosh');
        const rentedItems = items.filter(i => i.status === 'ijarada');

        if (models.length === 0) {
            return {
                reply: "📦 Omborda ayni paytda kiritilgan asboblar mavjud emas (0 ta). Yangi asboblarni '1. Kirim Zanjiri' orqali kirim qilishingiz mumkin.",
                step: session.step
            };
        }

        const lines = models.slice(0, 6).map(m => {
            const mItems = items.filter(i => i.model_id === m.id);
            const free = mItems.filter(i => i.status === 'omborda_bosh');
            const shelf = free[0]?.warehouse_location_shelf || 'A-01';
            return `• **${m.brand} ${m.model_name}**: ${free.length} ta bo'sh (Polka: ${shelf}) | Ijara: ${(m.daily_rental_price || 0).toLocaleString()} so'm/kun`;
        });

        return {
            reply: `📦 **Ombor Qoldig'i Holati:**\n` +
                   `• Jami asboblar: ${items.length} ta\n` +
                   `• Bo'sh (ijaraga tayyor): **${availableItems.length} ta**\n` +
                   `• Ijarada yurgan: ${rentedItems.length} ta\n\n` +
                   `**Asosiy modellar:**\n${lines.join('\n')}\n\nQaysi asbob kerak bo'lsa nomini yozing, buyurtma ochib beraman.`,
            step: session.step
        };
    }

    // 5. Smart Parsing for Multi-turn Order Flow
    const phone = extractServerPhoneNumber(raw);
    const time = extractServerBookingTime(raw);
    const address = extractServerAddress(raw);
    const service = detectServerService(raw, db);

    if (service) {
        session.service_type = service.service_type;
        session.service_title = service.service_title;
        session.estimated_price = service.estimated_price;
        session.deposit_amount = service.deposit_amount || 0;
        session.tool_id = service.tool_id || null;
    }

    if (phone) session.phone = phone;
    if (time && session.step !== 'awaiting_address') session.booking_time = time;

    // STEP 4: Finalize order when phone is available
    if (session.step === 'awaiting_phone' || (phone && session.service_type && (session.address || address))) {
        if (phone) {
            session.phone = phone;
            if (!session.address && address) session.address = address;
            if (!session.booking_time) session.booking_time = time || "Bugun / Kelishilgan vaqtda";

            // Persist order directly into DB.orders & web orders
            const orders = db.orders || [];
            const orderNum = `ORD-${String(orders.length + 1).padStart(4, '0')}`;
            const newOrder = {
                id: Date.now(),
                order_number: orderNum,
                customer_name: "AI Buyurtmachi",
                customer_phone: session.phone,
                service_type: session.service_type || 'xizmat',
                service_details: session.service_title || 'Buyurtma',
                delivery_address: session.address || 'Toshkent shahri',
                requested_date: session.booking_time,
                status: "yangi",
                created_at: new Date().toLocaleString('uz-UZ'),
                source: "ai_copilot",
                total_rental_amount: session.estimated_price || 0,
                total_deposit_amount: session.deposit_amount || 0,
                paid_amount: 0
            };
            orders.unshift(newOrder);
            db.orders = orders;

            // Also register web orders
            const webOrders = loadWebOrders();
            webOrders.unshift(newOrder);
            saveWebOrders(webOrders);

            // Sync with persistent SQLite
            try {
                dbEngine.syncEntireDB(db);
            } catch (e) {
                console.warn("dbEngine sync warning:", e.message);
            }

            const receipt = 
`🎉 **BUYURTMANGIZ QABUL QILINDI! #${orderNum}**

🛠 **Xizmat / Asbob:** ${session.service_title}
📍 **Manzil:** ${session.address}
🕒 **Vaqt:** ${session.booking_time}
📞 **Telefon:** ${session.phone}

Buyurtma WMS Arenda bazasiga **"yangi"** holatda saqlab qo'yildi. Operatorimiz 5 daqiqada siz bilan bog'lanadi!`;

            resetServerSession(sessionId);
            return { reply: receipt, order_number: orderNum, step: 'completed' };
        } else {
            return { reply: "Buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)", step: 'awaiting_phone' };
        }
    }

    // STEP 3: Awaiting Time
    if (session.step === 'awaiting_time') {
        session.booking_time = time || raw;
        if (phone) {
            session.phone = phone;
            return generateSmartCopilotResponse(phone, conversationHistory, db, sessionId);
        }
        session.step = 'awaiting_phone';
        return { reply: "Ajoyib! Buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)", step: 'awaiting_phone' };
    }

    // STEP 2: Awaiting Address
    if (session.step === 'awaiting_address') {
        session.address = address || raw;
        if (time) {
            session.booking_time = time;
            session.step = 'awaiting_phone';
            return { reply: `Manzil: ${session.address} qabul qilindi! ✅\nBuyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)`, step: 'awaiting_phone' };
        }
        session.step = 'awaiting_time';
        return { reply: `Manzil: ${session.address} qabul qilindi! ✅ Uskuna / xizmat qaysi kunga va soat nechiga kerak?`, step: 'awaiting_time' };
    }

    // STEP 1: Service requested
    if (service) {
        if (address && time && phone) {
            session.address = address;
            session.booking_time = time;
            session.phone = phone;
            return generateSmartCopilotResponse(phone, conversationHistory, db, sessionId);
        }
        if (address) {
            session.address = address;
            session.step = 'awaiting_time';
            return { reply: `${service.price_quote}\n\nManzil: ${session.address} qabul qilindi! ✅ Qaysi kunga va soat nechiga kerak?`, step: 'awaiting_time' };
        }
        session.step = 'awaiting_address';
        return { reply: `${service.price_quote}\n\nManzilingizni yozing (ko'cha, uy raqami)?`, step: 'awaiting_address' };
    }

    // Greeting or general welcome
    return {
        reply: `Assalomu alaykum! WMS Arenda AI Biznes Yordamchisiga (ERP Copilot) xush kelibsiz!\n\n` +
               `Men tizimning barcha ma'lumotlari (ombordagi bo'sh asboblar, kassa qoldig'i, kechikkan buyurtmalar va hamkorlar) bilan real vaqtda ishlayman.\n\n` +
               `Menga quyidagi savollarni berishingiz yoki to'g'ridan-to'g'ri buyurtma ochishingiz mumkin:\n` +
               `• "Kassa qancha?" yoki "Bugungi hisobot"\n` +
               `• "Kechikkan buyurtmalar bormi?"\n` +
               `• "Omborda nima bo'sh?"\n` +
               `• "Avtokran kerak" yoki "Musor olib ketish narxi qancha?"`,
        step: 'init'
    };
}

const server = http.createServer((req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // =========================================================================
    // REST API ENDPOINTS FOR WEBSITE INTEGRATION (BO'LIM 8)
    // =========================================================================

    // 1. GET /api/public/tools/available
    if (req.method === 'GET' && pathname === '/api/public/tools/available') {
        const db = dbEngine.getEntireDB();
        const availableTools = getPublicAvailableTools(db);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            status: "success",
            timestamp: new Date().toISOString(),
            total_available_models: availableTools.length,
            tools: availableTools
        }, null, 2));
        return;
    }

    // 2. GET /api/public/orders (Fetch all web leads / orders)
    if (req.method === 'GET' && pathname === '/api/public/orders') {
        const orders = loadWebOrders();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            count: orders.length,
            orders: orders
        }, null, 2));
        return;
    }

    // 3. POST /api/public/orders (Create order from external website)
    if (req.method === 'POST' && pathname === '/api/public/orders') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');

                // Validation
                if (!payload.customer_name || !payload.customer_phone) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        error: "customer_name va customer_phone maydonlari majburiy!"
                    }));
                    return;
                }

                const orders = loadWebOrders();
                const newId = Date.now();
                const orderNum = `WEB-2026-${String(orders.length + 1).padStart(4, '0')}`;

                let serviceTitle = payload.service_type || 'asbob_ijarasi';
                if (payload.service_type === 'asbob_ijarasi') {
                    serviceTitle = `Asbob ijarasi (${payload.tool_name || 'Uskuna'})`;
                } else if (payload.service_type === 'kran') {
                    serviceTitle = `Avtokran xizmati`;
                } else if (payload.service_type === 'musor_olib_ketish') {
                    serviceTitle = `Qurilish axlatini olib ketish`;
                } else if (payload.service_type === 'gruzchik') {
                    serviceTitle = `Gruzchik xizmati`;
                }

                const newOrder = {
                    id: newId,
                    order_number: orderNum,
                    customer_name: payload.customer_name.trim(),
                    customer_phone: payload.customer_phone.trim(),
                    service_type: payload.service_type || 'asbob_ijarasi',
                    tool_id: payload.tool_id || null,
                    tool_name: payload.tool_name || (payload.tool_id ? `Model #${payload.tool_id}` : null),
                    service_details: payload.service_details || 'Saytdan kiritilgan',
                    delivery_address: payload.delivery_address || 'Yetkazib berish ko\'rsatilmagan (Olib ketish)',
                    requested_date: payload.requested_date || new Date().toLocaleString('uz-UZ'),
                    status: "yangi",
                    created_at: new Date().toLocaleString('uz-UZ'),
                    source: "tashqi_sayt_onlayn"
                };

                orders.unshift(newOrder);
                saveWebOrders(orders);

                // Telegram Group Notification Format
                const telegramAlert = [
                    `🔔 SAYTDAN YANGI ZAKAZ! #${orderNum}`,
                    `━━━━━━━━━━━━━━━━━━━`,
                    `👤 Mijoz: ${newOrder.customer_name}`,
                    `📞 Tel: ${newOrder.customer_phone}`,
                    `📦 Xizmat: ${serviceTitle}`,
                    `📍 Manzil: ${newOrder.delivery_address}`,
                    `📅 Sana/Vaqt: ${newOrder.requested_date}`,
                    `📝 Tafsilot: ${newOrder.service_details}`,
                    `━━━━━━━━━━━━━━━━━━━`,
                    `⚡️ Iltimos, mijoz bilan 5 daqiqa ichida bog'laning!`
                ].join('\n');

                res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    status: "success",
                    message: "Buyurtmangiz muvaffaqiyatli qabul qilindi! Tez orada operatorimiz siz bilan bog'lanadi.",
                    order_id: newId,
                    order_number: orderNum,
                    order: newOrder,
                    telegram_notification: telegramAlert
                }, null, 2));

            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: false,
                    error: "Noto'g'ri JSON formati: " + err.message
                }));
            }
        });
        return;
    }

    // 4. PATCH /api/public/orders/:id/status (Update web lead status)
    if (req.method === 'PATCH' && pathname.startsWith('/api/public/orders/')) {
        const orderId = parseInt(pathname.split('/')[4]);
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const orders = loadWebOrders();
                const targetOrder = orders.find(o => o.id === orderId);
                if (targetOrder) {
                    if (payload.status) targetOrder.status = payload.status;
                    saveWebOrders(orders);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true, order: targetOrder }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Buyurtma topilmadi" }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // =========================================================================
    // =========================================================================
    // REST API ENDPOINTS FOR AI AGENT & TELEGRAM BOT (BO'LIM 9 - REAL GEMINI API & B2B COPILOT)
    // =========================================================================

    // 5. POST /api/chat & /api/ai/chat (Real-time DB Copilot + Optional Live LLM)
    if (req.method === 'POST' && (pathname === '/api/chat' || pathname === '/api/ai/chat')) {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const userMessage = (payload.message || '').trim();
                const history = payload.messages || payload.history || [];
                const requestedProvider = (payload.provider || 'builtin').toLowerCase();
                const rawKey = (payload.api_key || '').trim();
                const role = payload.role || 'operator';
                const adminPin = payload.admin_pin || '';

                if (!userMessage) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Xabar matni kiritilmadi (message is required)" }));
                    return;
                }

                // Retrieve live DB snapshot (passed from client or fetched directly from SQLite)
                const db = payload.db_state || dbEngine.getEntireDB();
                const systemPrompt = generateRealtimeSystemPrompt(db);

                // If user explicitly configured Groq with an API key or env key is set
                const groqKey = process.env.GROQ_API_KEY || (requestedProvider === 'groq' ? rawKey : null);
                if (groqKey) {
                    try {
                        const model = payload.model || 'llama-3.3-70b-versatile';
                        const groqReply = await callGroqAPI(groqKey, userMessage, history, model, systemPrompt);
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({
                            success: true,
                            live_llm: true,
                            provider: "groq",
                            model: model,
                            reply: groqReply
                        }));
                        return;
                    } catch (groqErr) {
                        console.warn("Groq API error, falling back to smart copilot engine:", groqErr.message);
                    }
                }

                // If user explicitly configured Gemini with an API key or env key is set
                const geminiKey = process.env.GEMINI_API_KEY || (requestedProvider === 'gemini' ? rawKey : null);
                if (geminiKey) {
                    try {
                        const geminiReply = await callGoogleGeminiAPI(geminiKey, userMessage, history, systemPrompt);
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({
                            success: true,
                            live_llm: true,
                            provider: "gemini",
                            model: payload.model || "gemini-1.5-flash",
                            reply: geminiReply
                        }));
                        return;
                    } catch (geminiErr) {
                        console.warn("Gemini API error, falling back to smart copilot engine:", geminiErr.message);
                    }
                }

                // High-precision Smart Copilot using live database facts
                const sessionId = payload.session_id || payload.chat_id || 'default';
                const smartResponse = generateSmartCopilotResponse(userMessage, history, db, sessionId);
                if (!res.headersSent) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        live_llm: false,
                        live_db_synced: true,
                        provider: "builtin",
                        model: "wms-copilot-engine",
                        reply: smartResponse.reply,
                        order_number: smartResponse.order_number || null,
                        step: smartResponse.step || null
                    }));
                }

            } catch (e) {
                if (!res.headersSent) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: e.message }));
                }
            }
        });
        return;
    }

    // 6. POST /api/ai/telegram-webhook (B2B Partner & Dispatcher Telegram Bot)
    if (req.method === 'POST' && pathname === '/api/ai/telegram-webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const update = JSON.parse(body || '{}');
                const db = dbEngine.getEntireDB();
                const botToken = getBotToken(db);
                const partners = db.service_partners || [];

                // 1. Handle Inline Button Callback Queries
                if (update.callback_query) {
                    const cb = update.callback_query;
                    const cbData = cb.data || '';
                    const chatId = cb.message?.chat?.id;
                    const partner = partners.find(p => p.telegram_chat_id == chatId);
                    const employee = (db.users || []).find(u => u.telegram_chat_id == chatId);

                    // =========================================================
                    // A. SELLER INTERACTIVE ORDER WIZARD CALLBACKS (wz_*)
                    // =========================================================
                    if (cbData.startsWith('wz_')) {
                        const sellerMenu = [
                            [{ text: "➕ Yangi Zakaz urish" }],
                            [{ text: "📋 Buyurtmalar holati" }, { text: "📦 Ombor qoldig'i" }]
                        ];

                        if (cbData === 'wz_cancel') {
                            sellerWizardSessions.delete(chatId);
                            const cancelMsg = "❌ Buyurtma jarayoni bekor qilindi.";
                            if (botToken && chatId) {
                                await sendTelegramBotMessage(botToken, chatId, cancelMsg, null, sellerMenu);
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, callback_handled: true, reply: cancelMsg }));
                            return;
                        }

                        // 1. Service Type: Tools (Asboblar ijarasi)
                        if (cbData === 'wz_srv_tools') {
                            const models = db.product_models || [];
                            const items = db.product_items || db.tools || [];
                            const availableModels = models.filter(m => {
                                const freeCount = items.filter(i => (i.model_id === m.id || i.product_model_id === m.id) && (i.status === 'omborda_bosh' || i.status === 'bosh')).length;
                                return freeCount > 0;
                            });

                            if (availableModels.length === 0 && models.length === 0) {
                                const emptyMsg = "📦 <b>Omborda hozirda bo'sh asbob mavjud emas (0 ta).</b>\n\nYangi asboblarni qo'shish uchun sayt orqali Kirim qiling.";
                                if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, emptyMsg, null, sellerMenu);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ ok: true, reply: emptyMsg }));
                                return;
                            }

                            sellerWizardSessions.set(chatId, {
                                step: 'tool_select',
                                service_type: 'tools',
                                service_name: 'Asboblar ijarasi'
                            });

                            const toolList = availableModels.length > 0 ? availableModels : models.slice(0, 8);
                            const toolButtons = toolList.map(m => ([{
                                text: `🔨 ${m.brand || ''} ${m.model_name || m.name} (${(m.daily_rental_price || m.daily_price || 0).toLocaleString()} so'm/kun)`,
                                callback_data: `wz_tl_${m.id}`
                            }]));
                            toolButtons.push([{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]);

                            const promptMsg = "🔨 <b>Ijaraga beriladigan asbobni tanlang:</b>";
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, promptMsg, toolButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: promptMsg }));
                            return;
                        }

                        // 2. Select Tool Model
                        if (cbData.startsWith('wz_tl_') && !cbData.startsWith('wz_tl_day_')) {
                            const toolId = parseInt(cbData.replace('wz_tl_', '')) || cbData.replace('wz_tl_', '');
                            const model = (db.product_models || []).find(m => m.id == toolId) || (db.tools || []).find(t => t.id == toolId);
                            const toolName = model ? `${model.brand || ''} ${model.model_name || model.name}`.trim() : `Asbob #${toolId}`;
                            const dailyPrice = model ? (model.daily_rental_price || model.daily_price || 100000) : 100000;

                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'tool_days',
                                tool_id: toolId,
                                tool_name: toolName,
                                tool_price: dailyPrice
                            });

                            const daysButtons = [
                                [{ text: "⏱️ 1 kun", callback_data: "wz_tl_day_1" }, { text: "⏱️ 2 kun", callback_data: "wz_tl_day_2" }],
                                [{ text: "⏱️ 3 kun", callback_data: "wz_tl_day_3" }, { text: "⏱️ 1 hafta (7 kun)", callback_data: "wz_tl_day_7" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const daysMsg = `🔨 Tanlandi: <b>${toolName}</b>\n💵 Kunlik narx: <b>${dailyPrice.toLocaleString()} so'm</b>\n\n📅 <b>Ijara muddatini tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, daysMsg, daysButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: daysMsg }));
                            return;
                        }

                        // 3. Select Tool Rental Days
                        if (cbData.startsWith('wz_tl_day_')) {
                            const days = parseInt(cbData.replace('wz_tl_day_', '')) || 1;
                            const session = sellerWizardSessions.get(chatId) || {};
                            const totalAmount = (session.tool_price || 100000) * days;

                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'ask_address_phone',
                                days: days,
                                total_amount: totalAmount
                            });

                            const askMsg = `✅ Asbob: <b>${session.tool_name}</b> (${days} kun)\n💵 Jami summa: <b>${totalAmount.toLocaleString()} so'm</b>\n\n📍 <b>Oxirgi qadam: Ish joyi manzili va 📱 Mijoz telefon raqamini bitta xabarda yozib yuboring:</b>\n\n(Masalan: <i>Chilonzor 9-mavze 12-uy, +998901234567</i>)\n\n<i>Bekor qilish uchun /cancel deb yozing.</i>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, askMsg);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: askMsg }));
                            return;
                        }

                        // 4. Service Type: Crane (Avtokran)
                        if (cbData === 'wz_srv_crane') {
                            sellerWizardSessions.set(chatId, {
                                step: 'crane_tonnage',
                                service_type: 'crane',
                                service_name: 'Avtokran xizmati'
                            });

                            const tonButtons = [
                                [{ text: "🏗️ 16 tonna", callback_data: "wz_cr_ton_16" }, { text: "🏗️ 25 tonna", callback_data: "wz_cr_ton_25" }],
                                [{ text: "🏗️ 50 tonna", callback_data: "wz_cr_ton_50" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const craneMsg = "🏗️ <b>Avtokran tonnajini tanlang:</b>";
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, craneMsg, tonButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: craneMsg }));
                            return;
                        }

                        // 5. Crane Tonnage Selected
                        if (cbData.startsWith('wz_cr_ton_')) {
                            const tonnage = cbData.replace('wz_cr_ton_', '');
                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'crane_hours',
                                tonnage: tonnage
                            });

                            const hourButtons = [
                                [{ text: "⏱️ 2 soat", callback_data: "wz_cr_hr_2" }, { text: "⏱️ 3 soat", callback_data: "wz_cr_hr_3" }],
                                [{ text: "⏱️ 4 soat", callback_data: "wz_cr_hr_4" }, { text: "⏱️ 1 smena (8 soat)", callback_data: "wz_cr_hr_8" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const hrMsg = `🏗️ Kran tonnaji: <b>${tonnage}t</b>\n\n⏱️ <b>Kran ishlash muddatini (soat) tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, hrMsg, hourButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: hrMsg }));
                            return;
                        }

                        // 6. Crane Hours Selected -> Choose Partner
                        if (cbData.startsWith('wz_cr_hr_')) {
                            const hours = parseInt(cbData.replace('wz_cr_hr_', '')) || 2;
                            const session = sellerWizardSessions.get(chatId) || {};
                            const ton = parseInt(session.tonnage) || 16;

                            let basePrice = hours === 2 ? 800000 : (hours === 3 ? 1100000 : (hours === 4 ? 1400000 : 2500000));
                            if (ton === 25) basePrice = Math.round(basePrice * 1.3);
                            if (ton === 50) basePrice = Math.round(basePrice * 2.0);
                            const payout = Math.round(basePrice * 0.8);

                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'choose_partner',
                                hours: hours,
                                total_amount: basePrice,
                                partner_payout: payout
                            });

                            const cranePartners = (db.service_partners || []).filter(p => {
                                const cat = String(p.service_category || '').toLowerCase();
                                return cat.includes('kran') || cat.includes('crane');
                            });
                            const availablePartners = cranePartners.length > 0 ? cranePartners : (db.service_partners || []).slice(0, 5);

                            const partnerButtons = availablePartners.map(p => ([{
                                text: `🏗️ ${p.company_name} (${p.status === 'bosh' || p.is_available ? '🟢 Bo\'sh' : '🟡 Band'})`,
                                callback_data: `wz_prt_${p.id}`
                            }]));
                            partnerButtons.push([{ text: "🤖 Avtomatik biriktirish", callback_data: "wz_prt_auto" }]);
                            partnerButtons.push([{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]);

                            const prtMsg = `🏗️ <b>Avtokran (${session.tonnage}t, ${hours} soat)</b>\n💵 Jami: <b>${basePrice.toLocaleString()} so'm</b> (Hamkor haqi: ${payout.toLocaleString()} so'm)\n\n👤 <b>Biriktiriladigan hamkorni tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, prtMsg, partnerButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: prtMsg }));
                            return;
                        }

                        // 7. Service Type: Trash (Musor)
                        if (cbData === 'wz_srv_trash') {
                            sellerWizardSessions.set(chatId, {
                                step: 'trash_volume',
                                service_type: 'trash',
                                service_name: 'Musor olib ketish'
                            });

                            const volButtons = [
                                [{ text: "🚛 Gazel (1.5 tonna)", callback_data: "wz_ms_vol_gazel" }],
                                [{ text: "🚛 ZIL (5 tonna)", callback_data: "wz_ms_vol_zil" }],
                                [{ text: "📦 Qoplarda (Kichik hajm)", callback_data: "wz_ms_vol_qop" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const trashMsg = "🚛 <b>Chiqindi (Musor) tashish hajmini tanlang:</b>";
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, trashMsg, volButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: trashMsg }));
                            return;
                        }

                        // 8. Trash Volume Selected -> Choose Partner
                        if (cbData.startsWith('wz_ms_vol_')) {
                            const volKey = cbData.replace('wz_ms_vol_', '');
                            let volName = 'Gazel (1.5t)', price = 350000, payout = 280000;
                            if (volKey === 'zil') { volName = 'ZIL (5t)'; price = 600000; payout = 480000; }
                            if (volKey === 'qop') { volName = 'Qoplarda'; price = 200000; payout = 160000; }

                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'choose_partner',
                                volume: volName,
                                total_amount: price,
                                partner_payout: payout
                            });

                            const trashPartners = (db.service_partners || []).filter(p => {
                                const cat = String(p.service_category || '').toLowerCase();
                                return cat.includes('musor') || cat.includes('chiqindi') || cat.includes('tashish');
                            });
                            const availablePartners = trashPartners.length > 0 ? trashPartners : (db.service_partners || []).slice(0, 5);

                            const partnerButtons = availablePartners.map(p => ([{
                                text: `🚛 ${p.company_name} (${p.status === 'bosh' || p.is_available ? '🟢 Bo\'sh' : '🟡 Band'})`,
                                callback_data: `wz_prt_${p.id}`
                            }]));
                            partnerButtons.push([{ text: "🤖 Avtomatik biriktirish", callback_data: "wz_prt_auto" }]);
                            partnerButtons.push([{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]);

                            const prtMsg = `🚛 <b>Musor olib ketish (${volName})</b>\n💵 Jami: <b>${price.toLocaleString()} so'm</b> (Hamkor haqi: ${payout.toLocaleString()} so'm)\n\n👤 <b>Biriktiriladigan haydovchini tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, prtMsg, partnerButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: prtMsg }));
                            return;
                        }

                        // 9. Service Type: Loader (Gruzchik)
                        if (cbData === 'wz_srv_loader') {
                            sellerWizardSessions.set(chatId, {
                                step: 'loader_workers',
                                service_type: 'loader',
                                service_name: 'Gruzchik xizmati'
                            });

                            const wkButtons = [
                                [{ text: "👤 1 kishi", callback_data: "wz_gr_wk_1" }, { text: "👥 2 kishi", callback_data: "wz_gr_wk_2" }],
                                [{ text: "👥 3 kishi", callback_data: "wz_gr_wk_3" }, { text: "👥 4+ kishi", callback_data: "wz_gr_wk_4" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const grMsg = "👷 <b>Gruzchiklar (ishchilar) sonini tanlang:</b>";
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, grMsg, wkButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: grMsg }));
                            return;
                        }

                        // 10. Loader Workers Selected
                        if (cbData.startsWith('wz_gr_wk_')) {
                            const wk = parseInt(cbData.replace('wz_gr_wk_', '')) || 2;
                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'loader_floor',
                                workers: wk
                            });

                            const flButtons = [
                                [{ text: "1-qavat (yer)", callback_data: "wz_gr_fl_1" }, { text: "2-qavat", callback_data: "wz_gr_fl_2" }],
                                [{ text: "3-qavat", callback_data: "wz_gr_fl_3" }, { text: "4+ qavat", callback_data: "wz_gr_fl_4" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const flMsg = `👷 Ishchilar: <b>${wk} kishi</b>\n\n🏢 <b>Yuk ko'tariladigan qavatni (etaj) tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, flMsg, flButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: flMsg }));
                            return;
                        }

                        // 11. Loader Floor Selected
                        if (cbData.startsWith('wz_gr_fl_')) {
                            const fl = parseInt(cbData.replace('wz_gr_fl_', '')) || 1;
                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'loader_elevator',
                                floor: fl
                            });

                            const elButtons = [
                                [{ text: "✅ Ha, yuk lifti bor", callback_data: "wz_gr_el_yes" }],
                                [{ text: "❌ Yo'q, zina orqali", callback_data: "wz_gr_el_no" }],
                                [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                            ];

                            const elMsg = `🏢 Qavat: <b>${fl}-etaj</b>\n\n🛗 <b>Yuk lifti mavjudmi?</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, elMsg, elButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: elMsg }));
                            return;
                        }

                        // 12. Loader Elevator Selected -> Choose Partner
                        if (cbData.startsWith('wz_gr_el_')) {
                            const hasElevator = cbData === 'wz_gr_el_yes';
                            const session = sellerWizardSessions.get(chatId) || {};
                            const wk = session.workers || 2;
                            const fl = session.floor || 1;
                            const gRules = (db.service_pricing_rules && db.service_pricing_rules.gruzchik) || {
                                base_standard_bag_price: 3000,
                                floor_extra_price: 2000,
                                elevator_fixed_price: 1500,
                                min_order_price: 30000,
                                partner_share_percent: 75
                            };
                            const stdUnitPrice = (hasElevator || fl <= 1) ? (gRules.elevator_fixed_price || 1500) : ((gRules.base_standard_bag_price || 3000) + ((fl - 1) * (gRules.floor_extra_price || 2000)));
                            // Estimate typical order volume per worker (e.g. 20 standard bags per worker)
                            const estBags = wk * 20;
                            const rawPrice = estBags * stdUnitPrice;
                            const price = Math.max(gRules.min_order_price || 30000, rawPrice);
                            const share = (gRules.partner_share_percent || 75) / 100;
                            const payout = Math.round(price * share);

                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'choose_partner',
                                has_elevator: hasElevator,
                                total_amount: price,
                                partner_payout: payout
                            });

                            const loaderPartners = (db.service_partners || []).filter(p => {
                                const cat = String(p.service_category || '').toLowerCase();
                                return cat.includes('gruzchik') || cat.includes('ishchi') || cat.includes('usta');
                            });
                            const availablePartners = loaderPartners.length > 0 ? loaderPartners : (db.service_partners || []).slice(0, 5);

                            const partnerButtons = availablePartners.map(p => ([{
                                text: `👷 ${p.company_name} (${p.status === 'bosh' || p.is_available ? '🟢 Bo\'sh' : '🟡 Band'})`,
                                callback_data: `wz_prt_${p.id}`
                            }]));
                            partnerButtons.push([{ text: "🤖 Avtomatik biriktirish", callback_data: "wz_prt_auto" }]);
                            partnerButtons.push([{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]);

                            const prtMsg = `👷 <b>Gruzchik (${wk} kishi, ${fl}-qavat, ${hasElevator ? 'lift bor' : 'lift yo\'q'})</b>\n💵 Jami: <b>${price.toLocaleString()} so'm</b> (Hamkor haqi: ${payout.toLocaleString()} so'm)\n\n👤 <b>Biriktiriladigan hamkorni tanlang:</b>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, prtMsg, partnerButtons);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: prtMsg }));
                            return;
                        }

                        // 13. Partner Selected -> Prompt for Address & Phone
                        if (cbData.startsWith('wz_prt_')) {
                            let partId = null, partName = 'Avtomatik tayinlash';
                            if (cbData !== 'wz_prt_auto') {
                                partId = parseInt(cbData.replace('wz_prt_', '')) || cbData.replace('wz_prt_', '');
                                const foundPart = (db.service_partners || []).find(p => p.id == partId);
                                if (foundPart) partName = foundPart.company_name;
                            }

                            const session = sellerWizardSessions.get(chatId) || {};
                            sellerWizardSessions.set(chatId, {
                                ...session,
                                step: 'ask_address_phone',
                                partner_id: partId,
                                partner_name: partName
                            });

                            const askMsg = `✅ Biriktirildi: <b>${partName}</b>\n💵 Jami summa: <b>${(session.total_amount || 0).toLocaleString()} so'm</b>\n\n📍 <b>Oxirgi qadam: Ish joyi manzili va 📱 Mijoz telefon raqamini bitta xabarda yozib yuboring:</b>\n\n(Masalan: <i>Chilonzor 9-mavze 12-uy, +998901234567</i>)\n\n<i>Bekor qilish uchun /cancel deb yozing.</i>`;
                            if (botToken && chatId) await sendTelegramBotMessage(botToken, chatId, askMsg);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: askMsg }));
                            return;
                        }
                    }

                    // =========================================================
                    // B. PARTNER LIVE TASK CALLBACKS (accept_, reject_, finish_)
                    // =========================================================
                    if (cbData.startsWith('accept_')) {
                        const orderId = parseInt(cbData.replace('accept_', '')) || cbData.replace('accept_', '');
                        const sOrder = (db.service_orders || []).find(o => o.id == orderId || o.order_number == orderId);
                        if (sOrder) {
                            sOrder.order_status = 'hamkor_qabul_qildi';
                            sOrder.status = 'hamkor_qabul_qildi';
                            dbEngine.syncEntireDB(db);
                        }
                        const replyText = "Buyurtma qabul qilindi. Ishni tugatgach [🏁 Bajarildi] tugmasini bosing";
                        recordPartnerLiveEvent({
                            type: 'accept',
                            order_id: sOrder ? sOrder.id : orderId,
                            order_number: sOrder ? sOrder.order_number : `SRV-${orderId}`,
                            status: 'hamkor_qabul_qildi',
                            partner_id: partner ? partner.id : null,
                            partner_name: partner ? partner.company_name : 'Hamkor',
                            message: `✅ Hamkor (${partner ? partner.company_name : 'Hamkor'}) #${sOrder ? sOrder.order_number : orderId} buyurtmani qabul qildi!`
                        });

                        if (botToken && chatId) {
                            await sendTelegramBotMessage(botToken, chatId, replyText, [
                                [{ text: "🏁 Bajarildi", callback_data: `finish_${sOrder ? sOrder.id : orderId}` }]
                            ]);
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, callback_handled: true, reply: replyText }));
                        return;

                    } else if (cbData.startsWith('reject_')) {
                        const orderId = parseInt(cbData.replace('reject_', '')) || cbData.replace('reject_', '');
                        const sOrder = (db.service_orders || []).find(o => o.id == orderId || o.order_number == orderId);
                        if (sOrder) {
                            sOrder.order_status = 'rad_etildi';
                            sOrder.status = 'rad_etildi';
                            dbEngine.syncEntireDB(db);
                        }
                        const replyText = "Buyurtma rad etildi.";
                        recordPartnerLiveEvent({
                            type: 'reject',
                            order_id: sOrder ? sOrder.id : orderId,
                            order_number: sOrder ? sOrder.order_number : `SRV-${orderId}`,
                            status: 'rad_etildi',
                            partner_id: partner ? partner.id : null,
                            partner_name: partner ? partner.company_name : 'Hamkor',
                            message: `⚠️ Hamkor buyurtmani rad etdi, boshqa hamkorni tanlang!`
                        });

                        if (botToken && chatId) {
                            await sendTelegramBotMessage(botToken, chatId, replyText);
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, callback_handled: true, reply: replyText }));
                        return;

                    } else if (cbData.startsWith('finish_')) {
                        const orderId = parseInt(cbData.replace('finish_', '')) || cbData.replace('finish_', '');
                        const sOrder = (db.service_orders || []).find(o => o.id == orderId || o.order_number == orderId);
                        if (sOrder) {
                            sOrder.order_status = 'bajarildi';
                            sOrder.status = 'bajarildi';
                            if (partner) {
                                partner.balance = (partner.balance || 0) + (sOrder.partner_payout_amount || 0);
                            }
                            dbEngine.syncEntireDB(db);
                        }
                        const replyText = `🎉 Ish muvaffaqiyatli yakunlandi! Hisobingizga +${(sOrder ? (sOrder.partner_payout_amount || 0) : 0).toLocaleString()} so'm yozildi.`;
                        recordPartnerLiveEvent({
                            type: 'finish',
                            order_id: sOrder ? sOrder.id : orderId,
                            order_number: sOrder ? sOrder.order_number : `SRV-${orderId}`,
                            status: 'bajarildi',
                            partner_id: partner ? partner.id : null,
                            partner_name: partner ? partner.company_name : 'Hamkor',
                            payout_amount: sOrder ? sOrder.partner_payout_amount : 0,
                            message: `🏁 Hamkor (${partner ? partner.company_name : 'Hamkor'}) #${sOrder ? sOrder.order_number : orderId} buyurtmani yakunladi!`
                        });

                        const partnerMenu = [
                            [{ text: "📥 Yangi vazifalar" }, { text: "🏁 Ishni yakunlash" }],
                            [{ text: "💰 Mening Balansim" }, { text: "🟢/🔴 Mening holatim" }]
                        ];

                        if (botToken && chatId) {
                            await sendTelegramBotMessage(botToken, chatId, replyText, null, partnerMenu);
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, callback_handled: true, reply: replyText }));
                        return;
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                    return;
                }

                // 2. Handle Text / Contact Messages
                const message = update.message || {};
                const chatId = message.chat?.id;
                const text = (message.text || '').trim();
                const contact = message.contact;

                if (!chatId) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: false, error: "No chatId" }));
                    return;
                }

                // Find employee or partner by telegram_chat_id
                let employee = (db.users || []).find(u => u.telegram_chat_id == chatId);
                let partner = partners.find(p => p.telegram_chat_id == chatId);

                const sellerMenu = [
                    [{ text: "➕ Yangi Zakaz urish" }],
                    [{ text: "📋 Buyurtmalar holati" }, { text: "📦 Ombor qoldig'i" }]
                ];

                const partnerMenu = [
                    [{ text: "📥 Yangi vazifalar" }, { text: "🏁 Ishni yakunlash" }],
                    [{ text: "💰 Mening Balansim" }, { text: "🟢/🔴 Mening holatim" }]
                ];

                const authKeyboard = [
                    [{ text: "📱 O'z raqamimni yuborish", request_contact: true }]
                ];

                // =========================================================================
                // STRICT AUTHENTICATION (ONLY NATIVE TELEGRAM CONTACT ALLOWED)
                // =========================================================================
                if (!employee && !partner) {
                    // 1. IF NATIVE CONTACT RECEIVED
                    if (contact && contact.phone_number) {
                        const fromId = message.from?.id;
                        const contactUserId = contact.user_id;

                        // XAVFSIZLIK TEKSHIRUVI: Kontakt aynan shu Telegram profiliga tegishlimi?
                        if (contactUserId && fromId && contactUserId !== fromId) {
                            const securityRejectMsg = "⛔ <b>Begona odamning kontaktini yuborish taqiqlangan!</b>\nFaqat pastdagi <b>[📱 O'z raqamimni yuborish]</b> tugmasini bosing.";
                            if (botToken) await sendTelegramBotMessage(botToken, chatId, securityRejectMsg, null, authKeyboard);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, verified: false, error: "contact_user_id_mismatch", reply: securityRejectMsg }));
                            return;
                        }

                        const cleanIncoming = contact.phone_number.replace(/[^\d]/g, '');

                        // 1. AVVAL XODIMLAR (SOTUVCHI / MENEJER) BAZASIDAN QIDIR (DB.users):
                        employee = (db.users || []).find(u => {
                            const uPhone = (u.phone || '').replace(/[^\d]/g, '');
                            return uPhone && cleanIncoming.endsWith(uPhone.slice(-9));
                        });

                        // Explicit check for user's number +998951043733 if not already in array
                        if (!employee && cleanIncoming.endsWith('951043733')) {
                            employee = {
                                id: Date.now(),
                                full_name: "Shohjaxon (Sotuvchi)",
                                phone: "+998 95 104 37 33",
                                username: "shohjaxon",
                                role_id: "sotuvchi",
                                is_active: true
                            };
                            db.users = db.users || [];
                            db.users.push(employee);
                        }

                        if (employee) {
                            employee.telegram_chat_id = chatId;
                            dbEngine.syncEntireDB(db);

                            const welcomeSellerMsg = `Assalomu alaykum, <b>${employee.full_name}</b>! Siz tizimga SOTUVCHI sifatida kirdingiz ✅\n\nQuyidagi menyu orqali yangi zakazlarni rasmiylashtirishingiz, omborni ko'rishingiz yoki buyurtmalar holatini tekshirishingiz mumkin:`;

                            if (botToken) await sendTelegramBotMessage(botToken, chatId, welcomeSellerMsg, null, sellerMenu);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, verified: true, role: 'seller', user: employee.full_name, reply: welcomeSellerMsg }));
                            return;
                        }

                        // 2. AGAR XODIM BO'LMASA — HAMKORLAR BAZASIDAN QIDIR (DB.partners / DB.service_partners):
                        partner = partners.find(p => {
                            const p1 = (p.phone_primary || '').replace(/[^\d]/g, '');
                            const p2 = (p.phone_secondary || '').replace(/[^\d]/g, '');
                            return (p1 && cleanIncoming.endsWith(p1.slice(-9))) || (p2 && cleanIncoming.endsWith(p2.slice(-9)));
                        });

                        if (partner) {
                            partner.telegram_chat_id = chatId;
                            partner.status = 'bosh';
                            partner.is_available = true;
                            dbEngine.syncEntireDB(db);

                            const welcomePartnerMsg = "Raxmat, siz tizimga ulandingiz! Endi yangi buyurtmalar to'g'ridan-to'g'ri shu yerga keladi";

                            if (botToken) await sendTelegramBotMessage(botToken, chatId, welcomePartnerMsg, null, partnerMenu);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, verified: true, role: 'partner', partner: partner.company_name, reply: welcomePartnerMsg }));
                            return;
                        }

                        // 3. AGAR IKKALASIDA HAM BO'LMASA:
                        const notFoundMsg = "Sizning raqamingiz xodimlar yoki hamkorlar bazasida topilmadi. Admin bilan bog'laning";
                        if (botToken) await sendTelegramBotMessage(botToken, chatId, notFoundMsg, null, authKeyboard);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, verified: false, reply: notFoundMsg }));
                        return;
                    }

                    // 2. IF MANUAL TEXT SENT (MANUAL PHONE ENTRY IS STRICTLY BLOCKED)
                    const cleanDigits = text.replace(/[\s\-\(\)\.]/g, '');
                    const isManualPhone = /(?:\+?998|\b9\d{8}\b|\b\d{7,12}\b)/.test(cleanDigits);

                    if (isManualPhone) {
                        const securityWarning = 
`⚠️ <b>XAVFSIZLIK CHEKLOVI!</b>
Telefon raqamni qo'lda yozib kiritish taqiqlangan.
Faqat pastdagi <b>[📱 O'z raqamimni yuborish]</b> tugmasini bosing.`;

                        if (botToken) await sendTelegramBotMessage(botToken, chatId, securityWarning, null, authKeyboard);

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, blocked_manual: true, reply: securityWarning }));
                        return;
                    }

                    // Default greeting prompting for native contact button
                    const askAuthMsg = "Salom! Tizimdan foydalanish uchun telefon raqamingizni tasdiqlang:\n\nPastdagi <b>[📱 O'z raqamimni yuborish]</b> tugmasini bosing.";

                    if (botToken) await sendTelegramBotMessage(botToken, chatId, askAuthMsg, null, authKeyboard);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, prompt_contact: true, reply: askAuthMsg }));
                    return;
                }

                // =========================================================================
                // A. AUTHENTICATED SELLER (SOTUVCHI / MENEJER) ACTIONS
                // =========================================================================
                if (employee) {
                    // Check if seller is in an active order wizard flow
                    if (sellerWizardSessions.has(chatId)) {
                        const session = sellerWizardSessions.get(chatId);

                        if (text === '/cancel' || text.toLowerCase() === 'bekor') {
                            sellerWizardSessions.delete(chatId);
                            const cancelMsg = "❌ Buyurtma jarayoni bekor qilindi.";
                            if (botToken) await sendTelegramBotMessage(botToken, chatId, cancelMsg, null, sellerMenu);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ ok: true, reply: cancelMsg }));
                            return;
                        }

                        if (session.step === 'ask_address_phone') {
                            const phoneMatch = text.match(/(?:\+?998[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|\b9\d{8}\b|\b\d{9,12}\b)/);
                            const customerPhone = phoneMatch ? phoneMatch[0] : '+998 90 000 00 00';
                            let address = text.replace(customerPhone, '').replace(/,\s*$/, '').trim();
                            if (!address || address.length < 2) address = "Toshkent shahri (Ko'rsatilgan manzil)";

                            if (session.service_type === 'tools') {
                                // Rental Order
                                const ordId = Date.now();
                                const orderNum = `ORD-${String(ordId).slice(-4)}`;
                                const newOrder = {
                                    id: ordId,
                                    order_number: orderNum,
                                    order_type: 'rental',
                                    customer_name: "Telegram Mijoz",
                                    customer_phone: customerPhone,
                                    delivery_address: address,
                                    status: 'faol_ijarada',
                                    order_status: 'faol',
                                    order_date: new Date().toISOString().substring(0, 10),
                                    start_date: new Date().toISOString().substring(0, 10),
                                    days: session.days || 1,
                                    items: [{
                                        model_id: session.tool_id,
                                        name: session.tool_name || 'Asbob',
                                        daily_price: session.tool_price || 0,
                                        days: session.days || 1,
                                        amount: session.total_amount || 0
                                    }],
                                    final_amount: session.total_amount || 0,
                                    created_by: employee.full_name || 'Sotuvchi',
                                    created_at: new Date().toISOString()
                                };
                                db.orders = db.orders || [];
                                db.orders.unshift(newOrder);

                                const items = db.product_items || db.tools || [];
                                const toolItem = items.find(i => (i.model_id == session.tool_id || i.product_model_id == session.tool_id) && (i.status === 'omborda_bosh' || i.status === 'bosh'));
                                if (toolItem) {
                                    toolItem.status = 'ijarada';
                                    toolItem.current_order_id = ordId;
                                }

                                dbEngine.syncEntireDB(db);

                                const confirmSeller = 
`✅ <b>IJARA BUYURTMASI MUVAFFAQIYATLI RASMIYLASHTIRILDI!</b>

🔢 Buyurtma: <b>#${orderNum}</b>
🔨 Asbob: <b>${session.tool_name}</b>
⏱️ Muddat: <b>${session.days} kun</b>
📍 Ish joyi: <b>${address}</b>
📱 Mijoz telefoni: <b>${customerPhone}</b>
💵 Jami ijara haqi: <b>${(session.total_amount || 0).toLocaleString()} so'm</b>

📦 <i>Ombordagi holat "Ijarada"ga o'tkazildi.</i>`;

                                if (botToken) await sendTelegramBotMessage(botToken, chatId, confirmSeller, null, sellerMenu);
                                sellerWizardSessions.delete(chatId);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ ok: true, order_created: true }));
                                return;

                            } else {
                                // Service Order (Crane, Trash, Loader)
                                const srvId = Date.now();
                                const orderNum = `SRV-${String(srvId).slice(-4)}`;
                                
                                let assignedPartner = null;
                                if (session.partner_id) {
                                    assignedPartner = (db.service_partners || []).find(p => p.id == session.partner_id);
                                }
                                if (!assignedPartner) {
                                    const matchCat = session.service_type === 'crane' ? 'kran' : (session.service_type === 'trash' ? 'musor' : 'gruzchik');
                                    assignedPartner = (db.service_partners || []).find(p => String(p.service_category || '').toLowerCase().includes(matchCat) && (p.status === 'bosh' || p.is_available)) || (db.service_partners || [])[0];
                                }

                                const srvDetails = session.service_type === 'crane' ? `${session.tonnage}t kran, ${session.hours} soat` :
                                                  (session.service_type === 'trash' ? `Chiqindi: ${session.volume}` :
                                                  `Gruzchik: ${session.workers} kishi, ${session.floor}-qavat, ${session.has_elevator ? 'lift bor' : 'lift yo\'q'}`);

                                const srvOrder = {
                                    id: srvId,
                                    order_number: orderNum,
                                    service_category: session.service_name || 'Xizmat',
                                    service_details: srvDetails,
                                    customer_name: "Telegram Mijoz",
                                    customer_phone: customerPhone,
                                    job_site_address: address,
                                    scheduled_datetime: new Date().toISOString().replace('T', ' ').substring(0, 16),
                                    total_customer_price: session.total_amount || 0,
                                    partner_payout_amount: session.partner_payout || 0,
                                    assigned_partner_id: assignedPartner ? assignedPartner.id : null,
                                    order_status: 'hamkorga_uzatildi',
                                    status: 'hamkorga_uzatildi',
                                    created_by: employee.full_name || 'Sotuvchi',
                                    created_at: new Date().toISOString()
                                };
                                db.service_orders = db.service_orders || [];
                                db.service_orders.unshift(srvOrder);

                                const ordRecord = {
                                    id: srvId,
                                    order_number: orderNum,
                                    order_type: 'service',
                                    customer_name: "Telegram Mijoz",
                                    customer_phone: customerPhone,
                                    delivery_address: address,
                                    service_category: srvOrder.service_category,
                                    service_details: srvDetails,
                                    final_amount: session.total_amount || 0,
                                    partner_payout: session.partner_payout || 0,
                                    assigned_partner_name: assignedPartner ? assignedPartner.company_name : 'Hamkor',
                                    status: 'faol',
                                    order_status: 'faol',
                                    order_date: new Date().toISOString().substring(0, 10),
                                    created_at: new Date().toISOString()
                                };
                                db.orders = db.orders || [];
                                db.orders.unshift(ordRecord);

                                dbEngine.syncEntireDB(db);

                                recordPartnerLiveEvent({
                                    type: 'dispatch',
                                    order_id: srvId,
                                    order_number: orderNum,
                                    status: 'hamkorga_uzatildi',
                                    partner_id: assignedPartner ? assignedPartner.id : null,
                                    partner_name: assignedPartner ? assignedPartner.company_name : 'Hamkor',
                                    message: `📤 Sotuvchi (#${orderNum}) ${srvOrder.service_category} buyurtmasini yaratdi!`
                                });

                                const confirmSeller = 
`✅ <b>BUYURTMA MUVAFFAQIYATLI RASMIYLASHTIRILDI!</b>

🔢 Buyurtma: <b>#${orderNum}</b>
🛠 Xizmat: <b>${srvOrder.service_category}</b> (${srvDetails})
📍 Ish joyi: <b>${address}</b>
📱 Mijoz telefoni: <b>${customerPhone}</b>
💵 Jami summa: <b>${(session.total_amount || 0).toLocaleString()} so'm</b>
👤 Hamkor: <b>${assignedPartner ? assignedPartner.company_name : 'Biriktirilmoqda'}</b>

${assignedPartner && assignedPartner.telegram_chat_id ? '🔔 <i>Hamkorning Telegramiga qabul qilish tugmalari bilan xabar yuborildi!</i>' : 'ℹ️ <i>Buyurtma tizimga saqlandi.</i>'}`;

                                if (botToken) await sendTelegramBotMessage(botToken, chatId, confirmSeller, null, sellerMenu);

                                if (assignedPartner && assignedPartner.telegram_chat_id && botToken) {
                                    const partnerAlert = 
`🔔 <b>SIZGA YANGI BUYURTMA BIRIKTIRILDI!</b>

🔢 Buyurtma: <b>#${orderNum}</b>
🛠 Xizmat: <b>${srvOrder.service_category}</b> (${srvDetails})
📍 Ish joyi: <b>${address}</b>
📱 Mijoz telefoni: <b>${customerPhone}</b>
🕒 Vaqt: <b>Bugun</b>
💵 Sizga to'lanadigan haq: <b>${(session.partner_payout || 0).toLocaleString()} so'm</b>

Buyurtmani qabul qilasizmi?`;

                                    const partnerInline = [
                                        [
                                            { text: "✅ Qabul qilaman", callback_data: `accept_${srvId}` },
                                            { text: "❌ Rad etaman", callback_data: `reject_${srvId}` }
                                        ]
                                    ];
                                    await sendTelegramBotMessage(botToken, assignedPartner.telegram_chat_id, partnerAlert, partnerInline);
                                }

                                sellerWizardSessions.delete(chatId);
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ ok: true, order_created: true }));
                                return;
                            }
                        }
                    }

                    // ACTION: ➕ Yangi Zakaz urish (Start Native Step-by-Step Wizard)
                    if (text.includes("Yangi Zakaz") || text.includes("POS") || text === '/pos' || text === '/zakaz' || text === '/order') {
                        sellerWizardSessions.set(chatId, {
                            step: 'choose_service'
                        });

                        const startMsg = `🛍 <b>YANGI BUYURTMA RASMIYLASHTIRISH</b>\n\nQaysi xizmat yoki asbob bo'yicha buyurtma rasmiylashtiramiz?`;
                        const startInline = [
                            [{ text: "🔨 Asboblar ijarasi", callback_data: "wz_srv_tools" }, { text: "🏗️ Avtokran xizmati", callback_data: "wz_srv_crane" }],
                            [{ text: "🚛 Musor olib ketish", callback_data: "wz_srv_trash" }, { text: "👷 Gruzchik xizmati", callback_data: "wz_srv_loader" }],
                            [{ text: "❌ Bekor qilish", callback_data: "wz_cancel" }]
                        ];

                        if (botToken) await sendTelegramBotMessage(botToken, chatId, startMsg, startInline, sellerMenu);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, reply: startMsg }));
                        return;
                    }

                    // ACTION: 📋 Buyurtmalar holati
                    if (text.includes("Buyurtmalar holati") || text === '/orders') {
                        const today = new Date().toISOString().substring(0, 10);
                        const allOrders = db.orders || [];
                        const allServiceOrders = db.service_orders || [];

                        const activeOrders = allOrders.filter(o => o.status === 'faol' || o.status === 'faol_ijarada' || o.status === 'ijarada' || o.order_status === 'faol');
                        const delayedOrders = allOrders.filter(o => o.status === 'kechikkan');
                        const newOrders = allOrders.filter(o => o.status === 'yangi' || o.order_status === 'yangi');
                        const completedOrders = allOrders.filter(o => o.status === 'qaytarildi' || o.status === 'yopildi' || o.status === 'bajarildi');
                        const activeServices = allServiceOrders.filter(o => 
                            o.order_status === 'yangi' || 
                            o.order_status === 'hamkor_qabul_qildi' || 
                            o.order_status === 'bajarilmoqda' || 
                            o.order_status === 'hamkorga_uzatildi'
                        );

                        let msg = `📋 <b>BUYURTMALAR VA IJARALAR HOLATI</b>\nSana: <b>${today}</b>\n\n`;

                        if (allOrders.length === 0 && allServiceOrders.length === 0) {
                            msg += `Hozircha birorta ham buyurtma rasmiylashtirilmagan (0 ta).\n\nYangi zakaz ochish uchun [➕ Yangi Zakaz urish] tugmasini bosing.`;
                        } else {
                            msg += `📦 <b>Asboblar ijarasi:</b>\n`;
                            msg += `• Faol ijarada: <b>${activeOrders.length} ta</b>\n`;
                            if (delayedOrders.length > 0) {
                                msg += `• ⚠️ Kechikkanlar: <b style="color:#ef4444;">${delayedOrders.length} ta</b>\n`;
                            }
                            msg += `• Yangi buyurtmalar: <b>${newOrders.length} ta</b>\n`;
                            msg += `• Yakunlangan (qaytarilgan): <b>${completedOrders.length} ta</b>\n\n`;

                            msg += `🛠 <b>Tashqi xizmatlar (Kran, Musor, Gruzchik):</b>\n`;
                            msg += `• Jarayondagi buyurtmalar: <b>${activeServices.length} ta</b>\n\n`;

                            if (activeOrders.length > 0) {
                                msg += `<b>Faol asboblar:</b>\n`;
                                activeOrders.slice(0, 5).forEach((o, idx) => {
                                    const cust = (db.customers || []).find(c => c.id === o.customer_id);
                                    msg += `${idx + 1}. #${o.order_number || o.id} — ${cust ? cust.full_name : 'Mijoz'} (${o.start_date || o.order_date || today})\n`;
                                });
                                if (activeOrders.length > 5) msg += `<i>... va yana ${activeOrders.length - 5} ta ijara</i>\n`;
                                msg += `\n`;
                            }

                            if (delayedOrders.length > 0) {
                                msg += `<b>⚠️ Muddati o'tganlar:</b>\n`;
                                delayedOrders.slice(0, 5).forEach((o, idx) => {
                                    const cust = (db.customers || []).find(c => c.id === o.customer_id);
                                    msg += `${idx + 1}. #${o.order_number || o.id} — ${cust ? cust.full_name : 'Mijoz'} (Qaytarish: ${o.expected_return_date || 'Muddati o\'tgan'})\n`;
                                });
                                msg += `\n`;
                            }

                            if (activeServices.length > 0) {
                                msg += `<b>Xizmat buyurtmalari:</b>\n`;
                                activeServices.slice(0, 5).forEach((s, idx) => {
                                    const part = (db.service_partners || []).find(p => p.id === s.assigned_partner_id);
                                    msg += `${idx + 1}. #${s.order_number || s.id} (${s.service_category}) — ${part ? part.company_name : 'Hamkor'} [${s.order_status}]\n`;
                                });
                                if (activeServices.length > 5) msg += `<i>... va yana ${activeServices.length - 5} ta xizmat</i>\n`;
                            }
                        }

                        if (botToken) await sendTelegramBotMessage(botToken, chatId, msg, null, sellerMenu);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, reply: msg }));
                        return;
                    }

                    // ACTION: 📦 Ombor qoldig'i
                    if (text.includes("Ombor qoldig'i") || text === '/stock') {
                        const models = db.product_models || [];
                        const items = db.product_items || db.tools || [];

                        // Real available tools
                        const availableItems = items.filter(it => 
                            it.status === 'omborda_bosh' || 
                            it.status === 'bosh' || 
                            it.status === 'mavjud' || 
                            it.status === 'available'
                        );

                        let stockMsg = `📦 <b>OMBOR QOLDIG'I:</b>\n`;

                        if (availableItems.length === 0 || (models.length === 0 && items.length === 0)) {
                            stockMsg += `Hozirda omborda birorta ham asbob mavjud emas (0 ta).\n\nYangi asboblarni qo'shish uchun sayt orqali "Kirim" qiling.`;
                        } else {
                            stockMsg += `Jami asboblar: <b>${items.length} ta</b> | Bo'sh: <b>${availableItems.length} ta</b>\n\n`;

                            if (models.length > 0) {
                                let shownCount = 0;
                                models.forEach((m, idx) => {
                                    const freeItems = availableItems.filter(i => (i.model_id === m.id || i.product_model_id === m.id));
                                    if (freeItems.length > 0) {
                                        shownCount++;
                                        const shelf = freeItems[0].warehouse_location_shelf || 'A-01';
                                        const price = (m.daily_rental_price || m.daily_price || 0).toLocaleString();
                                        const deposit = (m.base_deposit_amount || m.deposit_amount || 0).toLocaleString();
                                        stockMsg += `${shownCount}. <b>${m.brand || ''} ${m.model_name || m.name}</b>\n   🟢 Bo'sh: <b>${freeItems.length} ta</b> (Polka: ${shelf})\n   💵 Kunlik: ${price} so'm | Garov: ${deposit} so'm\n\n`;
                                    }
                                });

                                if (shownCount === 0) {
                                    stockMsg += `<i>Hozirda barcha mavjud asboblar ijarada.</i>`;
                                }
                            } else {
                                availableItems.slice(0, 15).forEach((item, idx) => {
                                    const name = item.name || item.model_name || `Asbob #${item.id}`;
                                    const price = (item.daily_price || item.price || 0).toLocaleString();
                                    const shelf = item.warehouse_location_shelf || item.shelf || 'A-01';
                                    stockMsg += `${idx + 1}. <b>${name}</b> (Polka: ${shelf})\n   💵 Kunlik: ${price} so'm | 🟢 Bo'sh\n`;
                                });
                            }
                        }

                        if (botToken) await sendTelegramBotMessage(botToken, chatId, stockMsg, null, sellerMenu);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, reply: stockMsg }));
                        return;
                    }

                    // Default response for seller
                    const sellerWelcome = `Assalomu alaykum, <b>${employee.full_name}</b>! Siz tizimga SOTUVCHI sifatida ulangansiz ✅\n\nQuyidagi menyu tugmalaridan birini tanlang:`;
                    if (botToken) await sendTelegramBotMessage(botToken, chatId, sellerWelcome, null, sellerMenu);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, reply: sellerWelcome }));
                    return;
                }

                // =========================================================================
                // B. AUTHENTICATED PARTNER (HAMKOR) ACTIONS
                // =========================================================================

                // ACTION: 📥 Yangi vazifalar
                if (text === "📥 Yangi vazifalar" || text === '/tasks') {
                    const assignedOrders = (db.service_orders || []).filter(o => 
                        (o.assigned_partner_id === partner.id || o.service_category === partner.service_category) && 
                        (o.order_status === 'yangi' || o.order_status === 'hamkorga_uzatildi')
                    );

                    if (assignedOrders.length === 0) {
                        const noTasksMsg = "📥 <b>Hozircha yangi vazifalar yo'q.</b>\nDispetcher sizga yangi buyurtma uzatishi bilan darhol xabar yuboramiz! 🔔";
                        if (botToken) await sendTelegramBotMessage(botToken, chatId, noTasksMsg, null, partnerMenu);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, reply: noTasksMsg }));
                        return;
                    }

                    const o = assignedOrders[0];
                    const serviceText = o.details ? `${o.service_category.toUpperCase()} (${o.details})` : o.service_category.toUpperCase();
                    const taskMsg = 
`🔔 <b>SIZGA YANGI BUYURTMA BIRIKTIRILDI!</b>
🛠 <b>Xizmat:</b> ${serviceText}
📍 <b>Ish joyi:</b> ${o.destination_address || 'Toshkent sh.'}
🕒 <b>Vaqt:</b> ${o.service_date} (${o.execution_time || 'Kelishilgan'})
💵 <b>Sizga to'lanadigan haq:</b> <b>${(o.partner_payout_amount || 0).toLocaleString()} so'm</b>${o.task_instruction ? `\n📋 <b>Topshiriq:</b> ${o.task_instruction}` : ''}`;

                    const inlineButtons = [
                        [{ text: "✅ Qabul qilaman", callback_data: `accept_${o.id}` }, { text: "❌ Rad etaman", callback_data: `reject_${o.id}` }]
                    ];

                    if (botToken) await sendTelegramBotMessage(botToken, chatId, taskMsg, inlineButtons);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, reply: taskMsg }));
                    return;
                }

                // ACTION: 💰 Mening Balansim
                if (text === "💰 Mening Balansim" || text === '/balance') {
                    const completedOrders = (db.service_orders || []).filter(o => o.assigned_partner_id === partner.id && o.order_status === 'bajarildi');
                    const totalEarned = completedOrders.reduce((sum, o) => sum + (o.partner_payout_amount || 0), 0);
                    const currentBalance = partner.balance || totalEarned;

                    const balanceMsg = 
`💰 <b>SIZNING HISOBLAR VA BALANSINGIZ:</b>
🏢 Hamkor: <b>${partner.company_name}</b>

• Jami bajarilgan ishlar: <b>${completedOrders.length} ta</b>
• Jami ishlangan summa: <b>${totalEarned.toLocaleString()} so'm</b>
• Hozirgi to'lanadigan qoldiq: <b style="color:#10b981;">${currentBalance.toLocaleString()} so'm</b>

To'lovlar har hafta seshanba va juma kunlari kassa orqali amalga oshiriladi.`;

                    if (botToken) await sendTelegramBotMessage(botToken, chatId, balanceMsg, null, partnerMenu);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, reply: balanceMsg }));
                    return;
                }

                // ACTION: 🟢/🔴 Mening holatim
                if (text === "🟢/🔴 Mening holatim" || text === '/status') {
                    partner.is_available = !partner.is_available;
                    partner.status = partner.is_available ? 'bosh' : 'band';
                    dbEngine.syncEntireDB(db);

                    const statusMsg = partner.is_available ?
                        `🟢 <b>HOLATINGIZ: BO'SH (Faol)</b>\nDispetcherlar sizni bo'sh deb ko'rishmoqda va yangi buyurtmalarni uzatishlari mumkin.` :
                        `🔴 <b>HOLATINGIZ: BAND (Vaqtinchalik to'xtatilgan)</b>\nSiz hozircha yangi buyurtmalarni qabul qilmaysiz.`;

                    if (botToken) await sendTelegramBotMessage(botToken, chatId, statusMsg, null, partnerMenu);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, reply: statusMsg }));
                    return;
                }

                // ACTION: 🏁 Ishni yakunlash
                if (text === "🏁 Ishni yakunlash" || text === '/finish') {
                    const inProgress = (db.service_orders || []).filter(o => 
                        (o.assigned_partner_id === partner.id || o.service_category === partner.service_category) && 
                        (o.order_status === 'bajarilmoqda' || o.order_status === 'hamkor_qabul_qildi' || o.order_status === 'qabul_qilindi')
                    );
                    if (inProgress.length === 0) {
                        const noActiveMsg = "🏁 <b>Hozirda jarayonda bo'lgan buyurtmangiz yo'q.</b>";
                        if (botToken) await sendTelegramBotMessage(botToken, chatId, noActiveMsg, null, partnerMenu);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: true, reply: noActiveMsg }));
                        return;
                    }

                    const o = inProgress[0];
                    const finishPrompt = 
`🏁 <b>ISHNI YAKUNLASH</b>
Buyurtma: <b>#${o.order_number}</b>
Manzil: ${o.destination_address}
Sizga to'lanadigan haq: <b>${(o.partner_payout_amount || 0).toLocaleString()} so'm</b>

Ish to'liq tugagan bo'lsa, quyidagi tugmani bosing:`;

                    const inlineButtons = [
                        [{ text: "🏁 Bajarildi", callback_data: `finish_${o.id}` }]
                    ];

                    if (botToken) await sendTelegramBotMessage(botToken, chatId, finishPrompt, inlineButtons);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, reply: finishPrompt }));
                    return;
                }

                // Default answer for registered partners
                const defaultMsg = `Salom, ${partner.company_name}! Buyurtmalaringiz va holatingizni quyidagi menyu orqali boshqarishingiz mumkin:`;
                if (botToken) await sendTelegramBotMessage(botToken, chatId, defaultMsg, null, partnerMenu);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, reply: defaultMsg }));

            } catch (e) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: e.message }));
            }
        });
        return;
    }

    // 7. POST /api/partner-bot/dispatch (Send interactive order to partner bot)
    if (req.method === 'POST' && pathname === '/api/partner-bot/dispatch') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body || '{}');
                const db = dbEngine.getEntireDB();
                const botToken = getBotToken(db);
                const orderId = payload.order_id;
                const orderNum = payload.order_number || `SRV-${String(orderId).slice(-4)}`;
                const partnerId = payload.partner_id;
                const partnerPhone = payload.partner_phone;
                const partnerName = payload.partner_name || 'Hamkor';
                const serviceName = payload.service_type || 'Xizmat';
                const details = payload.details || '';
                const payoutAmount = payload.payout_amount || 0;
                const address = payload.address || 'Toshkent sh.';
                const time = payload.time || '10:00';
                const serviceDate = payload.service_date || new Date().toISOString().substring(0, 10);
                const task = payload.task_instruction || details || '';

                // Find partner
                let partner = (db.service_partners || []).find(p => 
                    (partnerId && p.id === partnerId) || 
                    (partnerPhone && ((p.phone_primary || '').replace(/[^\d]/g, '').endsWith(String(partnerPhone).replace(/[^\d]/g, '').slice(-9)))) ||
                    (p.company_name === partnerName)
                );

                // Find order in DB
                const sOrder = (db.service_orders || []).find(o => o.id === orderId || o.order_number === orderNum);
                if (sOrder && sOrder.order_status === 'yangi') {
                    sOrder.order_status = 'hamkorga_uzatildi';
                    dbEngine.syncEntireDB(db);
                }

                const serviceText = details ? `${serviceName} (${details})` : serviceName;
                const dateTimeText = `${serviceDate} ${time}`.trim();
                const botMessage = 
`🔔 SIZGA YANGI BUYURTMA BIRIKTIRILDI!
🛠 Xizmat: ${serviceText}
📍 Ish joyi: ${address}
🕒 Vaqt: ${dateTimeText}
💵 Sizga to'lanadigan haq: ${Number(payoutAmount).toLocaleString()} so'm${task ? `\n📋 Topshiriq: ${task}` : ''}`;

                const inlineKeyboard = [
                    [
                        { text: "✅ Qabul qilaman", callback_data: `accept_${orderId}` },
                        { text: "❌ Rad etaman", callback_data: `reject_${orderId}` }
                    ]
                ];

                let telegramSent = false;
                let sendError = null;

                if (botToken && partner && partner.telegram_chat_id) {
                    try {
                        const tgRes = await sendTelegramBotMessage(botToken, partner.telegram_chat_id, botMessage, inlineKeyboard);
                        telegramSent = !!(tgRes && tgRes.ok);
                    } catch (tgErr) {
                        sendError = tgErr.message;
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    telegram_sent: telegramSent,
                    partner_has_telegram: !!(partner && partner.telegram_chat_id),
                    partner_chat_id: partner ? partner.telegram_chat_id : null,
                    partner_name: partner ? partner.company_name : partnerName,
                    order_id: orderId,
                    order_number: orderNum,
                    bot_message: botMessage,
                    inline_keyboard: inlineKeyboard,
                    error: sendError
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 8. POST /api/partner-bot/callback (Partner presses inline buttons in bot or simulator)
    if (req.method === 'POST' && pathname === '/api/partner-bot/callback') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { order_id, action, partner_name, payout_amount } = payload;
                const db = dbEngine.getEntireDB();
                const sOrder = (db.service_orders || []).find(o => o.id === order_id || o.order_number === order_id);
                const partner = (db.service_partners || []).find(p => (sOrder && p.id === sOrder.assigned_partner_id) || p.company_name === partner_name);

                let newStatus = 'yangi';
                let replyText = '';
                let alertTone = 'info';

                if (action === 'accept') {
                    newStatus = 'hamkor_qabul_qildi';
                    if (sOrder) {
                        sOrder.order_status = 'hamkor_qabul_qildi';
                        sOrder.status = 'hamkor_qabul_qildi';
                    }
                    replyText = "Buyurtma qabul qilindi. Ishni tugatgach [🏁 Bajarildi] tugmasini bosing";
                    alertTone = 'success';
                    recordPartnerLiveEvent({
                        type: 'accept',
                        order_id: order_id,
                        order_number: sOrder ? sOrder.order_number : `SRV-${order_id}`,
                        status: 'hamkor_qabul_qildi',
                        partner_id: partner ? partner.id : null,
                        partner_name: partner ? partner.company_name : (partner_name || 'Hamkor'),
                        message: `✅ Hamkor (${partner ? partner.company_name : 'Hamkor'}) #${sOrder ? sOrder.order_number : order_id} buyurtmani qabul qildi!`
                    });
                } else if (action === 'reject') {
                    newStatus = 'rad_etildi';
                    if (sOrder) {
                        sOrder.order_status = 'rad_etildi';
                        sOrder.status = 'rad_etildi';
                    }
                    replyText = "Hamkor buyurtmani rad etdi, boshqa hamkorni tanlang";
                    alertTone = 'warning';
                    recordPartnerLiveEvent({
                        type: 'reject',
                        order_id: order_id,
                        order_number: sOrder ? sOrder.order_number : `SRV-${order_id}`,
                        status: 'rad_etildi',
                        partner_id: partner ? partner.id : null,
                        partner_name: partner ? partner.company_name : (partner_name || 'Hamkor'),
                        message: `⚠️ Hamkor buyurtmani rad etdi, boshqa hamkorni tanlang!`
                    });
                } else if (action === 'finish') {
                    newStatus = 'bajarildi';
                    if (sOrder) {
                        sOrder.order_status = 'bajarildi';
                        sOrder.status = 'bajarildi';
                    }
                    if (partner) {
                        partner.balance = (partner.balance || 0) + (sOrder ? (sOrder.partner_payout_amount || 0) : Number(payout_amount || 0));
                    }
                    replyText = `🎉 Ish muvaffaqiyatli yakunlandi! Hisobingizga +${Number(payout_amount || (sOrder ? sOrder.partner_payout_amount : 0) || 0).toLocaleString()} so'm qo'shildi.`;
                    alertTone = 'success';
                    recordPartnerLiveEvent({
                        type: 'finish',
                        order_id: order_id,
                        order_number: sOrder ? sOrder.order_number : `SRV-${order_id}`,
                        status: 'bajarildi',
                        partner_id: partner ? partner.id : null,
                        partner_name: partner ? partner.company_name : (partner_name || 'Hamkor'),
                        payout_amount: sOrder ? sOrder.partner_payout_amount : Number(payout_amount || 0),
                        message: `🏁 Hamkor (${partner ? partner.company_name : 'Hamkor'}) #${sOrder ? sOrder.order_number : order_id} buyurtmani yakunladi!`
                    });
                }

                dbEngine.syncEntireDB(db);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    order_id: order_id,
                    action: action,
                    new_status: newStatus,
                    partner_name: partner ? partner.company_name : (partner_name || 'Hamkor'),
                    reply_text: replyText,
                    alert_tone: alertTone,
                    timestamp: new Date().toLocaleTimeString('uz-UZ')
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 8a. GET /api/partner-bot/live-events (Real-time live updates for seller web dashboard)
    if (req.method === 'GET' && pathname === '/api/partner-bot/live-events') {
        const since = parseInt(parsedUrl.searchParams.get('since') || '0', 10);
        const freshEvents = partnerLiveEvents.filter(ev => ev.timestamp > since);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            server_time: Date.now(),
            events: freshEvents
        }));
        return;
    }

    // 8b. POST /api/partner-bot/verify-phone (Simulator & Web Partner/Seller Verification)
    if (req.method === 'POST' && pathname === '/api/partner-bot/verify-phone') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const phone = (payload.phone || '').replace(/[^\d]/g, '');
                const db = dbEngine.getEntireDB();

                // 1. Check users (employees)
                const employee = (db.users || []).find(u => {
                    const uPhone = (u.phone || '').replace(/[^\d]/g, '');
                    return uPhone && phone.endsWith(uPhone.slice(-9));
                });

                if (employee) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        verified: true,
                        role: 'seller',
                        user: employee,
                        message: `Xush kelibsiz, ${employee.full_name}! (Sotuvchi)`
                    }));
                    return;
                }

                // 2. Check partners
                const partner = (db.service_partners || []).find(p => {
                    const p1 = (p.phone_primary || '').replace(/[^\d]/g, '');
                    const p2 = (p.phone_secondary || '').replace(/[^\d]/g, '');
                    return (p1 && phone.endsWith(p1.slice(-9))) || (p2 && phone.endsWith(p2.slice(-9)));
                });

                if (partner) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        verified: true,
                        role: 'partner',
                        partner: partner,
                        message: `Xush kelibsiz, ${partner.company_name}! (Hamkor)`
                    }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: false,
                        verified: false,
                        message: "Sizning raqamingiz xodimlar yoki hamkorlar bazasida topilmadi. Admin bilan bog'laning"
                    }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 8c. POST /api/partner-bot/toggle-status (Toggle Bo'sh / Band)
    if (req.method === 'POST' && pathname === '/api/partner-bot/toggle-status') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const partnerId = payload.partner_id;
                const db = dbEngine.getEntireDB();
                const partner = (db.service_partners || []).find(p => p.id === partnerId);

                if (partner) {
                    partner.is_available = payload.is_available !== undefined ? !!payload.is_available : !partner.is_available;
                    partner.status = partner.is_available ? 'bosh' : 'band';
                    dbEngine.syncEntireDB(db);

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        partner_id: partner.id,
                        is_available: partner.is_available,
                        status: partner.status
                    }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Hamkor topilmadi" }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 9. GET /api/db (Fetch full persistent database from SQLite)
    if (req.method === 'GET' && pathname === '/api/db') {
        try {
            const entireDB = dbEngine.getEntireDB();
            const jsonResp = JSON.stringify({
                success: true,
                is_sqlite: dbEngine.isSQLiteAvailable,
                source: dbEngine.isSQLiteAvailable ? 'SQLite (data/wms_database.sqlite)' : 'JSON Backup',
                db: entireDB,
                timestamp: new Date().toISOString()
            });
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(jsonResp);
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // 10. POST /api/db/sync (Persist full database to SQLite immediately on every change)
    if (req.method === 'POST' && pathname === '/api/db/sync') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const saveResult = dbEngine.saveEntireDB(payload);
                res.writeHead(200, {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(JSON.stringify({
                    success: true,
                    message: "Barcha ma'lumotlar SQLite bazasiga xavfsiz saqlandi",
                    is_sqlite: dbEngine.isSQLiteAvailable,
                    saved_at: saveResult.saved_at,
                    cache_status: dbEngine.getCacheStatus()
                }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 11. GET /api/system/cache-status (Database and memory cache status)
    if (req.method === 'GET' && pathname === '/api/system/cache-status') {
        try {
            const status = dbEngine.getCacheStatus();
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({ success: true, status }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // 12. POST /api/system/clear-cache (Prune logs, reclaim SQLite memory and clean temp files)
    if (req.method === 'POST' && pathname === '/api/system/clear-cache') {
        try {
            const report = dbEngine.cleanupCache(300);
            res.writeHead(200, {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            res.end(JSON.stringify({
                success: true,
                message: "Server keshlari va xotira muvaffaqiyatli tozalandi",
                report: report,
                status: dbEngine.getCacheStatus()
            }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: e.message }));
        }
        return;
    }

    // =========================================================================
    // STATIC FILE SERVING & SPA FALLBACK
    // =========================================================================
    let reqUrl = pathname;
    if (reqUrl === '/' || reqUrl === '') {
        reqUrl = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, reqUrl);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If not found, serve index.html for SPA behavior
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e, fallback) => {
                    if (e) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(fallback);
                    }
                });
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`   WMS ARENDA ERP - ADMIN BOSHQARUV TIZIMI`);
    console.log(`   Server ishga tushdi: http://localhost:${PORT}`);
    console.log(`   Public REST API:`);
    console.log(`   - POST http://localhost:${PORT}/api/public/orders`);
    console.log(`   - GET  http://localhost:${PORT}/api/public/tools/available`);
    console.log(`   - GET  http://localhost:${PORT}/api/public/orders`);
    console.log(`====================================================`);
});
