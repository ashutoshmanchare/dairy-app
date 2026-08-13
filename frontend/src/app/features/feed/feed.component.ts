import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { Customer } from "../../core/models/customer.model";
import { CustomerService } from "../../core/services/customer.service";
import { FeedItem, FeedSaleRecord, FeedService } from "../../core/services/feed.service";

@Component({
  selector: "app-feed",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./feed.component.html"
})
export class FeedComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly feedService = inject(FeedService);
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  get dairyName(): string {
    return localStorage.getItem("dairy_name") || "श्री ढोकेश्वर दूध संकलन केंद्र तिखोल";
  }

  feedItems: FeedItem[] = [];
  sales: FeedSaleRecord[] = [];
  customers: Customer[] = [];
  customerFilter = "";
  startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  endDate = new Date().toISOString().slice(0, 10);
  loading = true;
  savingSale = false;
  savingItem = false;
  showForm = false;
  showItemForm = false;
  msg = "";
  errorMsg = "";

  saleForm = this.fb.group({
    customerId: [0, [Validators.required, Validators.min(1)]],
    feedItemId: [0, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    saleDate: ["", [Validators.required]]
  });

  itemForm = this.fb.group({
    name: ["", [Validators.required]],
    price: [0, [Validators.required, Validators.min(1)]],
    stockQuantity: [0, [Validators.required, Validators.min(0)]],
    unit: ["bag", [Validators.required]]
  });

  get filteredCustomers(): Customer[] {
    const q = this.customerFilter.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.farmerCode && c.farmerCode.includes(q))
    );
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

  get filteredSales(): FeedSaleRecord[] {
    if (!this.startDate || !this.endDate) return this.sales;
    const start = this.startDate;
    const end = this.endDate;
    return this.sales.filter((s) => {
      const dateStr = this.formatToLocalDate(s.saleDate);
      return dateStr >= start && dateStr <= end;
    });
  }

  get salesSummary() {
    const summary: Record<string, { quantity: number; amount: number }> = {};
    let totalQty = 0;
    let totalAmt = 0;
    for (const sale of this.filteredSales) {
      const key = sale.feedItemName || "Unknown";
      if (!summary[key]) {
        summary[key] = { quantity: 0, amount: 0 };
      }
      summary[key].quantity += Number(sale.quantity || 0);
      summary[key].amount += Number(sale.totalAmount || 0);
      totalQty += Number(sale.quantity || 0);
      totalAmt += Number(sale.totalAmount || 0);
    }
    return {
      items: Object.entries(summary).map(([name, data]) => ({
        name,
        quantity: data.quantity,
        amount: data.amount
      })),
      totalQuantity: totalQty,
      totalAmount: totalAmt
    };
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }

  openForm(): void {
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  openItemForm(): void {
    this.showItemForm = true;
  }

  closeItemForm(): void {
    this.showItemForm = false;
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.saleForm.patchValue({ saleDate: today });
    this.customerService.getCustomers().subscribe((data) => (this.customers = data));
    this.load();
  }

  load(): void {
    this.loading = true;
    this.feedService.getFeedItems().subscribe((items) => {
      this.feedItems = items;
      this.feedService.getFeedSales().subscribe({
        next: (sales) => {
          this.sales = sales;
          this.loading = false;
        },
        error: () => (this.loading = false)
      });
    });
  }

  submitItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }
    this.savingItem = true;
    const payload = this.itemForm.getRawValue() as Omit<FeedItem, "id">;
    this.feedService.createFeedItem(payload).subscribe({
      next: () => {
        this.savingItem = false;
        this.showItemForm = false;
        this.msg = "Feed inventory item created!";
        this.itemForm.reset({ name: "", price: 0, stockQuantity: 0, unit: "bag" });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: () => (this.savingItem = false)
    });
  }

  submitSale(): void {
    if (this.saleForm.invalid || Number(this.saleForm.value.customerId) === 0 || Number(this.saleForm.value.feedItemId) === 0) {
      this.saleForm.markAllAsTouched();
      return;
    }
    this.savingSale = true;
    this.errorMsg = "";
    const payload = this.saleForm.getRawValue() as { customerId: number; feedItemId: number; quantity: number; saleDate: string };

    this.feedService.recordFeedSale(payload).subscribe({
      next: () => {
        this.savingSale = false;
        this.showForm = false;
        this.msg = "Feed sale recorded & deducted successfully!";
        this.saleForm.reset({
          customerId: 0,
          feedItemId: 0,
          quantity: 1,
          saleDate: new Date().toISOString().slice(0, 10)
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.savingSale = false;
        this.errorMsg = err.error?.message || "Failed to record sale";
        setTimeout(() => (this.errorMsg = ""), 5000);
      }
    });
  }
}
