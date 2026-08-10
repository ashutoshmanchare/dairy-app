import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { MilkCollection } from "../../core/models/milk.model";
import { CustomerService } from "../../core/services/customer.service";
import { MilkService } from "../../core/services/milk.service";

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

  customers: Customer[] = [];
  collections: MilkCollection[] = [];
  totalPreview = 0;
  loading = true;
  saving = false;
  msg = "";
  customerFilter = "";

  form = this.fb.group({
    customerId: [0, [Validators.required]],
    entryDate: ["", [Validators.required]],
    quantity: [0, [Validators.required, Validators.min(0.01)]],
    rate: [0, [Validators.required, Validators.min(0.01)]]
  });

  get filteredCustomers(): Customer[] {
    const q = this.customerFilter.trim().toLowerCase();
    if (!q) {
      return this.customers;
    }
    return this.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ entryDate: today });
    this.customerService.getCustomers().subscribe((rows) => (this.customers = rows));
    this.load();
    this.form.valueChanges.subscribe(() => {
      const v = this.form.getRawValue();
      this.totalPreview = Number(v.quantity || 0) * Number(v.rate || 0);
    });
  }

  load(): void {
    this.loading = true;
    this.milkService.getCollections().subscribe({
      next: (rows) => {
        this.collections = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  remove(id: number): void {
    this.milkService.deleteCollection(id).subscribe(() => this.load());
  }

  submit(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.milkService
      .addCollection(this.form.getRawValue() as Omit<MilkCollection, "id" | "customerName" | "totalAmount">)
      .subscribe({
        next: () => {
          const today = new Date().toISOString().slice(0, 10);
          this.form.reset({ customerId: 0, entryDate: today, quantity: 0, rate: 0 });
          this.totalPreview = 0;
          this.msg = "Milk entry saved";
          this.saving = false;
          this.load();
        },
        error: () => {
          this.saving = false;
        }
      });
  }
}
