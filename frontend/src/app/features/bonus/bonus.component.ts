import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { BonusRecord, BonusService } from "../../core/services/bonus.service";

@Component({
  selector: "app-bonus",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./bonus.component.html"
})
export class BonusComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly bonusService = inject(BonusService);

  bonuses: BonusRecord[] = [];
  selectedYear = new Date().getFullYear();
  loading = false;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    year: [new Date().getFullYear(), [Validators.required, Validators.min(2000)]],
    bonusRate: [0.50, [Validators.required, Validators.min(0.01)]]
  });

  get totalBonusPayout(): number {
    return this.bonuses.reduce((sum, b) => sum + Number(b.bonusAmount || 0), 0);
  }

  get totalMilkVolume(): number {
    return this.bonuses.reduce((sum, b) => sum + Number(b.totalMilk || 0), 0);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.bonusService.getBonuses(this.selectedYear).subscribe({
      next: (data) => {
        this.bonuses = data;
        this.loading = false;
      },
      error: () => {
        this.bonuses = [];
        this.loading = false;
      }
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
    const year = Number(val.year);
    const rate = Number(val.bonusRate);

    this.bonusService.calculateBonus(year, rate).subscribe({
      next: (res) => {
        this.saving = false;
        this.msg = res.message;
        this.selectedYear = year;
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to calculate bonuses. Make sure collections exist for the selected year.";
      }
    });
  }

  markPaid(bonus: BonusRecord): void {
    const newStatus = bonus.status === "paid" ? "pending" : "paid";
    this.bonusService.markBonusPaid(bonus.id!, newStatus).subscribe({
      next: () => {
        this.msg = `Bonus marked as ${newStatus}!`;
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      }
    });
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}
