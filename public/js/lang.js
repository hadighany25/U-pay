const translations = {
  en: {
    // --- DASHBOARD ---
    greeting_morning: "Good Morning",
    greeting_afternoon: "Good Afternoon",
    greeting_evening: "Good Evening",
    total_balance: "Total Balance",
    btn_transfer: "Transfer",
    btn_payment: "Payment",
    btn_scan: "Scan QR",
    btn_topup: "Top Up",
    recent_trx: "Recent Transactions",
    view_all: "View All",
    nav_home: "Home",
    nav_scan: "Scan",
    nav_setting: "Settings",
    no_trx: "No transactions yet",

    // --- TRANSFER & PAYMENT ---
    nav_transaction: "Transactions",
    tab_transfer: "Transfer Money",
    tab_payment: "Bill Payment",
    lbl_receiver_acc: "Receiver Account",
    lbl_select_biller: "Select Biller",
    lbl_consumer_id: "Consumer ID / Bill ID",
    lbl_amount: "Amount ($)",
    lbl_remark: "Remark",
    btn_confirm_trx: "Confirm Transaction",
    checking_name: "Checking...",
    unknown_user: "Unknown User",

    // --- SCAN QR (NEW) ---
    scan_title: "Scan QR Code",
    scan_instruction: "Place QR code inside the frame",
    btn_gallery: "Gallery",
    btn_my_qr: "My QR",
    my_qr_title: "My Receive QR",
    save_qr: "Save QR",

    // --- SETTINGS ---
    settings_title: "Settings",
    profile_role: "Personal Account",
    security_header: "SECURITY",
    change_pass: "Change Password",
    change_pin: "Change PIN Code",
    general_header: "GENERAL",
    language: "Language",
    logout: "Logout",
    back_dashboard: "Back to Dashboard",
    modal_pass_title: "Change Password",
    modal_pin_title: "Setup PIN Code",
    modal_lang_title: "Select Language",
    modal_logout_title: "Log Out?",
    modal_logout_desc: "Are you sure you want to exit?",
    lbl_old_pass: "Old Password",
    lbl_new_pass: "New Password",
    lbl_confirm_pass: "Confirm Password",
    lbl_new_pin: "New 4-Digit PIN",
    btn_update_pass: "Update Password",
    btn_set_pin: "Set PIN",
    btn_yes_logout: "Yes, Logout",
    btn_cancel: "Cancel",
  },
  kh: {
    // --- DASHBOARD ---
    greeting_morning: "អរុណសួស្ដី",
    greeting_afternoon: "ទិវាសួស្ដី",
    greeting_evening: "សាយ័នសួស្ដី",
    total_balance: "សមតុល្យសរុប",
    btn_transfer: "ផ្ទេរប្រាក់",
    btn_payment: "បង់វិក្កយបត្រ",
    btn_scan: "ស្កេន QR",
    btn_topup: "បញ្ចូលកាត",
    recent_trx: "ប្រតិបត្តិការចុងក្រោយ",
    view_all: "មើលទាំងអស់",
    nav_home: "ទំព័រដើម",
    nav_scan: "ស្កេន",
    nav_setting: "ការកំណត់",
    no_trx: "មិនទាន់មានប្រតិបត្តិការ",

    // --- TRANSFER & PAYMENT ---
    nav_transaction: "ប្រតិបត្តិការ",
    tab_transfer: "ផ្ទេរប្រាក់",
    tab_payment: "បង់វិក្កយបត្រ",
    lbl_receiver_acc: "លេខគណនីអ្នកទទួល",
    lbl_select_biller: "ជ្រើសរើសក្រុមហ៊ុន",
    lbl_consumer_id: "លេខសម្គាល់ / វិក្កយបត្រ",
    lbl_amount: "ចំនួនទឹកប្រាក់ ($)",
    lbl_remark: "កំណត់សម្គាល់",
    btn_confirm_trx: "បញ្ជាក់ប្រតិបត្តិការ",
    checking_name: "កំពុងឆែកឈ្មោះ...",
    unknown_user: "គណនីមិនត្រឹមត្រូវ",

    // --- SCAN QR (NEW) ---
    scan_title: "ស្កេន QR កូដ",
    scan_instruction: "ដាក់ QR កូដក្នុងប្រអប់ដើម្បីស្កេន",
    btn_gallery: "រូបភាព",
    btn_my_qr: "QR ខ្ញុំ",
    my_qr_title: "QR ទទួលប្រាក់របស់ខ្ញុំ",
    save_qr: "រក្សាទុក",

    // --- SETTINGS ---
    settings_title: "ការកំណត់",
    profile_role: "គណនីផ្ទាល់ខ្លួន",
    security_header: "សុវត្ថិភាព",
    change_pass: "ប្តូរលេខសម្ងាត់",
    change_pin: "ប្តូរលេខ PIN",
    general_header: "ទូទៅ",
    language: "ភាសា",
    logout: "ចាកចេញ",
    back_dashboard: "ត្រឡប់ទៅផ្ទាំងដើម",
    modal_pass_title: "ប្តូរលេខសម្ងាត់",
    modal_pin_title: "កំណត់លេខ PIN",
    modal_lang_title: "ជ្រើសរើសភាសា",
    modal_logout_title: "ចាកចេញ?",
    modal_logout_desc: "តើអ្នកពិតជាចង់ចាកចេញមែនទេ?",
    lbl_old_pass: "លេខសម្ងាត់ចាស់",
    lbl_new_pass: "លេខសម្ងាត់ថ្មី",
    lbl_confirm_pass: "បញ្ជាក់លេខសម្ងាត់",
    lbl_new_pin: "លេខ PIN ៤ ខ្ទង់ថ្មី",
    btn_update_pass: "រក្សាទុក",
    btn_set_pin: "កំណត់ PIN",
    btn_yes_logout: "ចាកចេញ",
    btn_cancel: "បោះបង់",
  },
};

function applyLanguage() {
  const lang = localStorage.getItem("lang") || "en";

  // 1. ប្តូរអក្សរតាម Tag data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });

  // 2. ប្តូរ Font (ដាក់ Class kh-font)
  if (lang === "kh") {
    document.body.classList.add("kh-font");
  } else {
    document.body.classList.remove("kh-font");
  }

  // 3. Update UI ផ្សេងៗ (សម្រាប់ Settings)
  const langLabel = document.getElementById("currentLangLabel");
  if (langLabel) langLabel.innerText = lang === "en" ? "EN" : "KH";

  if (document.getElementById("check-en")) {
    document.getElementById("check-en").style.display =
      lang === "en" ? "block" : "none";
    document.getElementById("check-kh").style.display =
      lang === "kh" ? "block" : "none";
    document
      .getElementById("lang-en")
      .classList.toggle("active", lang === "en");
    document
      .getElementById("lang-kh")
      .classList.toggle("active", lang === "kh");
  }
}

// ហៅ function នេះភ្លាមពេលបើក Web
document.addEventListener("DOMContentLoaded", applyLanguage);
