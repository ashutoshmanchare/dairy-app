import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";

@Component({
  selector: "app-customers",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./customers.component.html"
})
export class CustomersComponent implements OnInit {
  private readonly service = inject(CustomerService);
  private readonly fb = inject(FormBuilder);

  customers: Customer[] = [];
  editingId: number | null = null;
  msg = "";
  loading = true;
  showForm = false;

  form = this.fb.group({
    name: ["", [Validators.required]],
    mobile: ["", [Validators.required, Validators.minLength(10)]],
    address: ["", [Validators.required]]
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
    this.form.reset();
    this.showForm = true;
  }

  edit(c: Customer): void {
    this.editingId = c.id;
    this.form.patchValue(c);
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.editingId = null;
    this.form.reset();
  }

  remove(id: number): void {
    this.service.deleteCustomer(id).subscribe(() => {
      this.msg = "Customer deleted";
      this.load();
    });
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
    const payload = this.form.getRawValue() as Omit<Customer, "id">;
    const request$ = this.editingId
      ? this.service.updateCustomer(this.editingId, payload)
      : this.service.addCustomer(payload);
    request$.subscribe(() => {
      this.msg = this.editingId ? "Customer updated" : "Customer added";
      this.editingId = null;
      this.form.reset();
      this.showForm = false;
      this.load();
    });
  }
}
