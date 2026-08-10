import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";
import { PaymentRecord, PaymentService } from "../../core/services/payment.service";
import { ReportService } from "../../core/services/report.service";

@Component({
  selector: "app-payment",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: "./payment.component.html"
})
export class PaymentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly paymentService = inject(PaymentService);
  private readonly customerService = inject(CustomerService);
  private readonly reportService = inject(ReportService);

  customers: Customer[] = [];
  payments: PaymentRecord[] = [];
  paidPlan = "";
  msg = "";
  paidAmount = 0;
  pendingAmount = 0;
  loading = true;
  saving = false;
  paymentMethod: "Cash" | "UPI" | "Bank" = "Cash";
  showReceipt = false;
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
    customerId: [0, [Validators.required]],
    paymentDate: ["", [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    status: ["paid", [Validators.required]],
    notes: [""]
  });

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ paymentDate: today });
    this.customerService.getCustomers().subscribe((rows) => (this.customers = rows));
    this.loadPayments();
    this.reportService.getSummary().subscribe((s) => {
      this.paidAmount = s.paidAmount;
      this.pendingAmount = s.pendingAmount;
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

  submitPayment(): void {
    if (this.form.invalid || Number(this.form.value.customerId) === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.form.getRawValue();
    const noteParts = [`[${this.paymentMethod}]`, raw.notes || ""].filter(Boolean);
    const payload = {
      ...raw,
      notes: noteParts.join(" ").trim()
    } as Omit<PaymentRecord, "id" | "customerName">;

    this.paymentService.addPayment(payload).subscribe({
      next: () => {
        this.msg = "Payment recorded successfully";
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
        const today = new Date().toISOString().slice(0, 10);
        this.form.reset({ customerId: 0, paymentDate: today, amount: 0, status: "paid", notes: "" });
        this.saving = false;
        this.loadPayments();
        this.reportService.getSummary().subscribe((s) => {
          this.paidAmount = s.paidAmount;
          this.pendingAmount = s.pendingAmount;
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
    if (!this.lastReceipt || !navigator.share) {
      this.printReceipt();
      return;
    }
    void navigator.share({
      title: `Receipt ${this.lastReceipt.receiptNo}`,
      text: `${this.lastReceipt.customerName} paid ₹${this.lastReceipt.amount} via ${this.lastReceipt.method}`
    });
  }
}
