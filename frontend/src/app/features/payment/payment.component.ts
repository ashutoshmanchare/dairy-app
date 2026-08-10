import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";
import { PaymentRecord, PaymentService, PaymentSummary } from "../../core/services/payment.service";
import { ReportService } from "../../core/services/report.service";

@Component({
  selector: "app-payment",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./payment.component.html"
})
export class PaymentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly customerService = inject(CustomerService);
  private readonly reportService = inject(ReportService);

  customers: Customer[] = [];
  payments: PaymentRecord[] = [];
  customerFilter = "";
  paidPlan = "";
  msg = "";
  paidAmount = 0;
  pendingAmount = 0;
  loading = true;
  saving = false;
  paymentMethod: "Cash" | "UPI" | "Bank" = "Cash";
  showReceipt = false;
  
  // Date range filters for 10-day payouts
  startDate = "";
  endDate = "";
  summary?: PaymentSummary;
  calculatingSummary = false;

  lastReceipt: {
    receiptNo: string;
    customerName: string;
    amount: number;
    method: string;
    date: string;
    status: string;
    notes: string;
  } | null = null;

  form = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    paymentDate: ["", [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    status: ["paid", [Validators.required]],
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
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    this.form.patchValue({ paymentDate: todayStr });

    // Compute standard 10-day cycle dates (Decade payout)
    const day = today.getDate();
    let start: Date, end: Date;
    if (day <= 10) {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 21);
      end = new Date(today.getFullYear(), today.getMonth(), 0); // last day of previous month
    } else if (day <= 20) {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth(), 10);
    } else {
      start = new Date(today.getFullYear(), today.getMonth(), 11);
      end = new Date(today.getFullYear(), today.getMonth(), 20);
    }

    this.startDate = start.toISOString().slice(0, 10);
    this.endDate = end.toISOString().slice(0, 10);

    this.customerService.getCustomers().subscribe((rows) => (this.customers = rows));
    this.loadPayments();
    this.reportService.getSummary().subscribe((s) => {
      this.paidAmount = s.paidAmount || 0;
      this.pendingAmount = s.pendingAmount || 0;
    });
  }

  pay(plan: string): void {
    this.paidPlan = plan;
  }

  selectMethod(method: "Cash" | "UPI" | "Bank"): void {
    this.paymentMethod = method;
  }

  loadPayments(): void {
    this.loading = true;
    this.paymentService.getPayments().subscribe({
      next: (rows) => {
        this.payments = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  customerName(id: number): string {
    return this.customers.find((c) => c.id === id)?.name || "Customer";
  }

  // Handle selected customer change to trigger payout calculations
  onCustomerChange(event: any): void {
    const id = Number(event.target.value);
    if (id > 0) {
      this.fetchPayoutSummary(id);
    } else {
      this.summary = undefined;
      this.form.patchValue({ amount: 0 });
    }
  }

  onDatesChange(): void {
    const id = Number(this.form.value.customerId);
    if (id > 0) {
      this.fetchPayoutSummary(id);
    }
  }

  fetchPayoutSummary(customerId: number): void {
    if (!this.startDate || !this.endDate) return;
    this.calculatingSummary = true;
    this.paymentService.calculateSummary({ customerId, startDate: this.startDate, endDate: this.endDate }).subscribe({
      next: (sum) => {
        this.summary = sum;
        this.form.patchValue({ amount: Number(sum.netAmount) });
        this.calculatingSummary = false;
      },
      error: () => {
        this.calculatingSummary = false;
      }
    });
  }

  submitPayment(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();
    const noteParts = [`[${this.paymentMethod}]`, raw.notes || ""].filter(Boolean);
    
    const payload = {
      customerId: Number(raw.customerId),
      paymentDate: String(raw.paymentDate),
      amount: Number(raw.amount),
      status: raw.status as "paid" | "pending",
      notes: noteParts.join(" ").trim(),
      startDate: this.startDate,
      endDate: this.endDate,
      advanceRecovery: this.summary?.advanceRecovery || 0
    };

    this.paymentService.addPayment(payload).subscribe({
      next: () => {
        this.msg = "Payout payment recorded successfully";
        this.lastReceipt = {
          receiptNo: `RCP-${Date.now().toString().slice(-8)}`,
          customerName: this.customerName(Number(raw.customerId)),
          amount: Number(raw.amount),
          method: this.paymentMethod,
          date: String(raw.paymentDate),
          status: String(raw.status),
          notes: String(raw.notes || "")
        };
        this.showReceipt = true;
        this.summary = undefined;
        
        const todayStr = new Date().toISOString().slice(0, 10);
        this.form.reset({ customerId: 0, paymentDate: todayStr, amount: 0, status: "paid", notes: "" });
        this.customerFilter = "";
        
        this.saving = false;
        this.loadPayments();
        this.reportService.getSummary().subscribe((s) => {
          this.paidAmount = s.paidAmount || 0;
          this.pendingAmount = s.pendingAmount || 0;
        });
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  shareReceipt(): void {
    if (!this.lastReceipt) return;
    if (navigator.share) {
      void navigator.share({
        title: `Receipt ${this.lastReceipt.receiptNo}`,
        text: `${this.lastReceipt.customerName} payout registered: ₹${this.lastReceipt.amount} via ${this.lastReceipt.method}`
      });
    } else {
      this.printReceipt();
    }
  }
}
