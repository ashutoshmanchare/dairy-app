import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { ReceiveRecord, ReceiveService } from "../../core/services/receive.service";

@Component({
  selector: "app-receive",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./receive.component.html"
})
export class ReceiveComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly receiveService = inject(ReceiveService);

  receipts: ReceiveRecord[] = [];
  loading = true;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    receivedDate: ["", [Validators.required]],
    shift: ["morning", [Validators.required]],
    source: ["", [Validators.required]],
    quantity: [null as number | null, [Validators.required, Validators.min(0.1)]],
    fat: [null as number | null, [Validators.required, Validators.min(1.0), Validators.max(15.0)]],
    snf: [null as number | null, [Validators.required, Validators.min(4.0), Validators.max(12.0)]]
  });

  get totalReceivedLiters(): number {
    return this.receipts.reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ receivedDate: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.receiveService.getReceives().subscribe({
      next: (data) => {
        this.receipts = data;
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
    const payload: ReceiveRecord = {
      receivedDate: val.receivedDate!,
      shift: val.shift as "morning" | "evening",
      source: val.source!,
      quantity: Number(val.quantity),
      fat: Number(val.fat),
      snf: Number(val.snf)
    };

    this.receiveService.createReceive(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Milk receipt logged successfully!";
        this.form.reset({
          receivedDate: new Date().toISOString().slice(0, 10),
          shift: "morning",
          source: "",
          quantity: null,
          fat: null,
          snf: null
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to record milk receipt.";
      }
    });
  }

  remove(id?: number): void {
    if (!id) return;
    if (confirm("Are you sure you want to delete this received record?")) {
      this.receiveService.deleteReceive(id).subscribe({
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
