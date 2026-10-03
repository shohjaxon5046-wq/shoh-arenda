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

// Available tools catalog for public API
const PUBLIC_AVAILABLE_TOOLS = [
    {
        model_id: 1,
        name: "Perforator Bosch GBH 2-26 DRE",
        brand: "Bosch",
        category: "Elektr asboblar",
        daily_price: 80000,
        hourly_price: 15000,
        deposit_amount: 400000,
        available_count: 2,
        total_count: 3,
        status: "mavjud",
        specs: { "Quvvati": "800W", "Og'irligi": "2.7 kg", "Patron": "SDS-Plus", "Zarba kuchi": "2.7 J" },
        kit_items: ["Keys/Chemodan", "2 ta bur", "Qo'shimcha tutqich", "Chuqurlik o'lchagich"]
    },
    {
        model_id: 2,
        name: "Otboyniy Molotok Makita HM1203C",
        brand: "Makita",
        category: "Elektr asboblar",
        daily_price: 150000,
        hourly_price: 25000,
        deposit_amount: 700000,
        available_count: 1,
        total_count: 2,
        status: "mavjud",
        specs: { "Quvvati": "1510W", "Og'irligi": "9.7 kg", "Patron": "SDS-Max", "Zarba kuchi": "19.1 J" },
        kit_items: ["Metall keys", "1 ta pik (nayza)", "1 ta lopatka", "Maxsus moylash moyi"]
    },
    {
        model_id: 3,
        name: "Benzinli Generator Honda EM5500CXS",
        brand: "Honda",
        category: "Benzinli texnika",
        daily_price: 200000,
        hourly_price: 35000,
        deposit_amount: 1000000,
        available_count: 1,
        total_count: 1,
        status: "mavjud",
        specs: { "Quvvati": "5.5 kVA", "Yoqilg'i": "Benzin AI-92", "Bak hajmi": "25 L", "Ishlash vaqti": "8 soat" },
        kit_items: ["G'ildiraklar to'plami", "Zaryadka klemmalari", "Svecha kaliti"]
    },
    {
        model_id: 4,
        name: "Payvandlash Apparati Resanta SAI-220",
        brand: "Resanta",
        category: "Payvandlash",
        daily_price: 60000,
        hourly_price: 12000,
        deposit_amount: 300000,
        available_count: 2,
        total_count: 2,
        status: "mavjud",
        specs: { "Tok kuchi": "10-220 A", "Elektrod": "1.6 - 5.0 mm", "Og'irligi": "4.9 kg" },
        kit_items: ["Massa kabeli", "Elektrod ushlagich kabel", "Himoya niqobi"]
    }
];

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
const GEMINI_SYSTEM_INSTRUCTION = `Sen "WMS ARENDA" qurilish asboblari ijarasi va maxsus xizmatlar platformasining 24/7 ishlovchi jonli, samimiy, xushmuomala AI maslahatchisi hamda sotuvchi-operatorisan.
Isming: WMS Arenda AI Yordamchisi.
Mijoz qaysi tilda murojaat qilsa (O'zbek yoki Rus), xuddi shu tilda ravon, tabiiy, do'stona va professional javob ber.

ASOSIY VAZIFALAR VA QOIDALAR:
1. Sen qurilish asboblari ijarasi, kran xizmati, musor (chiqindi) olib ketish va gruzchik (yuk tashish) xizmatlari bo'yicha mijozlarga to'liq ma'lumot berasan, narxlarni aniq hisoblab berasan va buyurtmalarni qabul qilasan.
2. Omborda yo'q asbobni hech qachon "bor" deb aldamagin. Faqat quyidagi bazadagi asboblar va narxlar asosida javob ber. Narxlarni o'zboshimchalik bilan o'zgartirma.
3. Jonli insondek, o'ta xushmuomala va yordamga shay bo'l.

KATALOG VA ANIQ TARIFLAR BAZASI:

1. QURILISH ASBOBLARI IJARASI (Omborda mavjud modellar):
• Perforator Bosch GBH 2-26 DRE — 1 kunlik ijara: 80 000 so'm, Zalog (garov): 400 000 so'm (bur'gilar to'plami va keysi bilan).
• Otboynik (Otboyniy molotok) Makita HM1203C — 1 kunlik ijara: 150 000 so'm, Zalog: 700 000 so'm (og'ir zarbali, pika va lopatka bilan).
• Benzin generator Honda 5.5 kVt — 1 kunlik ijara: 200 000 so'm, Zalog: 1 000 000 so'm (220V kabel va leykasi bilan).
• Payvandlash apparati (Svarka) Resanta SAI 220 — 1 kunlik ijara: 60 000 so'm, Zalog: 300 000 so'm (xameleon maska va kabel bilan).
• Bolgarka (UGM) Makita 230mm — 1 kunlik ijara: 70 000 so'm, Zalog: 350 000 so'm (himoya qopqog'i va kaliti bilan).
• Vibroplita (Trambovka) 90 kg — 1 kunlik ijara: 180 000 so'm, Zalog: 800 000 so'm (rezina taglik bilan).

2. AVTOKRAN XIZMATI:
• 16 tonna: 1 soati 300 000 so'm (Minimal buyurtma: 2 soat).
• 25 tonna: 1 soati 350 000 so'm (Minimal buyurtma: 3 soat).
• 50 tonna: 1 soati 600 000 so'm (Minimal buyurtma: 4 soat).
• Shahardan tashqariga chiqish (yo'l kira): 1 km uchun 15 000 so'm qo'shimcha.
• Barcha kranlar malakali haydovchi-mashinist bilan xizmat ko'rsatadi.

3. QURILISH CHIQINDILARINI (MUSOR) OLIB KETISH:
• Mashina turi bo'yicha (1 reys narxi):
  - Gazel (1.5 tonna yoki 40-50 qopgacha) = 400 000 so'm / reys.
  - ZIL (5-6 tonna yoki 150 qopgacha) = 800 000 so'm / reys.
  - KamAZ (10-15 tonna yoki 300 qopgacha) = 1 500 000 so'm / reys.
• Qoplab tashish tarifi: 1 qop uchun 12 000 so'm (minimal buyurtma: 20 qop).
• Mashinaga yuklash (yuk ortish): Mashina uchun 150 000 so'm yoki 1 qopga 3 000 so'm.
• Agar etajdan (qavatdan) tushirish kerak bo'lsa: har bir qavat uchun 1 qopga +2 000 so'm qo'shiladi.
• MUHIM QOIDA: Agar mijoz "Musor qancha bo'ladi?", "Musor narxi qancha?", "Сколько стоит вывоз мусора?" deb umumiy so'rasa — birdaniga bitta narx aytib ketma! Darhol samimiy va xushmuomala tarzda hajmini aniqlashtir:
  "Assalomu alaykum! Qurilish chiqindilarini (musor) mamnuniyat bilan olib ketamiz. Sizga eng maqbul va aniq narxni hisoblab berishim uchun quyidagilarni aytib bera olasizmi:
  1. Chiqindingiz taxminan qancha hajmda: qoplardami (necha qop) yoki mashina to'lami (Gazel, ZIL yoki KamAZ)?
  2. Bino nechanchi qavatda va lift bormi?
  3. Chiqindini mashinaga yuklash uchun biz tomondan gruzchiklar (ishchilar) kerakmi?
  Shularni aytsangiz, narxini darhol aniq hisoblab beraman!" deb so'ra.
  Mijoz parametrlarni (masalan, 30 ta qop, 4-etaj, liftsiz) aytishi bilan darhol to'liq narxni formula bo'yicha hisoblab ko'rsat.

4. GRUZCHIK (YUK TASHISH) XIZMATI:
• Qavatlarga ko'tarish/tushirish: 1 qop (50 kg) sement/qorishma uchun 1 qavatga 3 000 so'm.
• Agar lift ishlasa: qavatidan qat'i nazar 1 qop uchun 1 500 so'm.
• Soatbay ish: 1 ishchi uchun 1 soatiga 50 000 so'm (minimal buyurtma: 2 soat).
• Ishchilar soni tavsiyasi: 500 kg gacha — 1 kishi; 500 kg dan 1.5 tonnagacha — 2 kishi; 1.5 t dan 3 tonnagacha — 3-4 kishi; 3 tonnadan oshsa — 4+ kishi.

5. BUYURTMA RASMIYLASHTIRISH:
• Mijoz biror xizmat yoki asbobni zakaz qilmoqchi bo'lsa yoki telefon raqamini yozsa:
  "Katta rahmat! Buyurtmangiz qabul qilindi. Operatorimiz 5 daqiqada siz bilan bog'lanib, barcha tafsilotlarni tasdiqlaydi. Iltimos, ismingiz, aniq yetkazib berish manzili va qulay vaqtni ham yozib qoldiring!" deb iliq javob ber.

6. BOSH ADMIN HISOBOTI (MAXFIY):
• Foydalanuvchi "kassa", "hisobot", "foyda", "kechikkan asboblar" so'rasa, faqat maxfiy PIN kod "7788" (yoki /admin 7788) kiritilgan bo'lsa javob ber:
  - Bugungi kassa tushumi: 1 450 000 so'm
  - Saqlanayotgan zaloglar: 1 100 000 so'm
  - Shu oylik sof foyda: 18 200 000 so'm
  - Kechikkan buyurtmalar: 1 ta (Mijoz: Ali Valiyev, Tel: +998 90 123-45-67, Uskuna: Perforator Bosch GBH 2-26, 1 kun kechikkan).
• Agar PIN kod kiritilmagan bo'lsa: "Kechirasiz, ushbu moliyaviy ma'lumotlar maxfiy! Hisobotni ko'rish uchun maxfiy PIN kodni yozing (masalan: /admin 7788)." deb javob ber.`;

function callGoogleGeminiAPI(apiKey, userMessage, conversationHistory = []) {
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
                parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
            },
            contents: contents,
            generationConfig: {
                temperature: 0.7,
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

function callGroqAPI(apiKey, userMessage, conversationHistory = [], modelName = 'llama-3.3-70b-versatile') {
    return new Promise((resolve, reject) => {
        if (!apiKey) {
            return reject(new Error("GROQ_API_KEY_REQUIRED"));
        }

        const messages = [
            { role: 'system', content: GEMINI_SYSTEM_INSTRUCTION }
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
            temperature: 0.7,
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

// =========================================================================
// SERVER-SIDE STATEFUL CONVERSATION SESSIONS (MULTI-TURN MEMORY)
// =========================================================================
const serverAISessions = new Map();

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

function detectServerService(text) {
    if (!text) return null;
    const lower = text.toLowerCase();

    if (lower.includes('kran') || lower.includes('avtokran') || lower.includes('кран')) {
        let title = "Avtokran xizmati (25t)";
        let quote = "Avtokran xizmati: 16t kran — 300 000 so'm/soat (minimal 2 soat), 25t kran — 350 000 so'm/soat (minimal 3 soat).";
        let estPrice = 1050000;
        if (lower.includes('16')) { title = "Avtokran 16t"; estPrice = 600000; }
        return { service_type: 'kran', service_title: title, price_quote: quote, estimated_price: estPrice };
    }

    if (lower.includes('musor') || lower.includes('chiqindi') || lower.includes('axlat') || lower.includes('мусор')) {
        return {
            service_type: 'musor',
            service_title: "Qurilish chiqindilarini (musor) olib ketish",
            price_quote: "Qurilish chiqindilarini (musor) olib ketish narxlari: Gazel (1.5t gacha) — 400 000 so'm, ZIL (5t) — 800 000 so'm. Agar qoplarda bo'lsa — donasi 12 000 so'mdan.",
            estimated_price: 400000
        };
    }

    if (lower.includes('gruzchik') || lower.includes('ishchi') || lower.includes('yukchi') || lower.includes('грузчик')) {
        return {
            service_type: 'gruzchik',
            service_title: "Yuk ko'taruvchilar (Gruzchik) xizmati",
            price_quote: "Yuk ko'taruvchilar (Gruzchik) xizmati: 1 qop uchun 1 qavatga 3 000 so'm (liftda 1 500 so'm). Soatbay ish bo'lsa: 50 000 so'm/soat (kamida 2 soat).",
            estimated_price: 150000
        };
    }

    // Tools catalog check
    for (const t of PUBLIC_AVAILABLE_TOOLS) {
        if (lower.includes(t.name.toLowerCase()) || lower.includes(t.brand.toLowerCase()) || lower.includes('perforator') || lower.includes('generator')) {
            const tool = lower.includes('generator') ? PUBLIC_AVAILABLE_TOOLS[2] : (lower.includes('otboynik') ? PUBLIC_AVAILABLE_TOOLS[1] : t);
            return {
                service_type: 'asbob',
                service_title: tool.name,
                tool_id: tool.model_id,
                price_quote: `${tool.name} — Kunlik ijarasi: ${tool.daily_price.toLocaleString()} so'm, Zalog: ${tool.deposit_amount.toLocaleString()} so'm (omborda ${tool.available_count} ta mavjud).`,
                estimated_price: tool.daily_price,
                deposit_amount: tool.deposit_amount
            };
        }
    }

    return null;
}

function generateAutonomousAIResponse(userMessage, conversationHistory = [], role = 'customer', adminPin = '', sessionId = 'default') {
    const raw = (userMessage || '').trim();
    const lower = raw.toLowerCase();
    const session = getServerSession(sessionId);

    // 1. Reset check
    if (lower === 'bekor qilish' || lower === 'boshidan' || lower === 'yangi zakaz' || lower === 'reset') {
        resetServerSession(sessionId);
        return { reply: "Joriy suhbat tozalandi. Qanday xizmat kerak: Avtokran, Musor olib ketish, Gruzchik yoki Qurilish asbobi?", step: 'init' };
    }

    // 2. Admin command check (/admin 7788)
    if (lower.startsWith('/admin') || (role === 'admin' && (lower.includes('kassa') || lower.includes('hisobot')))) {
        const hasPin = lower.includes('7788') || adminPin === '7788' || role === 'admin';
        if (hasPin) {
            const timeStr = new Date().toLocaleString('uz-UZ');
            return {
                reply: `🔒 **Bosh Admin Rejimi Faol!**\n\n📊 **Bugungi Kassa va Biznes Hisoboti (${timeStr}):**\n• Bugungi kassa tushumi: 1 450 000 so'm\n• Saqlanayotgan zaloglar: 1 100 000 so'm\n• Shu oylik Toza Foyda: 18 200 000 so'm\n• Kechikkan buyurtmalar: 1 ta (Mijoz: Ali Valiyev, Tel: +998 90 123-45-67)\n\nBarcha uskunalar nazorat ostida!`,
                function_called: "get_admin_daily_stats"
            };
        } else {
            return { reply: "🔒 Ushbu hisobot faqat Bosh Admin uchun ochiq. Iltimos, PIN kodni kiriting: /admin 7788", function_called: "get_admin_daily_stats" };
        }
    }

    // Smart extraction
    const phone = extractServerPhoneNumber(raw);
    const time = extractServerBookingTime(raw);
    const address = extractServerAddress(raw);
    const service = detectServerService(raw);

    if (service) {
        session.service_type = service.service_type;
        session.service_title = service.service_title;
        session.estimated_price = service.estimated_price;
        session.deposit_amount = service.deposit_amount || 0;
        session.tool_id = service.tool_id || null;
    }

    if (phone) session.phone = phone;
    if (time && session.step !== 'awaiting_address') session.booking_time = time;

    // STEP 4: Phone entered or all required fields captured
    if (session.step === 'awaiting_phone' || (phone && session.service_type && session.address)) {
        if (phone) {
            session.phone = phone;
            if (!session.booking_time) session.booking_time = time || "Kelishilgan vaqtda";

            // Persist web order to disk / SQLite
            const orders = loadWebOrders();
            const orderNum = `ORD-${String(orders.length + 1).padStart(4, '0')}`;
            const newWebOrder = {
                id: Date.now(),
                order_number: orderNum,
                customer_name: "AI Mijoz",
                customer_phone: session.phone,
                service_type: session.service_type,
                service_details: session.service_title,
                delivery_address: session.address || 'Toshkent shahri',
                requested_date: session.booking_time,
                status: "yangi",
                created_at: new Date().toLocaleString('uz-UZ'),
                source: "ai_agent"
            };
            orders.unshift(newWebOrder);
            saveWebOrders(orders);

            const receipt = 
`🎉 BUYURTMANGIZ QABUL QILINDI! #${orderNum}

🛠 Xizmat: ${session.service_title}
📍 Manzil: ${session.address}
🕒 Vaqt: ${session.booking_time}
📞 Telefon: ${session.phone}

Operatorimiz 5 daqiqada siz bilan bog'lanadi!`;

            resetServerSession(sessionId);
            return { reply: receipt, order_number: orderNum, step: 'completed' };
        } else {
            return { reply: "Iltimos, buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)", step: 'awaiting_phone' };
        }
    }

    // STEP 3: Awaiting Time
    if (session.step === 'awaiting_time') {
        session.booking_time = time || raw;
        if (phone) {
            session.phone = phone;
            return generateAutonomousAIResponse(phone, conversationHistory, role, adminPin, sessionId);
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
            return { reply: `Manzil: ${session.address} qabul qilindi! ✅\nAjoyib! Buyurtmani tasdiqlash uchun telefon raqamingizni yozing: (Masalan: +998 90 123-45-67)`, step: 'awaiting_phone' };
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
            return generateAutonomousAIResponse(phone, conversationHistory, role, adminPin, sessionId);
        }
        if (address) {
            session.address = address;
            session.step = 'awaiting_time';
            return { reply: `${service.price_quote}\n\nManzil: ${session.address} qabul qilindi! ✅ Uskuna / xizmat qaysi kunga va soat nechiga kerak?`, step: 'awaiting_time' };
        }
        session.step = 'awaiting_address';
        return { reply: `${service.price_quote}\n\nManzilingizni yozing (ko'cha, uy raqami)?`, step: 'awaiting_address' };
    }

    return {
        reply: `Assalomu alaykum! WMS Arenda xizmatiga xush kelibsiz!\n\nBiz quyidagi xizmatlarni taqdim etamiz:\n1. 🏗 **Avtokran xizmati** (16t, 25t, 50t);\n2. 🚛 **Qurilish chiqindilarini (musor) olib ketish**;\n3. 👷‍♂️ **Yuk ko'taruvchilar (Gruzchik) xizmati**;\n4. 🛠 **Qurilish asboblari ijarasi** (Perforator, Otboynik, Generator, Svarka va h.k.).\n\nSizga qaysi xizmat yoki uskuna kerak?`,
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
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            success: true,
            status: "success",
            timestamp: new Date().toISOString(),
            total_available_models: PUBLIC_AVAILABLE_TOOLS.length,
            tools: PUBLIC_AVAILABLE_TOOLS
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
    // REST API ENDPOINTS FOR AI AGENT & TELEGRAM BOT (BO'LIM 9 - REAL GEMINI API)
    // =========================================================================

    // 5. POST /api/chat & /api/ai/chat (Autonomous Builtin NLP Engine + Optional LLM Proxy)
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
                const role = payload.role || 'customer';
                const adminPin = payload.admin_pin || '';

                if (!userMessage) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: "Xabar matni kiritilmadi (message is required)" }));
                    return;
                }

                // If user explicitly configured Groq with an API key
                if (requestedProvider === 'groq') {
                    const apiKey = process.env.GROQ_API_KEY || rawKey;
                    if (apiKey) {
                        try {
                            const model = payload.model || 'llama-3.3-70b-versatile';
                            const groqReply = await callGroqAPI(apiKey, userMessage, history, model);
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
                            console.warn("Groq API error, falling back to autonomous engine:", groqErr.message);
                        }
                    }
                }

                // If user explicitly configured Gemini with an API key
                if (requestedProvider === 'gemini') {
                    const apiKey = process.env.GEMINI_API_KEY || rawKey;
                    if (apiKey) {
                        try {
                            const geminiReply = await callGoogleGeminiAPI(apiKey, userMessage, history);
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
                            console.warn("Gemini API error, falling back to autonomous engine:", geminiErr.message);
                        }
                    }
                }

                // Default & Offline: Standalone Autonomous Built-in NLP Engine (Zero keys needed)
                const sessionId = payload.session_id || payload.chat_id || 'default';
                const autoResponse = generateAutonomousAIResponse(userMessage, history, role, adminPin, sessionId);
                if (!res.headersSent) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({
                        success: true,
                        live_llm: false,
                        provider: "builtin",
                        model: "wms-builtin-nlp",
                        reply: autoResponse.reply,
                        function_called: autoResponse.function_called || null,
                        function_result: autoResponse.function_result || null
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

    // 6. POST /api/ai/telegram-webhook (Telegram Bot Webhook Handler with Autonomous AI)
    if (req.method === 'POST' && pathname === '/api/ai/telegram-webhook') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const update = JSON.parse(body || '{}');
                const message = update.message || {};
                const chatId = message.chat?.id;
                const text = (message.text || '').trim();

                let botReply = '';
                if (text === '/start') {
                    botReply = "Assalomu alaykum! WMS ARENDA AI Yordamchisiga xush kelibsiz! Qurilish asboblari ijarasi, kran, musor va gruzchik xizmatlari bo'yicha qanday yordam bera olaman?";
                } else if (process.env.GROQ_API_KEY) {
                    try {
                        botReply = await callGroqAPI(process.env.GROQ_API_KEY, text, []);
                    } catch (e) {
                        const autoResp = generateAutonomousAIResponse(text);
                        botReply = autoResp.reply;
                    }
                } else if (process.env.GEMINI_API_KEY) {
                    try {
                        botReply = await callGoogleGeminiAPI(process.env.GEMINI_API_KEY, text, []);
                    } catch (e) {
                        const autoResp = generateAutonomousAIResponse(text);
                        botReply = autoResp.reply;
                    }
                } else {
                    const autoResp = generateAutonomousAIResponse(text);
                    botReply = autoResp.reply;
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    ok: true,
                    chat_id: chatId,
                    reply_sent: botReply
                }));
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
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const orderId = payload.order_id;
                const orderNum = payload.order_number || `SRV-${String(orderId).slice(-4)}`;
                const partnerName = payload.partner_name || 'Hamkor';
                const serviceName = payload.service_type || 'Xizmat';
                const payoutAmount = payload.payout_amount || 0;
                const address = payload.address || 'Toshkent sh.';
                const time = payload.time || '10:00';
                const task = payload.task_instruction || payload.details || 'Ko\'rsatma berilmagan';

                const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
                const botMessage = 
`🔔 YANGI BUYURTMA! (#${orderNum})
🏢 WMS ARENDA DISPECHERLIK
🛠 Xizmat: ${serviceName}
📍 Ish joyi: ${address}
🗺 Xarita: ${mapUrl}
🕒 Vaqt: Bugun soat ${time} da
💵 Sizga to'lanadigan summa: ${Number(payoutAmount).toLocaleString()} so'm
📋 Topshiriq: ${task}`;

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    status: "sent",
                    order_id: orderId,
                    order_number: orderNum,
                    partner_name: partnerName,
                    bot_message: botMessage,
                    map_url: mapUrl,
                    inline_keyboard: [
                        [{ text: "✅ Qabul qilaman", callback_data: `accept_${orderId}` }],
                        [{ text: "❌ Bandman / Rad etish", callback_data: `reject_${orderId}` }],
                        [{ text: "📍 Xaritada ko'rish", url: mapUrl }]
                    ]
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: e.message }));
            }
        });
        return;
    }

    // 8. POST /api/partner-bot/callback (Partner presses inline buttons in bot)
    if (req.method === 'POST' && pathname === '/api/partner-bot/callback') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body || '{}');
                const { order_id, action, partner_name, payout_amount } = payload;

                let newStatus = 'yangi';
                let replyText = '';
                let alertTone = 'info';

                if (action === 'accept') {
                    newStatus = 'bajarilmoqda';
                    replyText = `👍 Buyurtma #${order_id} qabul qilindi! Ishni bajargach, [🏁 Ish yakunlandi] tugmasini bosing.`;
                    alertTone = 'success';
                } else if (action === 'reject') {
                    newStatus = 'yangi';
                    replyText = `❌ Buyurtma rad etildi. Boshqa buyurtmalar kutmoqda!`;
                    alertTone = 'warning';
                } else if (action === 'finish') {
                    newStatus = 'bajarildi';
                    replyText = `🎉 Ish muvaffaqiyatli yakunlandi! Hisobingizga +${Number(payoutAmount || 0).toLocaleString()} so'm qo'shildi. Rahmat!`;
                    alertTone = 'success';
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    success: true,
                    order_id: order_id,
                    action: action,
                    new_status: newStatus,
                    partner_name: partnerName || 'Hamkor',
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
