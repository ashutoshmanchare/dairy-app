import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_milk_sales_v1";

export interface MilkSaleRecord {
  id?: string | number;
  buyerName: string;
  saleDate: string;
  shift: "morning" | "evening";
  animalType: "cow" | "buffalo";
  quantity: number;
  rate: number;
  totalAmount?: number;
}

@Injectable({ providedIn: "root" })
export class MilkSaleService {
  private readonly _sales$ = new BehaviorSubject<MilkSaleRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._sales$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._sales$.next([]);
    }
  }

  private saveLocal(data: MilkSaleRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getMilkSales(): Observable<MilkSaleRecord[]> {
    return of(this._sales$.value);
  }

  createMilkSale(payload: MilkSaleRecord): Observable<MilkSaleRecord> {
    const totalAmount = Number(payload.quantity || 0) * Number(payload.rate || 0);
    const newDoc: MilkSaleRecord = {
      ...payload,
      id: `msale_${Date.now()}`,
      totalAmount
    };
    const updated = [newDoc, ...this._sales$.value].sort((a, b) => String(b.saleDate || "").localeCompare(String(a.saleDate || "")));
    this._sales$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  deleteMilkSale(id: string | number): Observable<any> {
    const updated = this._sales$.value.filter(s => String(s.id) !== String(id));
    this._sales$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
