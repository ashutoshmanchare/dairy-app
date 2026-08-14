import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, getDocs, query, orderBy
} from "@angular/fire/firestore";
import { Observable, from, of } from "rxjs";
import { map, catchError } from "rxjs/operators";

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
  monthlyMilk?: number;
  totalCustomers?: number;
  totalPayments?: number;
  paidAmount?: number;
  pendingAmount?: number;
}

@Injectable({ providedIn: "root" })
export class ReportService {
  private readonly firestore = inject(Firestore);

  getSummary(): Observable<Summary> {
    const today = new Date().toISOString().slice(0, 10);
    return from(Promise.all([
      getDocs(collection(this.firestore, "milk_entries")),
      getDocs(collection(this.firestore, "customers")),
      getDocs(collection(this.firestore, "payments"))
    ])).pipe(
      map(([milkSnap, custSnap, paySnap]) => {
        let todayMilk = 0, todayAmount = 0, totalMilk = 0, paidAmount = 0, totalPayments = 0;
        milkSnap.docs.forEach((d: any) => {
          const data = d.data();
          totalMilk += Number(data["quantity"] || 0);
          const entryDate = data["entryDate"] || data["date"] || "";
          if (entryDate === today) {
            todayMilk += Number(data["quantity"] || 0);
            todayAmount += Number(data["totalAmount"] || 0);
          }
        });
        paySnap.docs.forEach((d: any) => {
          const data = d.data();
          paidAmount += Number(data["amount"] || 0);
          totalPayments++;
        });
        return {
          totalMilk, todayMilk, todayAmount,
          pendingPayment: 0,
          totalFarmers: custSnap.size,
          totalCustomers: custSnap.size,
          totalPayments, paidAmount, pendingAmount: 0
        };
      }),
      catchError(() => of({
        totalMilk: 0, todayMilk: 0, todayAmount: 0,
        pendingPayment: 0, totalFarmers: 0, totalCustomers: 0,
        totalPayments: 0, paidAmount: 0, pendingAmount: 0
      }))
    );
  }

  getDailyReport(): Observable<Array<{ date: string; totalQuantity: number; totalAmount: number }>> {
    return from(getDocs(collection(this.firestore, "milk_entries"))).pipe(
      map(snapshot => {
        const map2 = new Map<string, { totalQuantity: number; totalAmount: number }>();
        snapshot.docs.forEach((d: any) => {
          const data = d.data();
          const date = (data["entryDate"] || data["date"] || "") as string;
          const existing = map2.get(date) || { totalQuantity: 0, totalAmount: 0 };
          map2.set(date, {
            totalQuantity: existing.totalQuantity + Number(data["quantity"] || 0),
            totalAmount: existing.totalAmount + Number(data["totalAmount"] || 0)
          });
        });
        return Array.from(map2.entries()).map(([date, v]) => ({ date, ...v })).slice(0, 30);
      })
    );
  }

  getMonthlyReport(): Observable<Array<{ month: string; totalQuantity: number; totalAmount: number }>> {
    return from(getDocs(collection(this.firestore, "milk_entries"))).pipe(
      map(snapshot => {
        const map2 = new Map<string, { totalQuantity: number; totalAmount: number }>();
        snapshot.docs.forEach((d: any) => {
          const data = d.data();
          const dateStr = (data["entryDate"] || data["date"] || "") as string;
          const month = dateStr.slice(0, 7) || "";
          const existing = map2.get(month) || { totalQuantity: 0, totalAmount: 0 };
          map2.set(month, {
            totalQuantity: existing.totalQuantity + Number(data["quantity"] || 0),
            totalAmount: existing.totalAmount + Number(data["totalAmount"] || 0)
          });
        });
        return Array.from(map2.entries()).map(([month, v]) => ({ month, ...v })).sort((a, b) => b.month.localeCompare(a.month));
      })
    );
  }

  getCustomerReport(): Observable<Array<{ customerId: string | number; customerName: string; totalQuantity: number; billAmount: number; paidAmount: number; pendingAmount: number }>> {
    return from(Promise.all([
      getDocs(collection(this.firestore, "milk_entries")),
      getDocs(collection(this.firestore, "customers")),
      getDocs(collection(this.firestore, "payments"))
    ])).pipe(
      map(([milkSnap, custSnap, paySnap]) => {
        const custMap = new Map<string, string>();
        custSnap.docs.forEach((d: any) => custMap.set(d.id, (d.data() as any)["name"] || ""));
        const milkMap = new Map<string, { qty: number; amt: number }>();
        milkSnap.docs.forEach((d: any) => {
          const data = d.data();
          const cid = String(data["customerId"] || "");
          const existing = milkMap.get(cid) || { qty: 0, amt: 0 };
          milkMap.set(cid, { qty: existing.qty + Number(data["quantity"] || 0), amt: existing.amt + Number(data["totalAmount"] || 0) });
        });
        const payMap = new Map<string, number>();
        paySnap.docs.forEach((d: any) => {
          const data = d.data();
          const cid = String(data["customerId"] || "");
          payMap.set(cid, (payMap.get(cid) || 0) + Number(data["amount"] || 0));
        });
        return Array.from(custMap.entries()).map(([id, name]) => {
          const milk = milkMap.get(id) || { qty: 0, amt: 0 };
          const paid = payMap.get(id) || 0;
          return { customerId: id, customerName: name, totalQuantity: milk.qty, billAmount: milk.amt, paidAmount: paid, pendingAmount: milk.amt - paid };
        });
      })
    );
  }
}
