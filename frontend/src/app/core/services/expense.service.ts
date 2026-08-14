import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_expenses_v1";

export interface ExpenseRecord {
  id?: string | number;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

@Injectable({ providedIn: "root" })
export class ExpenseService {
  private readonly _expenses$ = new BehaviorSubject<ExpenseRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._expenses$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._expenses$.next([]);
    }
  }

  private saveLocal(data: ExpenseRecord[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to write expenses:", e);
    }
  }

  getExpenses(): Observable<ExpenseRecord[]> {
    return of(this._expenses$.value);
  }

  createExpense(payload: ExpenseRecord): Observable<ExpenseRecord> {
    const newDoc: ExpenseRecord = {
      ...payload,
      id: `exp_${Date.now()}`
    };
    const updated = [newDoc, ...this._expenses$.value].sort((a, b) => String(b.expenseDate || "").localeCompare(String(a.expenseDate || "")));
    this._expenses$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  deleteExpense(id: string | number): Observable<any> {
    const updated = this._expenses$.value.filter(e => String(e.id) !== String(id));
    this._expenses$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
