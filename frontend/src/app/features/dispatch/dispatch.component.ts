import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { DispatchRecord, DispatchService } from "../../core/services/dispatch.service";

@Component({
  selector: "app-dispatch",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./dispatch.component.html"
})
export class DispatchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dispatchService = inject(DispatchService);

  dispatches: DispatchRecord[] = [];
  loading = true;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    dispatchDate: ["", [Validators.required]],
    shift: ["morning", [Validators.required]],
    vehicleNo: ["", [Validators.required]],
    tankerNo: ["", [Validators.required]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.1)]],
    fat: [null as number | null, [Validators.required, Validators.min(1.0), Validators.max(15.0)]],
    snf: [null as number | null, [Validators.required, Validators.min(4.0), Validators.max(12.0)]]
  });

  get totalDispatchedLiters(): number {
    return this.dispatches.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ dispatchDate: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.dispatchService.getDispatches().subscribe({
      next: (data) => {
        this.dispatches = data;
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
    const payload: DispatchRecord = {
      dispatchDate: val.dispatchDate!,
      shift: val.shift as "morning" | "evening",
      vehicleNo: val.vehicleNo!,
      tankerNo: val.tankerNo!,
      quantity: Number(val.quantity),
      fat: Number(val.fat),
      snf: Number(val.snf)
    };

    this.dispatchService.createDispatch(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Milk dispatch recorded successfully!";
        this.form.reset({
          dispatchDate: new Date().toISOString().slice(0, 10),
          shift: "morning",
          vehicleNo: "",
          tankerNo: "",
          quantity: null,
          fat: null,
          snf: null
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to record dispatch.";
      }
    });
  }

  remove(id?: number): void {
    if (!id) return;
    if (confirm("Are you sure you want to delete this dispatch record?")) {
      this.dispatchService.deleteDispatch(id).subscribe({
        next: () => {
          this.msg = "Dispatch record deleted!";
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
