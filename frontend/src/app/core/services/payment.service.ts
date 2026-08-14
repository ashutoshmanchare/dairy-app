import { Injectable, inject } from "@angular/core";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { FirestoreRestService } from "./firestore-rest.service";

export interface PaymentRecord {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  farmerCode?: string;
  paymentDate: string;
  amount: number;
  status: "paid" | "pending";
  notes: string;
}

export interface PaymentSummary {
  totalQuantity: number;
  grossAmount: number;
  outstandingAdvance: number;
  advanceRecovery: number;
  totalDeductions: number;
  netAmount: number;
}

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly db = inject(FirestoreRestService);

  getPayments(): Observable<PaymentRecord[]> {
    return this.db.loadPayments().pipe(
      map(list => [...list].sort((a: any, b: any) => (b.paymentDate || "").localeCompare(a.paymentDate || "")) as PaymentRecord[])
    );
  }

  calculateSummary(payload: { customerId: string | number; startDate: string; endDate: string }): Observable<PaymentSummary> {
    const entries = this.db.milkSnapshot;
    let totalQuantity = 0, grossAmount = 0;
    entries.forEach((d: any) => {
      const matchesCustomer = String(d["customerId"]) === String(payload.customerId);
      const entryDate = (d["entryDate"] || d["date"] || "").toString().slice(0, 10);
      if (matchesCustomer && entryDate >= payload.startDate && entryDate <= payload.endDate) {
        totalQuantity += Number(d["quantity"] || 0);
        grossAmount += Number(d["totalAmount"] || 0);
      }
    });
    return of({ totalQuantity, grossAmount, outstandingAdvance: 0, advanceRecovery: 0, totalDeductions: 0, netAmount: grossAmount });
  }

  addPayment(payload: {
    customerId: string | number;
    paymentDate: string;
    amount: number;
    status: "paid" | "pending";
    notes?: string;
    startDate?: string;
    endDate?: string;
    advanceRecovery?: number;
  }): Observable<PaymentRecord> {
    return this.db.addPayment({ ...payload, notes: payload.notes || "" }).pipe(
      map(ref => ({ ...ref, notes: payload.notes || "" } as PaymentRecord)),
      catchError(() => of({ id: "", customerId: payload.customerId, paymentDate: payload.paymentDate, amount: payload.amount, status: payload.status, notes: "" } as PaymentRecord))
    );
  }
}
