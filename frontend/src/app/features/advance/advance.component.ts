import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { AdvanceRecord, AdvanceService } from "../../core/services/advance.service";
import { CustomerService } from "../../core/services/customer.service";

@Component({
  selector: "app-advance",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./advance.component.html"
})
export class AdvanceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly advanceService = inject(AdvanceService);
  private readonly customerService = inject(CustomerService);

  customers: Customer[] = [];
  advances: AdvanceRecord[] = [];
  customerFilter = "";
  loading = true;
  saving = false;
  msg = "";

  form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    amount: [0, [Validators.required, Validators.min(1)]],
    advanceDate: ["", [Validators.required]],
    notes: [""]
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
    this.form.patchValue({ advanceDate: today });
    this.customerService.getCustomers().subscribe((data) => (this.customers = data));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.advanceService.getAdvances().subscribe({
      next: (data) => {
        this.advances = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  submit(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload = this.form.getRawValue() as Omit<AdvanceRecord, "id" | "recoveredAmount">;

    this.advanceService.addAdvance(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Advance recorded successfully!";
        this.form.reset({
          customerId: 0,
          amount: 0,
          advanceDate: new Date().toISOString().slice(0, 10),
          notes: ""
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: () => (this.saving = false)
    });
  }
}
