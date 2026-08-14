import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { Subscription } from "rxjs";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";
import { TranslationService } from "../../core/services/translation.service";

@Component({
  selector: "app-customers",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./customers.component.html"
})
export class CustomersComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly translation = inject(TranslationService);

  get dairyName(): string {
    return localStorage.getItem("dairy_name") || "श्री ढोकेश्वर दूध संकलन केंद्र तिखोल";
  }

  customers: Customer[] = [];
  searchTerm = "";
  editingId: string | number | null = null;
  msg = "";
  errorMsg = "";
  loading = true;
  showForm = false;
  showSuccessPopup = false;
  successPopupMsg = "";
  private popupTimer?: any;

  form = this.fb.group({
    name: ["", [Validators.required]],
    mobile: ["", [Validators.required, Validators.minLength(10), Validators.maxLength(15)]],
    address: [""],
    farmerCode: [""],
    village: [""],
    bankDetails: [""],
    defaultAnimalType: ["cow", [Validators.required]],
    joiningDate: [""],
    status: ["active", [Validators.required]]
  });

  get filteredCustomers(): Customer[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter((c) => {
      const code = (c.farmerCode || "").toString().toLowerCase();
      const mobile = (c.mobile || "").toString();
      const name = (c.name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || mobile.includes(q);
    });
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }

  private customerSub?: Subscription;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    if (this.customerSub) this.customerSub.unsubscribe();
    this.customerSub = this.service.getCustomers().subscribe({
      next: (rows) => {
        this.customers = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getNextFarmerCode(): string {
    const codes = this.customers
      .map(c => parseInt(String(c.farmerCode || ""), 10))
      .filter(n => !isNaN(n));
    const max = codes.length > 0 ? Math.max(...codes) : 0;
    return String(max + 1);
  }

  openAdd(): void {
    this.editingId = null;
    this.errorMsg = "";
    this.form.reset();
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({
      farmerCode: this.getNextFarmerCode(),
      defaultAnimalType: "cow",
      status: "active",
      joiningDate: today
    });
    this.showForm = true;
  }

  edit(c: Customer): void {
    this.editingId = c.id;
    this.errorMsg = "";
    this.form.patchValue(c as any);
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.errorMsg = "";
    this.form.reset();
  }

  remove(id: string | number): void {
    if (confirm("Are you sure you want to delete this farmer?")) {
      this.service.deleteCustomer(id).subscribe(() => {
        this.msg = "Farmer deleted";
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      });
    }
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.charAt(0).toUpperCase();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMsg = "";
    const rawVal = this.form.getRawValue();
    
    // Ensure empty strings are sent as null to prevent MySQL date/enum parse errors
    const payload = {
      name: rawVal.name,
      mobile: rawVal.mobile,
      address: rawVal.address || "",
      farmerCode: rawVal.farmerCode || null,
      village: rawVal.village || "",
      bankDetails: rawVal.bankDetails || "",
      defaultAnimalType: rawVal.defaultAnimalType || "cow",
      joiningDate: rawVal.joiningDate || new Date().toISOString().slice(0, 10),
      status: rawVal.status || "active"
    } as any;

    const request$ = this.editingId
      ? this.service.updateCustomer(this.editingId, payload)
      : this.service.addCustomer(payload);
      
    request$.subscribe({
      next: () => {
        const wasEditing = !!this.editingId; // save BEFORE clearing
        this.editingId = null;
        this.form.reset();
        this.showForm = false;
        this.load();
        this.showToast(wasEditing ? "शेतकरी माहिती अपडेट झाली! ✓" : "नवीन शेतकरी नोंदणी यशस्वी! ✓");
      },
      error: (err) => {
        console.error("Customer save error:", err);
        this.errorMsg = "शेतकरी जतन करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.";
        setTimeout(() => this.errorMsg = "", 4000);
      }
    });
  }

  private showToast(message: string): void {
    this.successPopupMsg = message;
    this.showSuccessPopup = true;
    if (this.popupTimer) clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => {
      this.showSuccessPopup = false;
    }, 3000);
  }

  dismissPopup(): void {
    this.showSuccessPopup = false;
    if (this.popupTimer) clearTimeout(this.popupTimer);
  }
}
