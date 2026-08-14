import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  query, orderBy, serverTimestamp, getDocs, where
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

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
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "payments");

  getPayments(): Observable<PaymentRecord[]> {
    return collectionData(query(this.col, orderBy("paymentDate", "desc")), { idField: "id" }) as Observable<PaymentRecord[]>;
  }

  calculateSummary(payload: { customerId: string | number; startDate: string; endDate: string }): Observable<PaymentSummary> {
    return from(getDocs(collection(this.firestore, "milk_entries"))).pipe(
      map(snapshot => {
        let totalQuantity = 0;
        let grossAmount = 0;
        snapshot.docs.forEach((d: any) => {
          const data = d.data();
          const matchesCustomer = String(data["customerId"]) === String(payload.customerId);
          const entryDate = data["entryDate"] || data["date"] || "";
          if (matchesCustomer && entryDate >= payload.startDate && entryDate <= payload.endDate) {
            totalQuantity += Number(data["quantity"] || 0);
            grossAmount += Number(data["totalAmount"] || 0);
          }
        });
        return { totalQuantity, grossAmount, outstandingAdvance: 0, advanceRecovery: 0, totalDeductions: 0, netAmount: grossAmount };
      })
    );
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
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, notes: payload.notes || "" } as PaymentRecord))
    );
  }
}
