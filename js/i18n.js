// =========================================================================
// SECTION 10: I18N — TO'LIQ VA MUKAMMAL KO'P TILLILIK (UZ & RU)
// =========================================================================

let currentLang = localStorage.getItem('WMS_LANG') || 'uz';

const TRANSLATIONS = {
  uz: {
    nav: {
      dashboard: "Boshqaruv Paneli",
      kirim: "1. Kirim Zanjiri",
      catalog: "2. Asboblar Katalogi",
      staff: "3. Xodimlar & Rollar",
      partners: "4. Tashqi Xizmatlar (P2P)",
      orders: "5. Buyurtmalar (POS)",
      suppliers: "Yetkazib Beruvchilar",
      crm: "Mijozlar CRM 360°",
      finance: "6. Kassa & Moliya (P&L)",
      ai: "9. AI Agent (24/7)",
      po: "Buyurtma (PO)",
      fact: "Qabul (Fact)",
      placement: "Joylashtirish",
      returns: "Vozvrat"
    },
    unit: {
      piece: "dona",
      hour: "soat",
      day: "kun",
      floor: "etaj",
      bag: "qop",
      trip: "reys",
      currency: "so'm",
      uzs: "UZS"
    },
    status: {
      new: "Yangi",
      in_rent: "Faol (Ijarada)",
      delayed: "Kechikkan",
      completed: "Qabul qilindi (Yakunlandi)",
      cancelled: "Bekor qilindi",
      available: "Omborda bo'sh",
      in_repair: "Remontda",
      blacklist: "Qora ro'yxat",
      vip: "Ishonchli (VIP)",
      trusted: "Ishonchli",
      debtor: "Qarzdor"
    },
    role: {
      admin: "Bosh Admin 👑",
      manager: "Menejer 💼",
      cashier: "Kassir 💰",
      warehouseman: "Skladchi 📦"
    },
    action: {
      add_order: "+ Yangi Buyurtma",
      add_kirim: "+ Tezkor Kirim",
      add_expense: "+ Xarajat (Rasxod)",
      priyomka: "Asbobni Priyomka qilish",
      call: "Qo'ng'iroq",
      reminder: "Telegram Eslatma",
      save: "Saqlash",
      cancel: "Bekor qilish",
      close: "Yopish",
      print: "Chop etish (Print)",
      search: "Qidirish...",
      copy: "Nusxalash",
      login: "Tizimga kirish",
      logout: "Tizimdan chiqish",
      send: "Yuborish",
      convert_pos: "POSga Yuklash",
      edit: "Tahrirlash",
      delete: "O'chirish",
      details: "Batafsil"
    },
    alert: {
      saved: "Muvaffaqiyatli saqlandi!",
      serial_required: "Seriya raqami majburiy!",
      item_in_rent: "Bu asbob hozir ijarada, tanlab bo'lmaydi!",
      blacklist: "DIQQAT: Ushbu mijoz qora ro'yxatda!",
      deposit_refunded: "Zalog qaytarildi",
      copied: "Nusxalandi!",
      login_error: "Foydalanuvchi nomi yoki parol noto'g'ri!",
      blocked_account: "Ushbu hisob bloklangan! Bosh Admin bilan bog'laning.",
      welcome_user: "Xush kelibsiz"
    },
    receipt: {
      order_receipt: "BUYURTMA CHEKI",
      company: "Kompaniya",
      customer: "Mijoz",
      services_tools: "Xizmatlar / Asboblar",
      financial_calc: "Moliyaviy hisob-kitob",
      total_fee: "Jami xizmat haqi",
      deposit_collected: "Olingan Zalog (Depozit)",
      paid: "To'landi",
      holding: "Saqlanmoqda",
      return_deadline: "Qaytarish vaqti",
      return_address: "Qaytarish manzili",
      contact: "Aloqa",
      online_link: "Onlayn chekni ko'rish",
      thank_you: "XARIDINGIZ UCHUN TASHAKKUR!",
      payment_method: "To'lov usuli",
      operator: "Operator",
      date: "Sana"
    },
    contract: {
      title: "QURILISH USKUNALARI IJARASI SHARTNOMASI VA TILXAT",
      subtitle: "Qurilish uskunalari ijarasi va professional servis xizmati",
      party_company: "Ijaraga Beruvchi:",
      party_customer: "Ijaraga Oluvchi (Mijoz / Tilxat):",
      table_no: "№",
      table_item: "Uskuna / Xizmat Turi",
      table_serial: "Zavod Seriya Raqami",
      table_period: "Muddat",
      table_rent: "Ijara Summasi",
      table_deposit: "Depozit (Zalog)",
      total: "JAMI:",
      terms_title: "Ijara Qoidalari va Shartlari:",
      terms_1: "1. Qabul qilish: Ijarachi uskunani to'liq soz, nuqsonsiz va butun holda qabul qildi va uni belgilangan muddatgacha qaytarish majburiyatini oladi.",
      terms_2: "2. Kechikish: Belgilangan muddatdan kechiktirilgan har bir soat yoki kun uchun shartnoma stavkasi bo'yicha qo'shimcha to'lov va jarima undiriladi.",
      terms_3: "3. Javobgarlik: Uskuna buzilgan taqdirda ta'mirlash xarajati garovdan ushlab qolinadi. Uskuna yo'qolgan taqdirda Ijarachi to'liq qiymatini qoplaydi.",
      terms_4: "4. Zalog: Qabul qilingan garov mablag'i uskuna soz qaytarilgach, darhol to'liq qaytariladi.",
      sign_company: "Topshirdi (Kompaniya nomidan):",
      sign_customer: "Qabul qildi (Mijoz / Tilxat):"
    },
    dash: {
      title: "Boshqaruv Paneli (Executive Dashboard)",
      subtitle: "Uskunalar holati, kassa, toza foyda va tashqi sayt buyurtmalari boshqaruvi",
      tools_status: "Uskunalar Holati",
      total_tools: "jami asbob",
      free: "Bo'sh",
      rented: "Ijarada",
      repair: "Remontda",
      delayed_tools: "Kechikkan Uskunalar",
      overdue_desc: "Muddati o'tib ketgan",
      view_orders: "Buyurtmalarga o'tish",
      today_cash: "Bugungi Kassa",
      deposit_held: "Olingan zalog",
      monthly_profit: "Shu Oylik Toza Foyda",
      net_profit: "Sof daromad (P&L Net Profit)",
      attention_table: "Diqqat Jadvali: Kechikayotgan va Bugun Qaytishi Kerak Bo'lganlar",
      attention_sub: "Tezkor aloqa va ogohlantirish",
      col_customer: "Mijoz va Telefon",
      col_tools: "Olingan Asbob(lar)",
      col_deadline: "Qaytarish Muddati",
      col_status: "Kechikish / Holat",
      col_action: "Tezkor Harakat",
      no_delayed: "Ajoyib! Hozirda kechikkan yoki muddati tugayotgan uskunalar mavjud emas.",
      p2p_summary: "Tashqi Xizmatlar Xulosasi (P2P Hamkorlar)",
      crane: "Avtokran",
      garbage: "Musor Olib Ketish",
      loader: "Gruzchik",
      total_margin: "Jami sof foyda",
      top_tools: "Top-5 Eng Serdaromad Asboblar Reytingi",
      all_models: "Barcha modellar",
      online_leads: "Saytdan Tushgan Buyurtmalar (Online Leads)",
      new_leads_badge: "ta yangi",
      api_tester: "Mavjud Sayt Uchun REST API Sinovchi",
      api_tester_sub: "Saytingizning buyurtma shaklini simulyatsiya qiling va darhol natijani ko'ring:",
      form_name: "Mijoz Ismi",
      form_phone: "Telefon",
      form_service: "Xizmat turi",
      form_address: "Manzil",
      form_details: "Qo'shimcha tafsilot",
      form_send_btn: "Saytdan Yuborish (Test)"
    },
    ai: {
      title: "AI Agent & Aqlli Telegram Yordamchi",
      subtitle: "Ombor qoldig'i, narxlar va kassa hisoboti bilan to'g'ridan-to'g'ri ishlovchi avtonom yordamchi",
      status_active: "AI Agent Faol (24/7)",
      status_disabled: "AI O'chirilgan",
      settings_title: "AI Agent Sozlamalari",
      provider: "AI Provayderi (LLM Engine)",
      api_key: "API Kaliti (API Key)",
      model_name: "Model Nomi",
      admin_pin: "Bosh Admin PIN Kodi",
      welcome_msg: "Xush Kelibsiz Matni (Mijozga birinchi javob)",
      system_prompt: "System Prompt (Kontekst va Qoidalar)",
      save_settings: "Sozlamalarni Saqlash",
      telegram_title: "Telegram Bot Bilan Bog'lash",
      chat_role: "Muloqot rejimi:",
      role_customer: "👤 Mijoz (Mijoz Chat)",
      role_admin: "👑 Bosh Admin (Hisobotlar)",
      clear_chat: "Tozalash",
      input_placeholder: "Xabaringizni yozing (masalan: 'Otboynik bormi?', 'Kran qancha?', 'Bugungi kassa?')..."
    }
  },
  ru: {
    nav: {
      dashboard: "Панель управления",
      kirim: "1. Поступление и склад",
      catalog: "2. Каталог оборудования",
      staff: "3. Сотрудники и роли",
      partners: "4. Внешние услуги (P2P)",
      orders: "5. Заказы (POS)",
      suppliers: "Поставщики",
      crm: "Клиенты CRM 360°",
      finance: "6. Касса и финансы (P&L)",
      ai: "9. ИИ Агент (24/7)",
      po: "Заказ (PO)",
      fact: "Приемка (Факт)",
      placement: "Размещение",
      returns: "Возврат"
    },
    unit: {
      piece: "шт.",
      hour: "час",
      day: "день",
      floor: "этаж",
      bag: "мешок",
      trip: "рейс",
      currency: "сум",
      uzs: "UZS"
    },
    status: {
      new: "Новый",
      in_rent: "В аренде (Активен)",
      delayed: "Просрочено",
      completed: "Принято (Завершено)",
      cancelled: "Отменено",
      available: "Свободен на складе",
      in_repair: "В ремонте",
      blacklist: "Черный список",
      vip: "Надежный (VIP)",
      trusted: "Надежный",
      debtor: "Должник"
    },
    role: {
      admin: "Главный Администратор 👑",
      manager: "Менеджер 💼",
      cashier: "Кассир 💰",
      warehouseman: "Кладовщик 📦"
    },
    action: {
      add_order: "+ Новый заказ",
      add_kirim: "+ Быстрое поступление",
      add_expense: "+ Расход",
      priyomka: "Принять инструмент",
      call: "Звонок",
      reminder: "Telegram Напоминание",
      save: "Сохранить",
      cancel: "Отмена",
      close: "Закрыть",
      print: "Печать",
      search: "Поиск...",
      copy: "Копировать",
      login: "Войти в систему",
      logout: "Выйти из системы",
      send: "Отправить",
      convert_pos: "Загрузить в POS",
      edit: "Редактировать",
      delete: "Удалить",
      details: "Подробнее"
    },
    alert: {
      saved: "Успешно сохранено!",
      serial_required: "Серийный номер обязателен!",
      item_in_rent: "Этот инструмент сейчас в аренде!",
      blacklist: "ВНИМАНИЕ: Этот клиент в черном списке!",
      deposit_refunded: "Залог возвращен",
      copied: "Скопировано!",
      login_error: "Неверное имя пользователя или пароль!",
      blocked_account: "Эта учетная запись заблокирована! Свяжитесь с администратором.",
      welcome_user: "Добро пожаловать"
    },
    receipt: {
      order_receipt: "ЧЕК ЗАКАЗА",
      company: "Компания",
      customer: "Клиент",
      services_tools: "Услуги / Инструменты",
      financial_calc: "Финансовый расчет",
      total_fee: "Общая сумма аренды",
      deposit_collected: "Принятый Залог (Депозит)",
      paid: "Оплачено",
      holding: "Удерживается",
      return_deadline: "Срок возврата",
      return_address: "Адрес возврата",
      contact: "Контакты",
      online_link: "Посмотреть онлайн чек",
      thank_you: "СПАСИБО ЗА ПОКУПКУ!",
      payment_method: "Способ оплаты",
      operator: "Оператор",
      date: "Дата"
    },
    contract: {
      title: "ДОГОВОР АРЕНДЫ СТРОИТЕЛЬНОГО ОБОРУДОВАНИЯ И РАСПИСКА",
      subtitle: "Аренда строительного оборудования и профессиональный сервис",
      party_company: "Арендодатель:",
      party_customer: "Арендатор (Клиент / Расписка):",
      table_no: "№",
      table_item: "Тип оборудования / Услуги",
      table_serial: "Заводской серийный номер",
      table_period: "Срок",
      table_rent: "Сумма аренды",
      table_deposit: "Депозит (Залог)",
      total: "ИТОГО:",
      terms_title: "Правила и условия аренды:",
      terms_1: "1. Приемка: Арендатор принял оборудование в исправном, комплектном состоянии и обязуется вернуть его в установленный срок.",
      terms_2: "2. Просрочка: За каждый час или день просрочки установленного срока начисляется штраф согласно тарифной ставке.",
      terms_3: "3. Ответственность: В случае поломки расходы на ремонт удерживаются из залога. В случае утери Арендатор возмещает полную стоимость.",
      terms_4: "4. Залог: Принятая сумма залога возвращается клиенту в полном объеме сразу после возврата исправного инструмента.",
      sign_company: "Сдал (От имени компании):",
      sign_customer: "Принял (Клиент / Расписка):"
    },
    dash: {
      title: "Панель управления (Executive Dashboard)",
      subtitle: "Состояние инструментов, касса, чистая прибыль и управление заказами с сайта",
      tools_status: "Состояние инструментов",
      total_tools: "всего инструментов",
      free: "Свободно",
      rented: "В аренде",
      repair: "В ремонте",
      delayed_tools: "Просроченное оборудование",
      overdue_desc: "Истек срок возврата",
      view_orders: "Перейти к заказам",
      today_cash: "Касса за сегодня",
      deposit_held: "Принятый залог",
      monthly_profit: "Чистая прибыль за месяц",
      net_profit: "Чистый доход (P&L Net Profit)",
      attention_table: "Таблица внимания: Просроченные и ожидаемые к возврату сегодня",
      attention_sub: "Быстрая связь и предупреждение",
      col_customer: "Клиент и Телефон",
      col_tools: "Взятые инструменты",
      col_deadline: "Срок возврата",
      col_status: "Просрочка / Статус",
      col_action: "Быстрое действие",
      no_delayed: "Отлично! В настоящее время нет просроченного или подлежащего возврату оборудования.",
      p2p_summary: "Сводка внешних услуг (Партнеры P2P)",
      crane: "Автокран",
      garbage: "Вывоз мусора",
      loader: "Грузчики",
      total_margin: "Общая маржа",
      top_tools: "Рейтинг топ-5 самых доходных инструментов",
      all_models: "Все модели",
      online_leads: "Заказы с сайта (Online Leads)",
      new_leads_badge: "новых",
      api_tester: "Тестировщик REST API для сайта",
      api_tester_sub: "Симулируйте отправку формы заказа с вашего сайта и сразу просмотрите результат:",
      form_name: "Имя клиента",
      form_phone: "Телефон",
      form_service: "Тип услуги",
      form_address: "Адрес",
      form_details: "Дополнительные детали",
      form_send_btn: "Отправить с сайта (Тест)"
    },
    ai: {
      title: "ИИ Агент и Умный Telegram Помощник",
      subtitle: "Автономный помощник, работающий напрямую с остатками склада, ценами и кассовыми отчетами",
      status_active: "ИИ Агент Активен (24/7)",
      status_disabled: "ИИ Отключен",
      settings_title: "Настройки ИИ Агента",
      provider: "Провайдер ИИ (LLM Engine)",
      api_key: "API Ключ (API Key)",
      model_name: "Название модели",
      admin_pin: "ПИН-код Главного Админа",
      welcome_msg: "Приветственное сообщение (Первый ответ клиенту)",
      system_prompt: "Системный промпт (Контекст и правила)",
      save_settings: "Сохранить настройки",
      telegram_title: "Подключение к Telegram боту",
      chat_role: "Режим диалога:",
      role_customer: "👤 Клиент (Чат клиента)",
      role_admin: "👑 Главный Админ (Отчеты)",
      clear_chat: "Очистить",
      input_placeholder: "Напишите сообщение (например: 'Есть отбойник?', 'Сколько стоит кран?', 'Касса за сегодня?')..."
    }
  }
};

/**
 * Translation helper function: t('key.subkey', 'Fallback')
 */
function t(keyPath, fallback = '') {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.uz;
  const parts = keyPath.split('.');
  let current = dict;
  for (const p of parts) {
    if (current && typeof current === 'object' && p in current) {
      current = current[p];
    } else {
      return fallback || keyPath;
    }
  }
  return current || fallback || keyPath;
}

function getLanguage() {
  return currentLang;
}

function setLanguage(lang) {
  if (lang !== 'uz' && lang !== 'ru') lang = 'uz';
  currentLang = lang;
  localStorage.setItem('WMS_LANG', lang);

  updateLanguageUI();
  updateStaticDOMTranslations();
  updateDatabaseLocalization();

  // Re-render active section and components
  if (typeof renderAllTabs === 'function') renderAllTabs();
  if (typeof renderCatalogCards === 'function') renderCatalogCards();
  if (typeof renderStaffTable === 'function') renderStaffTable();
  if (typeof renderSuppliersLedger === 'function') renderSuppliersLedger();
  if (typeof renderCustomersCRM === 'function') renderCustomersCRM();
  if (typeof renderPartnersDirectory === 'function') renderPartnersDirectory();
  if (typeof renderOrdersSection === 'function') renderOrdersSection();
  if (typeof renderFinanceSection === 'function') renderFinanceSection();
  if (typeof renderDashboard === 'function') renderDashboard();
  if (typeof renderAISettingsForm === 'function') renderAISettingsForm();

  // Update breadcrumb
  const bSec = document.getElementById('breadcrumb-section');
  if (bSec && typeof currentSection !== 'undefined') {
    const breadcrumbKeys = {
      'section-dashboard': 'nav.dashboard',
      'section-orders': 'nav.orders',
      'section-kirim': 'nav.kirim',
      'section-catalog': 'nav.catalog',
      'section-partners': 'nav.partners',
      'section-staff': 'nav.staff',
      'section-suppliers': 'nav.suppliers',
      'section-crm': 'nav.crm',
      'section-finance': 'nav.finance',
      'section-ai': 'nav.ai'
    };
    if (breadcrumbKeys[currentSection]) {
      bSec.innerText = t(breadcrumbKeys[currentSection]);
    }
  }

  // Update User Role Badge
  if (currentUser) {
    const roleEl = document.getElementById('user-role-badge');
    if (roleEl) {
      roleEl.innerText = t(`role.${currentUser.role_id}`, currentUser.role_id);
    }
  }

  lucide.createIcons();
  showNotification(currentLang === 'uz' ? "Til O'zbekchaga o'zgartirildi 🇺🇿" : "Язык переключен на русский 🇷🇺", "success");
}

function updateLanguageUI() {
  const btnUz = document.getElementById('btn-lang-uz');
  const btnRu = document.getElementById('btn-lang-ru');

  if (btnUz && btnRu) {
    if (currentLang === 'uz') {
      btnUz.className = "px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-sm transition";
      btnRu.className = "px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition";
    } else {
      btnRu.className = "px-2.5 py-1 rounded-lg font-bold bg-blue-600 text-white shadow-sm transition";
      btnUz.className = "px-2.5 py-1 rounded-lg font-semibold text-slate-400 hover:text-white transition";
    }
  }

  const btnLoginUz = document.getElementById('btn-login-lang-uz');
  const btnLoginRu = document.getElementById('btn-login-lang-ru');
  if (btnLoginUz && btnLoginRu) {
    if (currentLang === 'uz') {
      btnLoginUz.className = "px-2.5 py-1 rounded font-bold bg-blue-600 text-white shadow-sm transition";
      btnLoginRu.className = "px-2.5 py-1 rounded font-semibold text-slate-400 hover:text-white transition";
    } else {
      btnLoginRu.className = "px-2.5 py-1 rounded font-bold bg-blue-600 text-white shadow-sm transition";
      btnLoginUz.className = "px-2.5 py-1 rounded font-semibold text-slate-400 hover:text-white transition";
    }
  }
}

function updateStaticDOMTranslations() {
  // Elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.innerText = t(key, el.innerText);
  });

  // Elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key, el.placeholder);
  });

  // Elements with data-i18n-title
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key, el.title);
  });
}

/**
 * Returns localized name for database models & services
 */
function getLocalizedName(item) {
  if (!item) return '';
  if (currentLang === 'ru') {
    return item.name_ru || item.title_ru || item.name || item.title || '';
  }
  return item.name_uz || item.title_uz || item.name || item.title || '';
}

/**
 * Ensure database models have both name_uz and name_ru
 */
function updateDatabaseLocalization() {
  if (!window.DB) return;

  const toolTranslations = {
    1: { uz: "Perforator Bosch GBH 2-26 DRE", ru: "Перфоратор Bosch GBH 2-26 DRE" },
    2: { uz: "Otboyniy Molotok Makita HM1203C", ru: "Отбойный молоток Makita HM1203C" },
    3: { uz: "Benzinli Generator Honda EM5500CXS", ru: "Бензиновый генератор Honda EM5500CXS" },
    4: { uz: "Payvandlash Apparati Resanta SAI-220", ru: "Сварочный аппарат Ресанта САИ-220" }
  };

  (DB.product_models || []).forEach(m => {
    if (toolTranslations[m.id]) {
      m.name_uz = toolTranslations[m.id].uz;
      m.name_ru = toolTranslations[m.id].ru;
    } else {
      if (!m.name_uz) m.name_uz = m.name;
      if (!m.name_ru) m.name_ru = m.name;
    }
  });

  const catTranslations = {
    1: { uz: "Elektr asboblar", ru: "Электроинструменты" },
    2: { uz: "Benzinli texnika", ru: "Бензиновая техника" },
    3: { uz: "Payvandlash", ru: "Сварочное оборудование" }
  };

  (DB.categories || []).forEach(c => {
    if (catTranslations[c.id]) {
      c.name_uz = catTranslations[c.id].uz;
      c.name_ru = catTranslations[c.id].ru;
    } else {
      if (!c.name_uz) c.name_uz = c.name;
      if (!c.name_ru) c.name_ru = c.name;
    }
  });
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  updateLanguageUI();
  updateStaticDOMTranslations();
  updateDatabaseLocalization();
});
