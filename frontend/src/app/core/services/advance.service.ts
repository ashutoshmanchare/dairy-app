import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_advances_v1";

export interface AdvanceRecord {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  farmerCode?: string;
  amount: number;
  advanceDate: string;
  notes: string;
  recoveredAmount: number;
}

export interface CustomerAdvanceSummary {
  totalAdvance: number;
  totalRecovered: number;
  outstandingAdvance: number;
}

@Injectable({ providedIn: "root" })
export class AdvanceService {
  private readonly _advances$ = new BehaviorSubject<AdvanceRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._advances$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._advances$.next([]);
    }
  }

  private saveLocal(data: AdvanceRecord[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to write advances:", e);
    }
  }

  getAdvances(): Observable<AdvanceRecord[]> {
    return of(this._advances$.value);
  }

  addAdvance(payload: Omit<AdvanceRecord, "id" | "recoveredAmount">): Observable<AdvanceRecord> {
    const newDoc: AdvanceRecord = {
      ...payload,
      id: `adv_${Date.now()}`,
      recoveredAmount: 0
    };
    const updated = [newDoc, ...this._advances$.value];
    this._advances$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  getCustomerAdvanceSummary(customerId: string | number): Observable<CustomerAdvanceSummary> {
    const docs = this._advances$.value;
    const filtered = docs.filter(d => String(d.customerId) === String(customerId));
    let totalAdvance = 0;
    let totalRecovered = 0;
    filtered.forEach(d => {
      totalAdvance += Number(d.amount || 0);
      totalRecovered += Number(d.recoveredAmount || 0);
    });
    return of({ totalAdvance, totalRecovered, outstandingAdvance: totalAdvance - totalRecovered });
  }
}
