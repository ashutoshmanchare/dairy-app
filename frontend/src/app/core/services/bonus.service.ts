import { Injectable, inject } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";
import { FirestoreRestService } from "./firestore-rest.service";

const KEY = "dairy_app_bonuses_v1";

export interface BonusRecord {
  id?: string | number;
  customerId: string | number;
  customerName: string;
  farmerCode: string;
  year: number;
  totalMilk: number;
  bonusRate: number;
  bonusAmount: number;
  status: "pending" | "paid";
}

@Injectable({ providedIn: "root" })
export class BonusService {
  private readonly db = inject(FirestoreRestService);
  private readonly _bonuses$ = new BehaviorSubject<BonusRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._bonuses$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._bonuses$.next([]);
    }
  }

  private saveLocal(data: BonusRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getBonuses(year: number): Observable<BonusRecord[]> {
    const filtered = this._bonuses$.value.filter(d => Number(d.year) === year);
    return of(filtered);
  }

  calculateBonus(year: number, bonusRate: number): Observable<{ message: string }> {
    const customers = this.db.customersSnapshot;
    const milkEntries = this.db.milkSnapshot;

    // Calculate total milk per customer for given year
    const milkMap = new Map<string, number>();
    milkEntries.forEach((m: any) => {
      const entryYear = new Date(m.entryDate || Date.now()).getFullYear();
      if (entryYear === year) {
        const cid = String(m.customerId);
        milkMap.set(cid, (milkMap.get(cid) || 0) + Number(m.quantity || 0));
      }
    });

    const newBonuses: BonusRecord[] = customers.map(c => {
      const cid = String(c.id);
      const totalMilk = milkMap.get(cid) || 0;
      const bonusAmount = totalMilk * bonusRate;
      return {
        id: `bonus_${year}_${cid}`,
        customerId: cid,
        customerName: c.name || "",
        farmerCode: c.farmerCode || "",
        year,
        totalMilk,
        bonusRate,
        bonusAmount: Math.round(bonusAmount * 100) / 100,
        status: "pending"
      };
    });

    this._bonuses$.next(newBonuses);
    this.saveLocal(newBonuses);

    return of({ message: "बोनस गणना पूर्ण झाली!" });
  }

  markBonusPaid(id: string | number, status: "paid" | "pending"): Observable<any> {
    const updated = this._bonuses$.value.map(b => String(b.id) === String(id) ? { ...b, status } : b);
    this._bonuses$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Updated" });
  }
}
