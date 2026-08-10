import { CommonModule } from "@angular/common";
import { Component, ElementRef, OnInit, ViewChild, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { MilkCollection } from "../../core/models/milk.model";
import { CustomerService } from "../../core/services/customer.service";
import { MilkService } from "../../core/services/milk.service";
import { OfflineService } from "../../core/services/offline.service";
import { RateChartService } from "../../core/services/rate-chart.service";

@Component({
  selector: "app-milk",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./milk.component.html"
})
export class MilkComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly milkService = inject(MilkService);
  private readonly customerService = inject(CustomerService);
  private readonly rateChartService = inject(RateChartService);
  private readonly offlineService = inject(OfflineService);

  @ViewChild("farmerCodeInput") farmerCodeInput!: ElementRef;

  customers: Customer[] = [];
  collections: MilkCollection[] = [];
  
  totalPreview = 0;
  calculatedRate = 0;
  loading = true;
  saving = false;
  msg = "";
  
  customerFilter = "";
  selectedCustomerName = "";

  isOnline = true;
  queuedCount = 0;

  form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
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

    this.customerService.getCustomers().subscribe((rows) => {
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
      if (status) {
        this.load();
      }
    });
  }

  load(): void {
    this.loading = true;
    this.milkService.getCollections().subscribe({
      next: (rows) => {
        // Prepend offline queued collections to the list for visibility
        const offlineEntries = this.offlineService.getQueuedEntries().map(e => ({
          ...e,
          customerName: this.customers.find(c => c.id === e.customerId)?.name || "Customer",
          farmerCode: this.customers.find(c => c.id === e.customerId)?.farmerCode || "N/A"
        }));
        this.collections = [...offlineEntries, ...rows];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onFarmerCodeChange(code: string): void {
    const trimmed = code.trim();
    if (!trimmed) {
      this.form.patchValue({ customerId: 0 });
      this.selectedCustomerName = "";
      return;
    }

    const farmer = this.customers.find((c) => c.farmerCode === trimmed);
    if (farmer) {
      this.form.patchValue({ 
        customerId: farmer.id,
        animalType: farmer.defaultAnimalType || "cow"
      }, { emitEvent: false });
      this.selectedCustomerName = farmer.name;
    } else {
      this.form.patchValue({ customerId: 0 }, { emitEvent: false });
      this.selectedCustomerName = "Farmer Code not found";
    }
  }

  onCustomerSelectChange(event: any): void {
    const id = Number(event.target.value);
    const farmer = this.customers.find((c) => c.id === id);
    if (farmer) {
      this.form.patchValue({
        farmerCode: farmer.farmerCode || "",
        animalType: farmer.defaultAnimalType || "cow"
      });
      this.selectedCustomerName = farmer.name;
    }
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

  remove(id: number): void {
    if (id < 0) {
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
      
      this.form.patchValue({
        farmerCode: "",
        customerId: 0,
        quantity: 0,
        fat: 0,
        snf: 0,
        clr: 0
      }, { emitEvent: false });
      
      this.selectedCustomerName = "";
      this.calculatedRate = 0;
      this.totalPreview = 0;
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
        
        this.form.patchValue({
          farmerCode: "",
          customerId: 0,
          quantity: 0,
          fat: 0,
          snf: 0,
          clr: 0
        }, { emitEvent: false });
        
        this.selectedCustomerName = "";
        this.calculatedRate = 0;
        this.totalPreview = 0;
        this.load();
        
        setTimeout(() => {
          this.msg = "";
          if (this.farmerCodeInput) {
            this.farmerCodeInput.nativeElement.focus();
          }
        }, 5000); // Keep open slightly longer for WhatsApp button click
      },
      error: () => {
        this.saving = false;
      }
    });
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
}
