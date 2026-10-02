// =========================================================================
// SECTION 12: MOBIL QULAYLIKLAR (KAMERA BILAN SKANERLASH, PWA) VA 
// HAMKORLAR UCHUN INTERAKTIV TELEGRAM BOT & UNIVERSAL SEARCH (CTRL+K)
// =========================================================================

let audioCtx = null;
let cameraStream = null;
let scanIntervalTimer = null;
let activeScannerContext = 'universal'; // 'pos', 'return', 'universal', 'shelf'
let customScanCallback = null;
let deferredInstallPrompt = null;
let activeBotSimulatorOrderId = null;

// -------------------------------------------------------------------------
// 1. WEB AUDIO API - SCANNER BEEP SOUND
// -------------------------------------------------------------------------
function playScanBeep(freq = 1900, durationMs = 110) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        // Quick high-tone chirp at start
        osc.frequency.exponentialRampToValueAtTime(freq + 300, audioCtx.currentTime + 0.03);
        osc.frequency.exponentialRampToValueAtTime(freq, audioCtx.currentTime + (durationMs / 1000));

        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (durationMs / 1000));

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + (durationMs / 1000));
    } catch (e) {
        console.warn('AudioContext beep error:', e);
    }
}


// -------------------------------------------------------------------------
// 2. KAMERA ORQALI SHTRIX-KOD VA QR-KOD SKANERLASH (BARCODE SCANNER)
// -------------------------------------------------------------------------

/**
 * Open camera barcode scanner modal
 * @param {string} context - 'pos' | 'return' | 'universal' | 'shelf'
 * @param {function} onScan - custom callback if needed
 */
async function openCameraScanner(context = 'universal', onScan = null) {
    activeScannerContext = context;
    customScanCallback = onScan;

    const modal = document.getElementById('modal-camera-barcode-scanner');
    const statusEl = document.getElementById('scanner-status-text');
    const resultBox = document.getElementById('scanner-last-result');
    const videoEl = document.getElementById('scanner-video-feed');
    const manualInput = document.getElementById('scanner-manual-input');

    if (manualInput) manualInput.value = '';
    if (resultBox) {
        resultBox.innerText = '';
        resultBox.parentElement?.classList.add('hidden');
    }

    const contextTitles = {
        pos: "Buyurtma Savatiga Asbob Qo'shish",
        return: "Priyomka: Asbobni Qabul Qilish",
        universal: "Tezkor Shtrix-kod / QR Qidiruv",
        shelf: "Polka / Yacheyka Shtrix-kodini Skanerlash"
    };

    const titleEl = document.getElementById('scanner-context-title');
    if (titleEl) titleEl.innerText = contextTitles[context] || "Shtrix-kod Skaner";

    openModal('modal-camera-barcode-scanner');
    lucide.createIcons();

    if (statusEl) {
        statusEl.innerText = "Kamera faollashtirilmoqda...";
        statusEl.className = "text-xs font-semibold text-amber-400 flex items-center justify-center gap-1.5";
    }

    try {
        // Request video stream with environment (back) camera
        const constraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoEl) {
            videoEl.srcObject = cameraStream;
            videoEl.setAttribute("playsinline", true); // required for iOS Safari
            await videoEl.play();
        }

        if (statusEl) {
            statusEl.innerText = "Kamera tayyor. Shtrix-kodni qizil chiziqqa to'g'irlang";
            statusEl.className = "text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5";
        }

        startLiveBarcodeDetection(videoEl);

    } catch (err) {
        console.warn("Camera access failed or denied:", err);
        if (statusEl) {
            statusEl.innerText = "Kamera topilmadi yoki ruxsat berilmadi. Shtrix-kodni qo'lda kiriting.";
            statusEl.className = "text-xs font-semibold text-red-400 flex items-center justify-center gap-1.5";
        }
        document.getElementById('scanner-manual-box')?.classList.remove('hidden');
    }
}

function closeCameraScanner() {
    stopCameraStream();
    closeModal('modal-camera-barcode-scanner');
}

function stopCameraStream() {
    if (scanIntervalTimer) {
        clearInterval(scanIntervalTimer);
        scanIntervalTimer = null;
    }
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
            track.stop();
        });
        cameraStream = null;
    }
    const videoEl = document.getElementById('scanner-video-feed');
    if (videoEl) {
        videoEl.srcObject = null;
    }
}

/**
 * Starts continuous frame scanning via BarcodeDetector API or Canvas Fallback
 */
function startLiveBarcodeDetection(videoEl) {
    if (scanIntervalTimer) clearInterval(scanIntervalTimer);

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let barcodeDetector = null;

    if (hasBarcodeDetector) {
        try {
            barcodeDetector = new BarcodeDetector({
                formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a', 'upc_e', 'data_matrix']
            });
        } catch (e) {
            console.warn("BarcodeDetector formats init failed:", e);
        }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let isProcessing = false;

    scanIntervalTimer = setInterval(async () => {
        if (!videoEl || videoEl.readyState !== videoEl.HAVE_ENOUGH_DATA || isProcessing) return;

        isProcessing = true;
        try {
            if (barcodeDetector) {
                const barcodes = await barcodeDetector.detect(videoEl);
                if (barcodes && barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    handleDetectedBarcode(code);
                }
            } else {
                // Canvas fallback for environments without BarcodeDetector
                canvas.width = videoEl.videoWidth || 640;
                canvas.height = videoEl.videoHeight || 480;
                ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                // Canvas pixel check (simulation of barcode detection)
            }
        } catch (err) {
            // detection frame skip
        } finally {
            isProcessing = false;
        }
    }, 250);
}

/**
 * Triggered when a barcode string is scanned or entered manually
 */
function handleDetectedBarcode(rawCode) {
    const code = (rawCode || '').trim();
    if (!code) return;

    // Beep sound!
    playScanBeep();

    // Vibrate mobile device if supported
    if (navigator.vibrate) {
        navigator.vibrate(100);
    }

    const resultBox = document.getElementById('scanner-last-result');
    if (resultBox) {
        resultBox.innerText = code;
        resultBox.parentElement?.classList.remove('hidden');
    }

    const statusEl = document.getElementById('scanner-status-text');
    if (statusEl) {
        statusEl.innerText = `Skanerlandi: ${code} ✅`;
        statusEl.className = "text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5";
    }

    // Call custom callback if provided
    if (typeof customScanCallback === 'function') {
        customScanCallback(code);
        closeCameraScanner();
        return;
    }

    // Process barcode based on context
    processBarcodeAction(code, activeScannerContext);
}

function handleScannerManualSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('scanner-manual-input');
    const code = input?.value.trim();
    if (code) {
        handleDetectedBarcode(code);
    }
}

/**
 * Route scanned barcode to the appropriate business logic
 */
function processBarcodeAction(code, context) {
    const cleanCode = code.toUpperCase();

    // 1. Check if barcode matches a tool unit serial number or barcode
    const allUnits = (DB.product_units || []);
    const unit = allUnits.find(u => 
        (u.serial_number && u.serial_number.toUpperCase() === cleanCode) ||
        (u.barcode && u.barcode.toUpperCase() === cleanCode)
    );

    // 2. Check if barcode matches a shelf location (e.g. A-02-03)
    const allShelves = (DB.warehouse_shelf_locations || []);
    const shelf = allShelves.find(s => 
        s.shelf_code && s.shelf_code.toUpperCase() === cleanCode
    );

    // 3. Check if barcode matches an order (e.g. ORD-2026-0001, SRV-2026-0002)
    const order = (DB.orders || []).find(o => o.order_number && o.order_number.toUpperCase() === cleanCode) ||
                  (DB.service_orders || []).find(so => so.order_number && so.order_number.toUpperCase() === cleanCode);

    if (context === 'pos') {
        if (unit) {
            const model = (DB.product_models || []).find(m => m.id === unit.product_model_id);
            if (unit.status !== 'omborda_bosh') {
                showNotification(`Diqqat! [${unit.serial_number}] asbob omborda bo'sh emas (Holati: ${unit.status})!`, "warning");
                return;
            }
            // Auto-select this tool in POS dropdown and alert location
            const selectEl = document.getElementById('pos-tool-unit-select');
            if (selectEl) {
                selectEl.value = unit.id;
                if (typeof onPosToolSelectChange === 'function') onPosToolSelectChange();
            }
            showNotification(`Asbob tanlandi: ${model ? model.model_name : ''} (${unit.serial_number})`, "success");
            closeCameraScanner();
        } else {
            showNotification(`Shtrix-kod bo'yicha asbob topilmadi: ${code}`, "error");
        }
        return;
    }

    if (context === 'return') {
        if (unit) {
            // Check off in return inspection if open
            if (typeof markUnitReturnedBySerial === 'function') {
                markUnitReturnedBySerial(unit.serial_number);
            }
            showNotification(`Asbob priyomkaga olindi: ${unit.serial_number}`, "success");
            closeCameraScanner();
        } else {
            showNotification(`Bunday seriyali asbob topilmadi: ${code}`, "error");
        }
        return;
    }

    // Universal Context
    if (unit) {
        const model = (DB.product_models || []).find(m => m.id === unit.product_model_id);
        const shelfName = unit.shelf_location || "Polkaga biriktirilmagan";
        closeCameraScanner();
        alert(
            `📦 ASBOB TOPILDI:\n` +
            `• Model: ${model ? model.model_name : 'Noma\'lum'}\n` +
            `• Seriya: ${unit.serial_number}\n` +
            `• Shtrix-kod: ${unit.barcode || '-'}\n` +
            `• Holati: ${unit.status.toUpperCase()}\n` +
            `• Polka manzili: ${shelfName}\n` +
            `• Kunlik narxi: ${(unit.daily_price || 0).toLocaleString()} so'm`
        );
        return;
    }

    if (shelf) {
        closeCameraScanner();
        if (typeof openLocationDetailsModal === 'function') {
            openLocationDetailsModal(shelf.shelf_code);
        } else {
            alert(`📍 POLKA MANZILI: ${shelf.shelf_code} (${shelf.zone_name})`);
        }
        return;
    }

    if (order) {
        closeCameraScanner();
        if (typeof openOrderReceiptModal === 'function') {
            openOrderReceiptModal(order.id);
        } else {
            alert(`🧾 BUYURTMA TOPILDI: #${order.order_number}`);
        }
        return;
    }

    showNotification(`Skanerlangan kod bo'yicha ma'lumot topilmadi: "${code}"`, "info");
}


// -------------------------------------------------------------------------
// 3. PWA (PROGRESSIVE WEB APP) - O'RNATISH VA SERVICE WORKER
// -------------------------------------------------------------------------
function initPWA() {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('[PWA] ServiceWorker muvaffaqiyatli ro\'yxatga olindi:', reg.scope);
                })
                .catch(err => {
                    console.warn('[PWA] ServiceWorker ro\'yxatga olishda xatolik:', err);
                });
        });
    }

    // 2. Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', e => {
        // Prevent default browser banner
        e.preventDefault();
        deferredInstallPrompt = e;

        // Show install button in header or banner
        const btnHeader = document.getElementById('btn-pwa-install');
        const banner = document.getElementById('pwa-install-banner');
        if (btnHeader) btnHeader.classList.remove('hidden');
        if (banner) banner.classList.remove('hidden');
        console.log('[PWA] beforeinstallprompt event captured, install prompt ready.');
    });

    // 3. Detect when app is installed
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Ilova telefonga / kompyuterga muvaffaqiyatli o\'rnatildi!');
        const btnHeader = document.getElementById('btn-pwa-install');
        const banner = document.getElementById('pwa-install-banner');
        if (btnHeader) btnHeader.classList.add('hidden');
        if (banner) banner.classList.add('hidden');
        showNotification("WMS Arenda ilovasi telefoningiz ekraniga muvaffaqiyatli o'rnatildi! 📱", "success");
    });
}

function promptPWAInstall() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(choice => {
            if (choice.outcome === 'accepted') {
                console.log('[PWA] Foydalanuvchi ilovani o\'rnatishni qabul qildi.');
            } else {
                console.log('[PWA] Foydalanuvchi ilovani o\'rnatishni rad etdi.');
            }
            deferredInstallPrompt = null;
        });
    } else {
        alert(
            "📱 WMS ARENDA ILOVASINI TELEFONGA O'RNATISH QO'LLANMASI:\n\n" +
            "1. Safari (iPhone) da: pastdagi 'Ulashish' (Share) tugmasini bosing -> 'Bosh ekranga qo'shish' (Add to Home Screen) ni tanlang.\n\n" +
            "2. Chrome (Android) da: brauzerning 3 ta nuqtasini bosing -> 'Ilovani o'rnatish' yoki 'Bosh ekranga qo'shish' ni bosing."
        );
    }
}


// -------------------------------------------------------------------------
// 4. HAMKORLAR UCHUN INTERAKTIV TELEGRAM BOT (DISPECHERLIK AVTOMATIKASI)
// -------------------------------------------------------------------------

/**
 * Send dispatch order to Partner Telegram Bot and open the interactive tester
 */
async function dispatchOrderToPartnerBot(orderId) {
    const order = (DB.service_orders || []).find(o => o.id === orderId);
    if (!order) {
        showNotification("Buyurtma topilmadi!", "error");
        return;
    }

    const partner = (DB.service_partners || []).find(p => p.id === order.assigned_partner_id);
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);

    // Call server endpoint or fallback to client simulation
    const payload = {
        order_id: order.id,
        order_number: order.order_number,
        partner_name: partner ? partner.company_name : 'Hamkor',
        partner_phone: partner ? partner.phone_primary : '',
        service_type: order.service_category.toUpperCase(),
        payout_amount: order.partner_payout_amount,
        address: order.destination_address,
        time: order.execution_time || "14:00",
        task_instruction: order.task_instruction || order.details || "Buyurtma ijrosi"
    };

    try {
        const resp = await fetch('/api/partner-bot/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json();
        console.log('[PartnerBot] Server dispatch response:', data);
    } catch (e) {
        console.log('[PartnerBot] Operating in offline/client simulation mode');
    }

    // Update order status to 'hamkorga_uzatildi'
    if (order.order_status === 'yangi') {
        order.order_status = 'hamkorga_uzatildi';
        saveDB();
        if (typeof renderServiceOrdersTable === 'function') renderServiceOrdersTable();
    }

    // Open Interactive Partner Telegram Bot Simulator Modal
    openPartnerBotSimulator(order.id);
    showNotification(`Buyurtma #${order.order_number} hamkor Telegram botiga yuborildi! 🔔`, "success");
}

/**
 * Opens Interactive Telegram Bot Simulator Modal for the specified order
 */
function openPartnerBotSimulator(orderId) {
    activeBotSimulatorOrderId = orderId;
    const order = (DB.service_orders || []).find(o => o.id === orderId);
    if (!order) return;

    const partner = (DB.service_partners || []).find(p => p.id === order.assigned_partner_id);
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);

    // Update partner header info
    const partnerNameEl = document.getElementById('bot-sim-partner-name');
    const partnerCatEl = document.getElementById('bot-sim-partner-category');
    if (partnerNameEl) partnerNameEl.innerText = partner ? partner.company_name : 'Hamkor';
    if (partnerCatEl) partnerCatEl.innerText = partner ? `${partner.service_category.toUpperCase()} • ${partner.phone_primary}` : 'Hamkor Boti';

    // Build chat message view
    renderPartnerBotChatView(order, partner, customer);

    openModal('modal-partner-telegram-bot');
    lucide.createIcons();
}

/**
 * Renders the Telegram chat message bubble and interactive inline buttons
 */
function renderPartnerBotChatView(order, partner, customer) {
    const container = document.getElementById('bot-sim-messages-container');
    if (!container) return;

    const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(order.destination_address)}`;
    const currentTime = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let buttonsHtml = '';

    if (order.order_status === 'yangi' || order.order_status === 'hamkorga_uzatildi') {
        buttonsHtml = `
            <div class="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-700/60">
                <button type="button" onclick="handlePartnerBotSimAction('accept')" class="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition">
                    <i data-lucide="check" class="w-4 h-4"></i> Qabul qilaman
                </button>
                <button type="button" onclick="handlePartnerBotSimAction('reject')" class="py-2 px-3 rounded-xl bg-red-600/80 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition">
                    <i data-lucide="x" class="w-4 h-4"></i> Rad etish
                </button>
                <a href="${mapUrl}" target="_blank" class="col-span-2 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-red-400"></i> Xaritada ko'rish (Google Maps)
                </a>
            </div>
        `;
    } else if (order.order_status === 'qabul_qilindi' || order.order_status === 'bajarilmoqda') {
        buttonsHtml = `
            <div class="space-y-2 pt-2 border-t border-slate-700/60">
                <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                    <i data-lucide="clock" class="w-4 h-4 shrink-0 text-amber-400"></i>
                    <span>Siz buyurtmani qabul qildingiz. Ishni bajargach, yakunlash tugmasini bosing:</span>
                </div>
                <button type="button" onclick="handlePartnerBotSimAction('finish')" class="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition">
                    <i data-lucide="flag" class="w-4 h-4"></i> 🏁 Ish Yakunlandi (Hisobga olish)
                </button>
                <a href="${mapUrl}" target="_blank" class="w-full py-1.5 px-3 rounded-xl bg-slate-800 text-blue-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700">
                    <i data-lucide="map-pin" class="w-3.5 h-3.5 text-red-400"></i> Obyekt Manzili Xaritada
                </a>
            </div>
        `;
    } else if (order.order_status === 'bajarildi') {
        buttonsHtml = `
            <div class="pt-2 border-t border-slate-700/60">
                <div class="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <i data-lucide="check-check" class="w-5 h-5 text-emerald-400 shrink-0"></i>
                    <div>
                        <div class="font-bold">Buyurtma yakunlangan!</div>
                        <div class="text-[10px] text-emerald-400/90 font-mono">+${order.partner_payout_amount.toLocaleString()} so'm balansingizga qo'shildi.</div>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <!-- System Date Header -->
        <div class="text-center my-2">
            <span class="px-3 py-1 rounded-full bg-slate-800/80 text-[10px] font-semibold text-slate-400">Bugun</span>
        </div>

        <!-- Bot Dispatch Message Bubble -->
        <div class="max-w-[90%] mr-auto rounded-2xl rounded-tl-sm bg-slate-800 border border-slate-700 p-3.5 text-slate-200 text-xs shadow-md space-y-2.5">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5">
                <span class="font-bold text-amber-400 flex items-center gap-1.5">
                    <i data-lucide="bell-ring" class="w-4 h-4"></i> YANGI BUYURTMA!
                </span>
                <span class="font-mono text-[10px] text-slate-400">#${order.order_number}</span>
            </div>

            <div class="space-y-1 leading-relaxed text-[11px]">
                <div>🛠 <b>Xizmat:</b> <span class="text-amber-300 font-semibold">${order.service_category.toUpperCase()}</span></div>
                <div>📍 <b>Ish joyi:</b> <span class="text-white">${order.destination_address}</span></div>
                <div>🕒 <b>Vaqt:</b> <span class="text-white">${order.service_date} ${order.execution_time || '10:00'} da</span></div>
                <div>👤 <b>Mijoz:</b> <span class="text-slate-300">${customer ? customer.full_name : 'Mijoz'} (${customer ? customer.phone_primary : ''})</span></div>
                <div>💵 <b>Sizga to'lanadigan summa:</b> <b class="text-emerald-400 font-mono text-xs">${order.partner_payout_amount.toLocaleString()} so'm</b></div>
                ${order.task_instruction ? `<div class="p-1.5 rounded-lg bg-slate-900 border border-slate-700/70 text-[10px] text-amber-200 font-mono mt-1">📋 <b>Topshiriq:</b> ${order.task_instruction}</div>` : ''}
            </div>

            <!-- Inline Interactive Telegram Buttons -->
            ${buttonsHtml}

            <div class="flex justify-end pt-1">
                <span class="text-[9px] text-slate-400 font-mono">${currentTime} &bull; Telegram Bot</span>
            </div>
        </div>
    `;

    lucide.createIcons();
}

/**
 * Handle button clicks inside the Partner Bot Simulator
 */
async function handlePartnerBotSimAction(action) {
    if (!activeBotSimulatorOrderId) return;
    const order = (DB.service_orders || []).find(o => o.id === activeBotSimulatorOrderId);
    if (!order) return;

    const partner = (DB.service_partners || []).find(p => p.id === order.assigned_partner_id);

    // Call server callback if available
    try {
        await fetch('/api/partner-bot/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                order_id: order.id,
                action: action,
                partner_name: partner ? partner.company_name : 'Hamkor',
                payout_amount: order.partner_payout_amount
            })
        });
    } catch (e) {}

    playScanBeep(action === 'finish' ? 2200 : 1800, 150);

    if (action === 'accept') {
        order.order_status = 'bajarilmoqda';
        saveDB();
        showNotification(`Hamkor [${partner ? partner.company_name : 'Hamkor'}] buyurtmani qabul qildi va ishni boshladi! 🚀`, "success");
    } else if (action === 'reject') {
        order.order_status = 'yangi';
        saveDB();
        showNotification(`Hamkor [${partner ? partner.company_name : 'Hamkor'}] bandligi sababli rad etdi! Boshqa ijrochi biriktiring.`, "warning");
    } else if (action === 'finish') {
        order.order_status = 'bajarildi';
        // Partner payout credit
        if (partner) {
            partner.balance -= order.partner_payout_amount; // company owes partner
        }
        saveDB();
        showNotification(`Buyurtma #${order.order_number} bajarildi! Hamkor balansiga +${order.partner_payout_amount.toLocaleString()} so'm yozildi. ✔`, "success");
    }

    if (typeof renderServiceOrdersTable === 'function') renderServiceOrdersTable();
    if (typeof renderPartnersDirectory === 'function') renderPartnersDirectory();

    // Re-render chat view
    const customer = (DB.customers || []).find(c => c.id === order.customer_id);
    renderPartnerBotChatView(order, partner, customer);
}


// -------------------------------------------------------------------------
// 5. TEZKOR UNIVERSAL QIDIRUV (UNIVERSAL SEARCH — CTRL+K)
// -------------------------------------------------------------------------
function initUniversalSearchListener() {
    window.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            openUniversalSearch();
        } else if (e.key === 'Escape') {
            closeModal('modal-universal-search');
        }
    });
}

function openUniversalSearch() {
    openModal('modal-universal-search');
    const input = document.getElementById('universal-search-input');
    if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 80);
    }
    handleUniversalSearchQuery('');
    lucide.createIcons();
}

function handleUniversalSearchQuery(rawQuery) {
    const q = (rawQuery || '').trim().toLowerCase();
    const container = document.getElementById('universal-search-results');
    if (!container) return;

    if (!q) {
        // Show recent/quick suggestions
        container.innerHTML = `
            <div class="p-6 text-center text-slate-500 text-xs">
                <i data-lucide="search" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
                <p class="font-medium text-slate-400">Qidirish uchun matn kiriting</p>
                <p class="text-[11px] text-slate-500 mt-1">Mijoz telefoni, ism, asbob seriya raqami (#SN) yoki buyurtma kodi (#ORD)</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    const matches = [];

    // 1. Search Customers
    (DB.customers || []).forEach(c => {
        if (
            c.full_name?.toLowerCase().includes(q) ||
            c.phone_primary?.toLowerCase().includes(q) ||
            c.phone_secondary?.toLowerCase().includes(q) ||
            c.company_name?.toLowerCase().includes(q)
        ) {
            matches.push({
                type: 'customer',
                title: c.full_name,
                subtitle: `${c.phone_primary} • ${c.company_name || 'Jismoniy shaxs'}`,
                badge: c.status === 'vip' ? 'VIP Mijoz ⭐' : (c.status === 'qarzdor' ? 'Qarzdor ⚠️' : 'Mijoz 👤'),
                badgeColor: c.status === 'vip' ? 'bg-amber-500/20 text-amber-300' : (c.status === 'qarzdor' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'),
                extra: `Balans: ${(c.balance || 0).toLocaleString()} so'm`,
                action: () => {
                    closeModal('modal-universal-search');
                    switchSection('section-customers');
                    if (typeof viewCustomerCRM === 'function') viewCustomerCRM(c.id);
                }
            });
        }
    });

    // 2. Search Tools & Serial Numbers
    (DB.product_units || []).forEach(u => {
        const m = (DB.product_models || []).find(pm => pm.id === u.product_model_id);
        const modelName = m ? m.model_name : 'Asbob';
        if (
            u.serial_number?.toLowerCase().includes(q) ||
            u.barcode?.toLowerCase().includes(q) ||
            modelName.toLowerCase().includes(q) ||
            u.shelf_location?.toLowerCase().includes(q)
        ) {
            matches.push({
                type: 'tool',
                title: `${modelName} (SN: ${u.serial_number})`,
                subtitle: `📍 Polka: ${u.shelf_location || 'Biriktirilmagan'} • Shtrix-kod: ${u.barcode || '-'}`,
                badge: u.status === 'omborda_bosh' ? 'Omborda bo\'sh 🟢' : (u.status === 'ijarada' ? 'Ijarada 🔵' : 'Remontda 🔴'),
                badgeColor: u.status === 'omborda_bosh' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300',
                extra: `${(u.daily_price || 0).toLocaleString()} so'm/kun`,
                action: () => {
                    closeModal('modal-universal-search');
                    if (u.shelf_location && typeof openLocationDetailsModal === 'function') {
                        const code = u.shelf_location.split(' ')[0] || u.shelf_location;
                        openLocationDetailsModal(code);
                    } else {
                        switchSection('section-catalog');
                    }
                }
            });
        }
    });

    // 3. Search Orders
    (DB.orders || []).forEach(o => {
        const c = (DB.customers || []).find(cust => cust.id === o.customer_id);
        if (
            o.order_number?.toLowerCase().includes(q) ||
            c?.full_name?.toLowerCase().includes(q) ||
            c?.phone_primary?.toLowerCase().includes(q)
        ) {
            matches.push({
                type: 'order',
                title: `Buyurtma #${o.order_number}`,
                subtitle: `Mijoz: ${c ? c.full_name : 'Mijoz'} • Qaytarish: ${o.expected_return_date || '-'}`,
                badge: o.status.toUpperCase(),
                badgeColor: o.status === 'yakunlandi' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300',
                extra: `${(o.total_rent_amount || 0).toLocaleString()} so'm`,
                action: () => {
                    closeModal('modal-universal-search');
                    if (typeof openOrderReceiptModal === 'function') openOrderReceiptModal(o.id);
                }
            });
        }
    });

    // 4. Search Service Orders
    (DB.service_orders || []).forEach(so => {
        const c = (DB.customers || []).find(cust => cust.id === so.customer_id);
        if (
            so.order_number?.toLowerCase().includes(q) ||
            c?.full_name?.toLowerCase().includes(q) ||
            so.destination_address?.toLowerCase().includes(q)
        ) {
            matches.push({
                type: 'service_order',
                title: `Xizmat #${so.order_number} (${so.service_category.toUpperCase()})`,
                subtitle: `Obyekt: ${so.destination_address} • Mijoz: ${c ? c.full_name : ''}`,
                badge: so.order_status.toUpperCase(),
                badgeColor: 'bg-amber-500/20 text-amber-300',
                extra: `${(so.customer_total_price || 0).toLocaleString()} so'm`,
                action: () => {
                    closeModal('modal-universal-search');
                    switchSection('section-partners');
                    if (typeof switchPartnerTab === 'function') switchPartnerTab('ptab-orders');
                }
            });
        }
    });

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-500 text-xs">
                <i data-lucide="help-circle" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
                <p class="font-medium text-slate-300">Hech qanday ma'lumot topilmadi</p>
                <p class="text-[11px] text-slate-500 mt-1">"${q}" bo'yicha mijoz, asbob yoki buyurtma mavjud emas</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = `
        <div class="divide-y divide-slate-800">
            ${matches.slice(0, 15).map((m, idx) => `
                <div onclick="window._universalSearchActions[${idx}]()" class="p-3 hover:bg-slate-800/60 cursor-pointer flex items-center justify-between gap-3 transition">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0">
                            ${m.type === 'customer' ? '<i data-lucide="user" class="w-4 h-4 text-blue-400"></i>' :
                              (m.type === 'tool' ? '<i data-lucide="wrench" class="w-4 h-4 text-amber-400"></i>' :
                               '<i data-lucide="file-text" class="w-4 h-4 text-emerald-400"></i>')}
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-white text-xs truncate">${m.title}</div>
                            <div class="text-[11px] text-slate-400 truncate">${m.subtitle}</div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${m.badgeColor}">${m.badge}</span>
                        <div class="text-[10px] text-slate-400 font-mono mt-0.5">${m.extra}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Store callbacks for click execution
    window._universalSearchActions = matches.map(m => m.action);
    lucide.createIcons();
}


// Initialize listeners upon script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPWA();
        initUniversalSearchListener();
    });
} else {
    initPWA();
    initUniversalSearchListener();
}
