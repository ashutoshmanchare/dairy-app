import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";
import { DeductionRecord, DeductionService } from "../../core/services/deduction.service";

@Component({
  selector: "app-deduction",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./deduction.component.html"
})
export class DeductionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly deductionService = inject(DeductionService);
  private readonly customerService = inject(CustomerService);

  customers: Customer[] = [];
  deductions: DeductionRecord[] = [];
  customerFilter = "";
  loading = true;
  saving = false;
  msg = "";

  form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    type: ["loan", [Validators.required]],
    amount: [0, [Validators.required, Validators.min(1)]],
    deductionDate: ["", [Validators.required]],
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
    this.form.patchValue({ deductionDate: today });
    this.customerService.getCustomers().subscribe((data) => (this.customers = data));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.deductionService.getDeductions().subscribe({
      next: (data) => {
        this.deductions = data;
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
    const payload = this.form.getRawValue() as Omit<DeductionRecord, "id" | "isRecovered">;

    this.deductionService.addDeduction(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Deduction recorded successfully!";
        this.form.reset({
          customerId: 0,
          type: "loan",
          amount: 0,
          deductionDate: new Date().toISOString().slice(0, 10),
          notes: ""
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: () => (this.saving = false)
    });
  }
}
