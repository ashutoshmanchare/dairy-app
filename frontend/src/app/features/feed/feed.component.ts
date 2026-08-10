import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
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

  feedItems: FeedItem[] = [];
  sales: FeedSaleRecord[] = [];
  customers: Customer[] = [];
  customerFilter = "";
  loading = true;
  savingSale = false;
  savingItem = false;
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
