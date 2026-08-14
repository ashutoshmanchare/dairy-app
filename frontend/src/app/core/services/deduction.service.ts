import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_deductions_v1";

export interface DeductionRecord {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  farmerCode?: string;
  type: "feed" | "loan" | "medicine" | "other";
  amount: number;
  deductionDate: string;
  notes: string;
  isRecovered: number;
}

@Injectable({ providedIn: "root" })
export class DeductionService {
  private readonly _deductions$ = new BehaviorSubject<DeductionRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._deductions$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._deductions$.next([]);
    }
  }

  private saveLocal(data: DeductionRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getDeductions(): Observable<DeductionRecord[]> {
    return of(this._deductions$.value);
  }

  addDeduction(payload: Omit<DeductionRecord, "id" | "isRecovered">): Observable<DeductionRecord> {
    const newDoc: DeductionRecord = {
      ...payload,
      id: `ded_${Date.now()}`,
      isRecovered: 0
    };
    const updated = [newDoc, ...this._deductions$.value].sort((a, b) => String(b.deductionDate || "").localeCompare(String(a.deductionDate || "")));
    this._deductions$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }
}
