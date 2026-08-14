import { Injectable, inject } from "@angular/core";
import { Observable, combineLatest, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { FirestoreRestService } from "./firestore-rest.service";

interface Summary {
  totalMilk?: number;
  todayMilk: number;
  todayAmount: number;
  pendingPayment: number;
  totalFarmers: number;
  cowMilk?: number;
  buffaloMilk?: number;
  morningMilk?: number;
  eveningMilk?: number;
  totalCustomers?: number;
  totalPayments?: number;
  paidAmount?: number;
  pendingAmount?: number;
}

@Injectable({ providedIn: "root" })
export class ReportService {
  private readonly db = inject(FirestoreRestService);

  getSummary(): Observable<Summary> {
    const today = new Date().toISOString().slice(0, 10);
    return combineLatest([
      this.db.loadCustomers(),
      this.db.loadMilkEntries(),
      this.db.loadPayments()
    ]).pipe(
      map(([customers, milkEntries, payments]) => {
        let todayMilk = 0, todayAmount = 0, totalMilk = 0, paidAmount = 0;
        let cowMilk = 0, buffaloMilk = 0, morningMilk = 0, eveningMilk = 0;
        milkEntries.forEach((d: any) => {
          const qty = Number(d["quantity"] || 0);
          totalMilk += qty;
          const entryDate = (d["entryDate"] || d["date"] || "").toString().slice(0, 10);
          if (entryDate === today) {
            todayMilk += qty;
            todayAmount += Number(d["totalAmount"] || 0);
            if (d["animalType"] === "cow") cowMilk += qty; else buffaloMilk += qty;
            if (d["shift"] === "morning") morningMilk += qty; else eveningMilk += qty;
          }
        });
        payments.forEach((d: any) => { paidAmount += Number(d["amount"] || 0); });
        return {
          totalMilk, todayMilk, todayAmount,
          pendingPayment: 0,
          totalFarmers: customers.length,
          totalCustomers: customers.length,
          totalPayments: payments.length,
          paidAmount, pendingAmount: 0,
          cowMilk, buffaloMilk, morningMilk, eveningMilk
        };
      }),
      catchError(() => of({
        totalMilk: 0, todayMilk: 0, todayAmount: 0,
        pendingPayment: 0, totalFarmers: 0, totalCustomers: 0,
        totalPayments: 0, paidAmount: 0, pendingAmount: 0,
        cowMilk: 0, buffaloMilk: 0, morningMilk: 0, eveningMilk: 0
      }))
    );
  }

  getDailyReport(): Observable<Array<{ date: string; totalQuantity: number; totalAmount: number }>> {
    return this.db.loadMilkEntries().pipe(
      map(entries => {
        const dateMap = new Map<string, { totalQuantity: number; totalAmount: number }>();
        entries.forEach((d: any) => {
          const date = (d["entryDate"] || d["date"] || "").toString().slice(0, 10);
          if (!date) return;
          const existing = dateMap.get(date) || { totalQuantity: 0, totalAmount: 0 };
          dateMap.set(date, {
            totalQuantity: existing.totalQuantity + Number(d["quantity"] || 0),
            totalAmount: existing.totalAmount + Number(d["totalAmount"] || 0)
          });
        });
        return Array.from(dateMap.entries())
          .map(([date, v]) => ({ date, ...v }))
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 30);
      }),
      catchError(() => of([]))
    );
  }

  getMonthlyReport(): Observable<Array<{ month: string; totalQuantity: number; totalAmount: number }>> {
    return this.db.loadMilkEntries().pipe(
      map(entries => {
        const monthMap = new Map<string, { totalQuantity: number; totalAmount: number }>();
        entries.forEach((d: any) => {
          const month = (d["entryDate"] || "").toString().slice(0, 7);
          if (!month) return;
          const existing = monthMap.get(month) || { totalQuantity: 0, totalAmount: 0 };
          monthMap.set(month, {
            totalQuantity: existing.totalQuantity + Number(d["quantity"] || 0),
            totalAmount: existing.totalAmount + Number(d["totalAmount"] || 0)
          });
        });
        return Array.from(monthMap.entries())
          .map(([month, v]) => ({ month, ...v }))
          .sort((a, b) => b.month.localeCompare(a.month));
      }),
      catchError(() => of([]))
    );
  }

  getCustomerReport(): Observable<Array<{
    customerId: string | number; customerName: string;
    totalQuantity: number; billAmount: number; paidAmount: number; pendingAmount: number;
  }>> {
    return combineLatest([
      this.db.loadCustomers(),
      this.db.loadMilkEntries(),
      this.db.loadPayments()
    ]).pipe(
      map(([customers, milkEntries, payments]) => {
        const milkMap = new Map<string, { qty: number; amt: number }>();
        milkEntries.forEach((d: any) => {
          const cid = String(d["customerId"] || "");
          const ex = milkMap.get(cid) || { qty: 0, amt: 0 };
          milkMap.set(cid, { qty: ex.qty + Number(d["quantity"] || 0), amt: ex.amt + Number(d["totalAmount"] || 0) });
        });
        const payMap = new Map<string, number>();
        payments.forEach((d: any) => {
          const cid = String(d["customerId"] || "");
          payMap.set(cid, (payMap.get(cid) || 0) + Number(d["amount"] || 0));
        });
        return customers.map(c => {
          const id = String(c.id);
          const milk = milkMap.get(id) || { qty: 0, amt: 0 };
          const paid = payMap.get(id) || 0;
          return { customerId: id, customerName: c.name || "", totalQuantity: milk.qty, billAmount: milk.amt, paidAmount: paid, pendingAmount: milk.amt - paid };
        });
      }),
      catchError(() => of([]))
    );
  }
}
