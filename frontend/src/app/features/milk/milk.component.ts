import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnInit, ViewChild, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { Subscription } from "rxjs";
import { take } from "rxjs/operators";
import { Customer } from "../../core/models/customer.model";
import { MilkCollection } from "../../core/models/milk.model";
import { CustomerService } from "../../core/services/customer.service";
import { MilkService } from "../../core/services/milk.service";
import { OfflineService } from "../../core/services/offline.service";
import { RateChartService } from "../../core/services/rate-chart.service";
import { TranslationService } from "../../core/services/translation.service";

@Component({
  selector: "app-milk",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: "./milk.component.html"
})
export class MilkComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly milkService = inject(MilkService);
  private readonly customerService = inject(CustomerService);
  private readonly rateChartService = inject(RateChartService);
  private readonly offlineService = inject(OfflineService);
  readonly translation = inject(TranslationService);

  get dairyName(): string {
    return localStorage.getItem("dairy_name") || "श्री ढोकेश्वर दूध संकलन केंद्र तिखोल";
  }

  @ViewChild("farmerCodeInput") farmerCodeInput!: ElementRef;

  private collectionsSub?: Subscription;

  customers: Customer[] = [];
  collections: MilkCollection[] = [];
  showAddForm = false; // False by default to show collections list view first
  showQuickAddCustomer = false;
  listShiftFilter: "morning" | "evening" = "morning";
  listAnimalFilter: "cow" | "buffalo" = "cow";

  quickCustomerForm = this.fb.group({
    farmerCode: ["", [Validators.required]],
    name: ["", [Validators.required]],
    mobile: ["", [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    defaultAnimalType: ["cow", [Validators.required]]
  });

  // Custom Keypad properties
  activeField: "farmerCode" | "quantity" | "fat" | "snf" | "clr" = "farmerCode";
  
  selectedCustomerName = "";
  selectedCustomerMobile = "";
  yesterdayQty = 0;
  yesterdayRate = 0;

  totalPreview = 0;
  calculatedRate = 0;
  loading = true;
  saving = false;
  msg = "";
  
  customerFilter = "";

  isOnline = true;
  queuedCount = 0;

  form = this.fb.group({
    customerId: ["", [Validators.required]],
    farmerCode: ["", [Validators.required]],
    entryDate: ["", [Validators.required]],
    shift: ["morning", [Validators.required]],
    animalType: ["cow", [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0.01)]],
    fat: [0, [Validators.required, Validators.min(0.1)]],
    snf: [0, [Validators.required, Validators.min(0.1)]],
    clr: [0]
  });

  get filteredCustomers(): Customer[] {
    const q = this.customerFilter.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.farmerCode && c.farmerCode.includes(q))
    );
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const currentHour = new Date().getHours();
    const currentShift = currentHour >= 15 ? "evening" : "morning";

    this.form.patchValue({ 
      entryDate: today,
      shift: currentShift
    });

    this.customerService.getCustomers().pipe(take(1)).subscribe((rows) => {
      this.customers = rows;
      this.load();
    });

    // Listen to changes for auto-rate calculation
    this.form.valueChanges.subscribe(() => {
      this.updateCalculations();
    });

    // Listen to network status
    this.offlineService.isOnline$.subscribe((status) => {
      this.isOnline = status;
      this.queuedCount = this.offlineService.getQueuedEntries().length;
    });
  }

  load(): void {
    this.loading = true;
    if (this.collectionsSub) {
      this.collectionsSub.unsubscribe();
    }
    this.collectionsSub = this.milkService.getCollections().subscribe({
      next: (rows) => {
        // Prepend offline queued collections to the list for visibility
        const offlineEntries = this.offlineService.getQueuedEntries().map(e => ({
          ...e,
          customerName: this.customers.find(c => String(c.id) === String(e.customerId))?.name || "Customer",
          farmerCode: this.customers.find(c => String(c.id) === String(e.customerId))?.farmerCode || "N/A"
        }));
        this.collections = [...offlineEntries, ...rows];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getMaskedMobile(mobile?: string): string {
    if (!mobile) return "";
    const clean = mobile.replace(/[^0-9]/g, "");
    if (clean.length < 10) return clean;
    return clean.slice(0, 6) + "XXXX";
  }

  formatToLocalDate(dateInput: any): string {
    if (!dateInput) return "";
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return "";
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  getYesterdayDateString(): string {
    const activeDateVal = this.form.get("entryDate")?.value;
    const dateObj = activeDateVal ? new Date(activeDateVal) : new Date();
    dateObj.setDate(dateObj.getDate() - 1);
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yyyy = dateObj.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  updateYesterdayInfo(customerId: string | number): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatToLocalDate(yesterday);
    
    const match = this.collections.find(
      (c) => c.customerId === customerId && this.formatToLocalDate(c.entryDate) === yesterdayStr
    );
    
    if (match) {
      this.yesterdayQty = match.quantity;
      this.yesterdayRate = match.rate;
    } else {
      this.yesterdayQty = 0;
      this.yesterdayRate = 0;
    }
  }

  onFarmerCodeChange(code: string): void {
    const trimmed = code.trim();
    if (!trimmed) {
      this.form.patchValue({ customerId: "" });
      this.selectedCustomerName = "";
      this.selectedCustomerMobile = "";
      this.yesterdayQty = 0;
      this.yesterdayRate = 0;
      return;
    }

    const farmer = this.customers.find((c) => c.farmerCode === trimmed);
    if (farmer) {
      this.form.patchValue({ 
        customerId: String(farmer.id),
        animalType: farmer.defaultAnimalType || "cow"
      }, { emitEvent: false });
      this.selectedCustomerName = farmer.name;
      this.selectedCustomerMobile = farmer.mobile || "";
      this.updateYesterdayInfo(farmer.id);
    } else {
      this.form.patchValue({ customerId: "" }, { emitEvent: false });
      this.selectedCustomerName = "Farmer Code not found";
      this.selectedCustomerMobile = "";
      this.yesterdayQty = 0;
      this.yesterdayRate = 0;
    }
  }

  onCustomerSelectChange(event: any): void {
    const targetVal = event.target?.value;
    if (!targetVal) return;
    const parts = targetVal.split(":");
    const id = Number(parts[1]?.trim() || parts[0]?.trim() || targetVal);

    const farmer = this.customers.find((c) => String(c.id) === String(id));
    if (farmer) {
      this.form.patchValue({
        farmerCode: farmer.farmerCode || "",
        animalType: farmer.defaultAnimalType || "cow"
      });
      this.selectedCustomerName = farmer.name;
      this.selectedCustomerMobile = farmer.mobile || "";
      this.updateYesterdayInfo(farmer.id);
    }
  }

  // Summary footer calculations
  get filteredCollections(): MilkCollection[] {
    const formDate = this.form.get("entryDate")?.value || "";
    return this.collections.filter((c) => {
      const dateMatch = this.formatToLocalDate(c.entryDate) === this.formatToLocalDate(formDate);
      const shiftMatch = c.shift === this.listShiftFilter;
      const animalMatch = c.animalType === this.listAnimalFilter;
      return dateMatch && shiftMatch && animalMatch;
    });
  }

  get totalLiters(): number {
    return this.filteredCollections.reduce((sum, c) => sum + Number(c.quantity || 0), 0);
  }

  get totalAmount(): number {
    return this.filteredCollections.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);
  }

  get avgFat(): number {
    const valid = this.filteredCollections.filter(c => Number(c.fat) > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((sum, c) => sum + Number(c.fat || 0), 0) / valid.length;
  }

  get avgSnf(): number {
    const valid = this.filteredCollections.filter(c => Number(c.snf) > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((sum, c) => sum + Number(c.snf || 0), 0) / valid.length;
  }

  get avgRate(): number {
    const valid = this.filteredCollections.filter(c => Number(c.rate) > 0);
    if (valid.length === 0) return 0;
    return valid.reduce((sum, c) => sum + Number(c.rate || 0), 0) / valid.length;
  }

  get presentCount(): number {
    return new Set(this.filteredCollections.map(c => c.customerId)).size;
  }

  get absentCount(): number {
    return Math.max(0, this.customers.length - this.presentCount);
  }

  get totalFarmersCount(): number {
    return this.customers.length;
  }

  resetForm(): void {
    this.form.patchValue({
      farmerCode: "",
      customerId: "",
      quantity: 0,
      fat: 0,
      snf: 0,
      clr: 0
    }, { emitEvent: false });
    this.selectedCustomerName = "";
    this.selectedCustomerMobile = "";
    this.yesterdayQty = 0;
    this.yesterdayRate = 0;
    this.calculatedRate = 0;
    this.totalPreview = 0;
    this.activeField = "farmerCode";
  }

  updateCalculations(): void {
    const val = this.form.value;
    const fat = Number(val.fat || 0);
    const snf = Number(val.snf || 0);
    const qty = Number(val.quantity || 0);
    const animalType = val.animalType as "cow" | "buffalo";

    if (fat > 0 && snf > 0) {
      if (this.isOnline) {
        this.rateChartService.calculateRate(animalType, fat, snf).subscribe({
          next: (res) => {
            this.calculatedRate = res.rate;
            this.totalPreview = qty * res.rate;
          }
        });
      } else {
        // Simple offline local rates fallback formula (Cow standard, Buffalo standard)
        const baseRate = animalType === "cow" ? 35.00 : 55.00;
        this.calculatedRate = baseRate + (fat - 3.5) * 3 + (snf - 8.5) * 2;
        this.calculatedRate = Math.max(10, Number(this.calculatedRate.toFixed(2)));
        this.totalPreview = qty * this.calculatedRate;
      }
    } else {
      this.calculatedRate = 0;
      this.totalPreview = 0;
    }
  }

  remove(id: string | number): void {
    if (String(id).startsWith("-") || Number(id) < 0) {
      // Remove from offline queue
      let entries = this.offlineService.getQueuedEntries();
      entries = entries.filter(e => e.id !== id);
      localStorage.setItem("offline_milk_collections", JSON.stringify(entries));
      this.load();
      return;
    }

    if (confirm("Are you sure you want to delete this milk collection?")) {
      this.milkService.deleteCollection(id).subscribe(() => this.load());
    }
  }

  lastSavedEntry: any = null;

  submit(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    
    const val = this.form.getRawValue();
    const payload = {
      customerId: val.customerId,
      entryDate: val.entryDate,
      quantity: Number(val.quantity),
      fat: Number(val.fat),
      snf: Number(val.snf),
      clr: Number(val.clr || 0),
      shift: val.shift as "morning" | "evening",
      animalType: val.animalType as "cow" | "buffalo"
    };

    if (!this.isOnline) {
      // Offline Flow
      const offlineEntry = {
        ...payload,
        rate: this.calculatedRate,
        totalAmount: this.totalPreview
      };
      
      this.offlineService.saveToQueue(offlineEntry);
      this.msg = "Saved offline (Pending sync)";
      this.lastSavedEntry = offlineEntry;
      
      // Auto-switch list filters to matches saved record
      this.listShiftFilter = payload.shift;
      this.listAnimalFilter = payload.animalType;
      
      this.resetForm();
      this.load();

      setTimeout(() => {
        this.msg = "";
        if (this.farmerCodeInput) {
          this.farmerCodeInput.nativeElement.focus();
        }
      }, 5000); // Keep open slightly longer for WhatsApp button click
      
      return;
    }

    // Online Flow
    this.saving = true;
    this.milkService.addCollection(payload as any).subscribe({
      next: (res) => {
        this.msg = "Milk entry saved successfully!";
        this.saving = false;
        this.lastSavedEntry = res;
        
        // Auto-switch list filters to matches saved record
        this.listShiftFilter = payload.shift;
        this.listAnimalFilter = payload.animalType;
        
        this.resetForm();
        this.load();
        
        // Trigger direct SMS message to farmer
        const farmer = this.customers.find(c => String(c.id) === String(payload.customerId));
        if (farmer) {
          this.sendSms(farmer, res);
        }

        setTimeout(() => {
          this.msg = "";
          if (this.farmerCodeInput) {
            this.farmerCodeInput.nativeElement.focus();
          }
        }, 2000);
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  sendSms(farmer: Customer, collection: any): void {
    if (!farmer || !farmer.mobile) return;
    const cleanMobile = farmer.mobile.replace(/[^0-9]/g, "");
    if (!cleanMobile) return;
    
    const formattedDate = new Date(collection.entryDate || Date.now()).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
    
    const shiftLabel = collection.shift === "morning" ? "सकाळ" : "संध्याकाळ";
    const smsText = `श्री ढोकेश्वर दूध संकलन center:\nदिनांक: ${formattedDate} (${shiftLabel})\nशेतकरी: ${farmer.name}\nदूध: ${collection.quantity}L, FAT: ${collection.fat}%, SNF: ${collection.snf}%\nदर: Rs.${collection.rate}, एकूण: Rs.${collection.totalAmount}`;

    const smsUrl = `sms:${cleanMobile}?body=${encodeURIComponent(smsText)}`;
    window.location.href = smsUrl;
  }

  setActiveField(field: "farmerCode" | "quantity" | "fat" | "snf" | "clr"): void {
    this.activeField = field;
  }

  onKeypadClick(key: string): void {
    const control = this.form.get(this.activeField);
    if (!control) return;
    const currentVal = control.value !== null && control.value !== undefined ? String(control.value) : "";
    
    if (key === ".") {
      if (!currentVal.includes(".")) {
        control.setValue(currentVal === "" ? "0." : currentVal + ".");
      }
    } else {
      if (currentVal === "0" || currentVal === "") {
        control.setValue(key);
      } else {
        control.setValue(currentVal + key);
      }
    }
    
    if (this.activeField === "farmerCode") {
      this.onFarmerCodeChange(String(control.value || ""));
    }
    this.updateCalculations();
  }

  keypadBackspace(): void {
    const control = this.form.get(this.activeField);
    if (!control) return;
    const currentVal = String(control.value || "");
    if (currentVal.length > 0) {
      const nextVal = currentVal.slice(0, -1);
      control.setValue(nextVal === "" ? null : nextVal);
    }
    
    if (this.activeField === "farmerCode") {
      this.onFarmerCodeChange(String(control.value || ""));
    }
    this.updateCalculations();
  }

  keypadNext(): void {
    const sequence: Array<"farmerCode" | "quantity" | "fat" | "snf" | "clr"> = [
      "farmerCode",
      "quantity",
      "fat",
      "snf",
      "clr"
    ];
    const curIdx = sequence.indexOf(this.activeField);
    const nextIdx = (curIdx + 1) % sequence.length;
    this.setActiveField(sequence[nextIdx]);
  }

  shareWhatsApp(row: MilkCollection | any): void {
    const customer = this.customers.find(c => c.id === row.customerId);
    if (!customer || !customer.mobile) {
      alert("Farmer mobile number not found or invalid!");
      return;
    }
    const cleanMobile = customer.mobile.replace(/[^0-9]/g, "");
    const targetMobile = cleanMobile.length > 10 ? cleanMobile.slice(-10) : cleanMobile;
    const formattedDate = new Date(row.entryDate).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    
    const messageText = `*Milk Collection Receipt*
Date: ${formattedDate} (${row.shift.toUpperCase()})
Farmer: ${customer.name} (#${customer.farmerCode || 'N/A'})
Qty: ${row.quantity} L
FAT: ${row.fat}%
SNF: ${row.snf}%
Rate: ₹${row.rate.toFixed(2)}/L
*Total: ₹${row.totalAmount.toFixed(2)}*
Thank you! - Dairy Center`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=91${targetMobile}&text=${encodedText}`;
    window.open(whatsappUrl, "_blank");
  }

  saveQuickCustomer(): void {
    if (this.quickCustomerForm.invalid) {
      this.quickCustomerForm.markAllAsTouched();
      return;
    }
    const val = this.quickCustomerForm.value;
    const payload = {
      farmerCode: val.farmerCode!.trim(),
      name: val.name!.trim(),
      mobile: val.mobile!.trim(),
      defaultAnimalType: val.defaultAnimalType || "cow",
      status: "active" as const
    };

    this.customerService.addCustomer(payload as any).subscribe({
      next: (res) => {
        // Reload customers list
        this.customerService.getCustomers().subscribe((list) => {
          this.customers = list;
          // Automatically select the new farmer
          const added = this.customers.find(c => c.farmerCode === payload.farmerCode);
          if (added) {
            this.form.patchValue({
              customerId: String(added.id),
              farmerCode: added.farmerCode,
              animalType: added.defaultAnimalType || "cow"
            });
            this.selectedCustomerName = added.name;
            this.selectedCustomerMobile = added.mobile || "";
            this.updateYesterdayInfo(added.id);
          }
        });
        
        this.quickCustomerForm.reset({ defaultAnimalType: "cow" });
        this.showQuickAddCustomer = false;
        this.msg = "New Farmer added successfully!";
        setTimeout(() => this.msg = "", 3000);
      },
      error: (err) => {
        alert(err?.error?.message || "Failed to add farmer code");
      }
    });
  }

  goBack(): void {
    if (this.showQuickAddCustomer) {
      this.showQuickAddCustomer = false;
    } else if (this.showAddForm) {
      this.showAddForm = false;
    } else {
      this.router.navigate(["/dashboard"]);
    }
  }
}
