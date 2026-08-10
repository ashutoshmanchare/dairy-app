import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { RateChart, RateChartService } from "../../core/services/rate-chart.service";

@Component({
  selector: "app-rate-chart",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./rate-chart.component.html"
})
export class RateChartComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rateChartService = inject(RateChartService);

  charts: RateChart[] = [];
  loading = true;
  saving = false;
  msg = "";

  form = this.fb.group({
    name: ["", [Validators.required]],
    animalType: ["cow", [Validators.required]],
    calculationType: ["fat_snf", [Validators.required]],
    fixedRate: [null as number | null],
    baseFat: [3.5],
    baseSnf: [8.5],
    baseRate: [35.00],
    effectiveFrom: ["", [Validators.required]]
  });

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ effectiveFrom: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.rateChartService.getRateCharts().subscribe({
      next: (data) => {
        this.charts = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  activate(id: number): void {
    this.rateChartService.setActiveRateChart(id).subscribe({
      next: (res) => {
        this.msg = res.message;
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const payload = this.form.value;
    
    this.rateChartService.createRateChart(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Rate chart created successfully!";
        this.form.reset({
          name: "",
          animalType: "cow",
          calculationType: "fat_snf",
          fixedRate: null,
          baseFat: 3.5,
          baseSnf: 8.5,
          baseRate: 35.00,
          effectiveFrom: new Date().toISOString().slice(0, 10)
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: () => (this.saving = false)
    });
  }
}
