import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root"
})
export class TranslationService {
  private readonly langKey = "dairy_lang";
  private readonly langSubject = new BehaviorSubject<"en" | "mr">(
    (localStorage.getItem(this.langKey) as "en" | "mr") || "mr" // Default to Marathi
  );

  readonly language$ = this.langSubject.asObservable();

  get currentLanguage(): "en" | "mr" {
    return this.langSubject.value;
  }

  toggleLanguage(): void {
    const nextLang = this.currentLanguage === "en" ? "mr" : "en";
    localStorage.setItem(this.langKey, nextLang);
    this.langSubject.next(nextLang);
  }

  private readonly dictionary: Record<string, { en: string; mr: string }> = {
    // Top-level / Common
    "brand_title": { en: "Shree Dairy", mr: "श्री डेअरी" },
    "sub_brand": { en: "Management Center", mr: "दूध संकलन केंद्र" },
    "greet_admin": { en: "Good Morning, Admin 👋", mr: "शुभप्रभात, प्रशासक 👋" },
    "logout": { en: "Logout", mr: "लॉगआउट" },
    "save": { en: "Save", mr: "जतन करा (सेव्ह)" },
    "saving": { en: "Saving...", mr: "जतन होत आहे..." },
    "delete": { en: "Delete", mr: "हटवा" },
    "actions": { en: "Actions", mr: "कृती" },
    "cancel": { en: "Cancel", mr: "रद्द करा" },
    "search": { en: "Search", mr: "शोधा" },

    // Tabs / Nav
    "nav_home": { en: "Home", mr: "मुख्य पान" },
    "nav_customers": { en: "Farmers", mr: "शेतकरी" },
    "nav_collection": { en: "Collection", mr: "दूध संकलन" },
    "nav_payments": { en: "Payments", mr: "बिल वाटप" },
    "nav_more": { en: "More", mr: "इतर मेनू" },

    // Dashboard Cards
    "dash_today_milk": { en: "Today's Milk", mr: "आजचे एकूण दूध" },
    "dash_today_amount": { en: "Today's Amount", mr: "आजची एकूण रक्कम" },
    "dash_pending_pay": { en: "Pending Payments", mr: "देय रक्कम (थकीत)" },
    "dash_total_farmers": { en: "Active Farmers", mr: "सक्रिय शेतकरी" },
    "dash_control_modules": { en: "Control Modules", mr: "नियंत्रण मॉड्यूल्स" },
    
    // Modules Grid
    "mod_collection": { en: "Collection", mr: "दूध संकलन" },
    "mod_farmers": { en: "Farmers", mr: "शेतकरी यादी" },
    "mod_feed": { en: "Cattle Feed", mr: "पशुखाद्य विक्री" },
    "mod_advance": { en: "Advance Loan", mr: "उचल (ऍडव्हान्स)" },
    "mod_deduction": { en: "Deductions", mr: "इतर कपाती" },
    "mod_invoice": { en: "Print Invoice", mr: "बिल पावती" },
    "mod_payments": { en: "Payments", mr: "पैसे वाटप" },
    "mod_rate_chart": { en: "Rate Chart", mr: "दर पत्रक" },
    "mod_reports": { en: "Reports", mr: "संकलन रिपोर्ट" },
    "mod_settings": { en: "Settings", mr: "सेटिंग्ज" },

    // Shift summaries
    "shift_analysis": { en: "Today's Shift Summaries", mr: "आजचा शिफ्ट-निहाय गोषवारा" },
    "shift_morning": { en: "Morning Shift (AM)", mr: "सकाळ शिफ्ट (AM)" },
    "shift_evening": { en: "Evening Shift (PM)", mr: "संध्याकाळ शिफ्ट (PM)" },
    "shift_cow": { en: "Cow Milk", mr: "गाय दूध" },
    "shift_buf": { en: "Buffalo Milk", mr: "म्हैस दूध" },
    "avg_fat": { en: "Avg FAT", mr: "सरासरी फॅट" },
    "avg_snf": { en: "Avg SNF", mr: "सरासरी SNF" },
    "total_liters": { en: "Total Qty", mr: "एकूण लिटर" },
    "total_amt": { en: "Total Amount", mr: "एकूण रक्कम" },

    // Milk Collection Screen
    "record_milk": { en: "Record Milk Collection", mr: "नवीन दुधाची नोंद करा" },
    "coll_date": { en: "Collection Date", mr: "संकलन तारीख" },
    "coll_shift": { en: "Select Shift", mr: "शिफ्ट निवडा" },
    "coll_animal": { en: "Animal Category", mr: "प्राणी प्रवर्ग" },
    "farmer_code": { en: "Farmer Code", mr: "शेतकरी कोड" },
    "farmer_name_search": { en: "Farmer Name Search", mr: "शेतकरी नाव शोध" },
    "milk_qty": { en: "Milk Qty (Liters)", mr: "दूध वजन (लिटर)" },
    "fat_percent": { en: "FAT (%)", mr: "फॅट (%)" },
    "snf_percent": { en: "SNF (%)", mr: "एस.एन.एफ. (%)" },
    "clr_reading": { en: "CLR Reading", mr: "सी.एल.आर. रीडिंग" },
    "rate_calc": { en: "Rate Calculation", mr: "दुधाचा दर (दर/लिटर)" },
    "gross_amt": { en: "Gross Amount", mr: "एकूण रक्कम (रुपये)" },
    "enter_params": { en: "Enter parameters to fetch rate", mr: "दर मिळवण्यासाठी वजन, फॅट आणि SNF टाका" },
    "save_press_enter": { en: "Save Entry (Enter)", mr: "नोंद जतन करा (Save)" },
    "today_collections": { en: "Today's Collections Log", mr: "आजच्या संकलित नोंदी" },
    "no_collections": { en: "No collections logged today", mr: "आज कोणतीही नोंद केलेली नाही" },
    
    // Farmers Page
    "register_farmer": { en: "Register New Farmer", mr: "नवीन शेतकरी नोंदणी" },
    "edit_farmer": { en: "Edit Farmer Profile", mr: "शेतकरी माहिती बदला" },
    "farmers_list": { en: "Farmers Directory", mr: "शेतकरी डिरेक्टरी" },
    "full_name": { en: "Full Name", mr: "संपूर्ण नाव" },
    "mobile_no": { en: "Mobile Number", mr: "मोबाईल क्रमांक" },
    "village": { en: "Village", mr: "गाव" },
    "address": { en: "Residential Address", mr: "पत्ता" },
    "bank_details": { en: "Bank Details (Account/IFSC)", mr: "बँक खाते क्रमांक आणि IFSC कोड" },
    "default_cat": { en: "Default Animal", mr: "प्रवर्ग (गाय/म्हैस)" },
    "status": { en: "Status", mr: "स्थिती" },
    "joining_date": { en: "Joining Date", mr: "प्रवेश तारीख" },
    "active": { en: "Active", mr: "सक्रिय" },
    "inactive": { en: "Inactive", mr: "निष्क्रिय" },
    "no_farmers": { en: "No farmers registered yet", mr: "अद्याप एकाही शेतकऱ्याची नोंद नाही" },

    // Invoices / Payments
    "generate_invoice": { en: "Generate Billing Memo", mr: "दशकाची बिल पावती तयार करा" },
    "payout_calculator": { en: "Payout Calculator", mr: "दशक बिल हिशोब" },
    "advances_deductions": { en: "Advances & Deductions Ledger", mr: "ऍडव्हान्स आणि कपात खाते" }
  };

  t(key: string): string {
    const lang = this.currentLanguage;
    return this.dictionary[key]?.[lang] || key;
  }
}
