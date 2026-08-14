import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { MilkSaleRecord, MilkSaleService } from "../../core/services/milk-sale.service";

@Component({
  selector: "app-milk-sale",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./milk-sale.component.html"
})
export class MilkSaleComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly saleService = inject(MilkSaleService);

  sales: MilkSaleRecord[] = [];
  loading = true;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    buyerName: ["", [Validators.required]],
    saleDate: ["", [Validators.required]],
    shift: ["morning", [Validators.required]],
    animalType: ["cow", [Validators.required]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.01)]],
    rate: [null as number | null, [Validators.required, Validators.min(0.01)]]
  });

  get calculatedTotal(): number {
    const q = this.form.get("quantity")?.value || 0;
    const r = this.form.get("rate")?.value || 0;
    return Number((q * r).toFixed(2));
  }

  get totalQuantitySold(): number {
    return this.sales.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
  }

  get totalRevenue(): number {
    return this.sales.reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ saleDate: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.saleService.getMilkSales().subscribe({
      next: (data) => {
        this.sales = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMsg = "";
    
    const val = this.form.value;
    const payload: MilkSaleRecord = {
      buyerName: val.buyerName!,
      saleDate: val.saleDate!,
      shift: val.shift as "morning" | "evening",
      animalType: val.animalType as "cow" | "buffalo",
      quantity: Number(val.quantity),
      rate: Number(val.rate)
    };

    this.saleService.createMilkSale(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Milk sale recorded successfully!";
        this.form.reset({
          buyerName: "",
          saleDate: new Date().toISOString().slice(0, 10),
          shift: "morning",
          animalType: "cow",
          quantity: null,
          rate: null
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to save milk sale.";
      }
    });
  }

  remove(id?: string | number): void {
    if (!id) return;
    if (confirm("Are you sure you want to delete this milk sale record?")) {
      this.saleService.deleteMilkSale(id).subscribe({
        next: () => {
          this.msg = "Record deleted successfully!";
          this.load();
          setTimeout(() => (this.msg = ""), 3000);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}
