import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";

import { TranslationService } from "../../core/services/translation.service";

@Component({
  selector: "app-customers",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./customers.component.html"
})
export class CustomersComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly fb = inject(FormBuilder);
  readonly translation = inject(TranslationService);

  customers: Customer[] = [];
  editingId: number | null = null;
  msg = "";
  errorMsg = "";
  loading = true;
  showForm = false;

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

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.getCustomers().subscribe({
      next: (rows) => {
        this.customers = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openAdd(): void {
    this.editingId = null;
    this.errorMsg = "";
    this.form.reset();
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({
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

  remove(id: number): void {
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
        this.msg = this.editingId ? "Farmer updated successfully" : "Farmer added successfully";
        this.editingId = null;
        this.form.reset();
        this.showForm = false;
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || "Failed to save farmer profile. Please check inputs.";
      }
    });
  }
}
