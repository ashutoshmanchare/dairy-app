import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { ExpenseRecord, ExpenseService } from "../../core/services/expense.service";

@Component({
  selector: "app-expense",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./expense.component.html"
})
export class ExpenseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly expenseService = inject(ExpenseService);

  expenses: ExpenseRecord[] = [];
  loading = true;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    title: ["", [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    expenseDate: ["", [Validators.required]],
    notes: [""]
  });

  get totalExpenseAmount(): number {
    return this.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ expenseDate: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.expenseService.getExpenses().subscribe({
      next: (data) => {
        this.expenses = data;
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
    const payload: ExpenseRecord = {
      title: val.title!,
      amount: Number(val.amount),
      expenseDate: val.expenseDate!,
      notes: val.notes || ""
    };

    this.expenseService.createExpense(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Expense logged successfully!";
        this.form.reset({
          title: "",
          amount: null,
          expenseDate: new Date().toISOString().slice(0, 10),
          notes: ""
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to log expense.";
      }
    });
  }

  remove(id?: number): void {
    if (!id) return;
    if (confirm("Are you sure you want to delete this expense entry?")) {
      this.expenseService.deleteExpense(id).subscribe({
        next: () => {
          this.msg = "Expense deleted successfully!";
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
