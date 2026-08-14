import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { Customer } from "../../core/models/customer.model";
import { MilkCollection } from "../../core/models/milk.model";
import { CustomerService } from "../../core/services/customer.service";
import { MilkService } from "../../core/services/milk.service";
import { AdvanceService } from "../../core/services/advance.service";
import { DeductionService } from "../../core/services/deduction.service";
import { PaymentService, PaymentSummary } from "../../core/services/payment.service";

export interface InvoiceRecord {
  customerId: string | number;
  farmerCode: string;
  customerName: string;
  rate: number;
  liter: number;
  amount: number;
  deduction: number;
  payment: number;
}

@Component({
  selector: "app-invoice",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./invoice.component.html"
})
export class InvoiceComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly paymentService = inject(PaymentService);
  private readonly milkService = inject(MilkService);
  private readonly advanceService = inject(AdvanceService);
  private readonly deductionService = inject(DeductionService);

  get dairyName(): string {
    return localStorage.getItem("dairy_name") || "श्री ढोकेश्वर दूध संकलन केंद्र तिखोल";
  }

  customers: Customer[] = [];
  invoiceRecords: InvoiceRecord[] = [];
  loadingSummary = false;
  
  // Overall Summary Footer
  totalRate = 0;
  totalLiter = 0;
  totalAmount = 0;
  totalDeduction = 0;
  totalPayment = 0;

  form = this.fb.group({
    startDate: ["", [Validators.required]],
    endDate: ["", [Validators.required]]
  });

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    this.form.patchValue({
      startDate: tenDaysAgo,
      endDate: today
    });

    this.form.valueChanges.subscribe(() => {
      this.generateBatchInvoices();
    });

    this.generateBatchInvoices();
  }

  formatToLocalDate(dateInput: any): string {
    if (!dateInput) return "";
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj.getTime())) return "";
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  generateBatchInvoices(): void {
    const startDate = this.form.value.startDate || "";
    const endDate = this.form.value.endDate || "";
    if (!startDate || !endDate) return;

    this.loadingSummary = true;
    
    forkJoin({
      customers: this.customerService.getCustomers(),
      collections: this.milkService.getCollections(),
      advances: this.advanceService.getAdvances(),
      deductions: this.deductionService.getDeductions()
    }).subscribe({
      next: (res) => {
        this.customers = res.customers;
        
        // Filter collections by date
        const collectionsFiltered = res.collections.filter(c => {
          const dateStr = this.formatToLocalDate(c.entryDate);
          return dateStr >= startDate && dateStr <= endDate;
        });

        // Filter deductions by date (unrecovered only)
        const deductionsFiltered = res.deductions.filter(d => {
          const dateStr = this.formatToLocalDate(d.deductionDate);
          return dateStr >= startDate && dateStr <= endDate && d.isRecovered === 0;
        });

        const recordsMap: Record<string, InvoiceRecord> = {};
        
        // Initialize for each customer
        for (const cust of this.customers) {
          recordsMap[String(cust.id)] = {
            customerId: cust.id,
            farmerCode: cust.farmerCode || "N/A",
            customerName: cust.name,
            rate: 0,
            liter: 0,
            amount: 0,
            deduction: 0,
            payment: 0
          };
        }

        // Populate milk totals
        for (const col of collectionsFiltered) {
          const record = recordsMap[String(col.customerId)];
          if (record) {
            record.liter += Number(col.quantity || 0);
            record.amount += Number(col.totalAmount || 0);
          }
        }

        // Populate deductions
        for (const ded of deductionsFiltered) {
          const record = recordsMap[String(ded.customerId)];
          if (record) {
            record.deduction += Number(ded.amount || 0);
          }
        }

        // Calculate outstanding advances per customer to auto-recover if gross > 0
        const outstandingAdvancesMap: Record<string, number> = {};
        for (const adv of res.advances) {
          const outstanding = Number(adv.amount || 0) - Number(adv.recoveredAmount || 0);
          if (outstanding > 0) {
            const advKey = String(adv.customerId);
            outstandingAdvancesMap[advKey] = (outstandingAdvancesMap[advKey] || 0) + outstanding;
          }
        }

        // Final calculations per customer
        for (const custId of Object.keys(recordsMap)) {
          const record = recordsMap[custId];
          if (!record) continue;
          
          const outstandingAdv = outstandingAdvancesMap[custId] || 0;
          const advanceRecovery = Math.min(outstandingAdv, Math.max(0, record.amount - record.deduction));
          
          record.payment = Math.max(0, record.amount - record.deduction - advanceRecovery);
          record.rate = record.liter > 0 ? (record.amount / record.liter) : 0;
        }

        // Keep records (either with liters, deductions, or all active customers)
        this.invoiceRecords = Object.values(recordsMap).filter(r => r.liter > 0 || r.deduction > 0);
        
        // If no filtered records, show all customers who have milk records
        if (this.invoiceRecords.length === 0) {
          this.invoiceRecords = Object.values(recordsMap);
        }
        
        // Sum totals
        this.totalLiter = this.invoiceRecords.reduce((sum, r) => sum + r.liter, 0);
        this.totalAmount = this.invoiceRecords.reduce((sum, r) => sum + r.amount, 0);
        this.totalDeduction = this.invoiceRecords.reduce((sum, r) => sum + r.deduction, 0);
        this.totalPayment = this.invoiceRecords.reduce((sum, r) => sum + r.payment, 0);
        this.totalRate = this.totalLiter > 0 ? (this.totalAmount / this.totalLiter) : 0;
        
        this.loadingSummary = false;
      },
      error: () => {
        this.loadingSummary = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}
