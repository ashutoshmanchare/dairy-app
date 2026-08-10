import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { MilkCollection } from "../../core/models/milk.model";
import { CustomerService } from "../../core/services/customer.service";
import { MilkService } from "../../core/services/milk.service";
import { PaymentService, PaymentSummary } from "../../core/services/payment.service";

@Component({
  selector: "app-invoice",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./invoice.component.html"
})
export class InvoiceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly customerService = inject(CustomerService);
  private readonly paymentService = inject(PaymentService);
  private readonly milkService = inject(MilkService);

  customers: Customer[] = [];
  customerFilter = "";
  loadingSummary = false;
  newDate = new Date();
  
  selectedCustomer?: Customer;
  summary?: PaymentSummary;
  milkRows: MilkCollection[] = [];

  form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    startDate: ["", [Validators.required]],
    endDate: ["", [Validators.required]]
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
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    this.form.patchValue({
      startDate: tenDaysAgo,
      endDate: today
    });

    this.customerService.getCustomers().subscribe((data) => (this.customers = data));
  }

  generateInvoice(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    
    const { customerId, startDate, endDate } = this.form.getRawValue() as { customerId: number; startDate: string; endDate: string };
    
    this.loadingSummary = true;
    this.selectedCustomer = this.customers.find(c => c.id === customerId);

    this.paymentService.calculateSummary({ customerId, startDate, endDate }).subscribe({
      next: (sum) => {
        this.summary = sum;
        
        // Fetch all milk collections in this range to show in the detailed table
        this.milkService.getCollections().subscribe((collections) => {
          this.milkRows = collections.filter(c => 
            c.customerId === customerId && 
            c.entryDate >= startDate && 
            c.entryDate <= endDate
          );
          this.loadingSummary = false;
        });
      },
      error: () => (this.loadingSummary = false)
    });
  }

  print(): void {
    window.print();
  }
}
