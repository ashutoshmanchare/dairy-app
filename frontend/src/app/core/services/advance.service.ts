import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  query, orderBy, serverTimestamp, getDocs, where
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

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
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "advances");

  getAdvances(): Observable<AdvanceRecord[]> {
    return collectionData(query(this.col, orderBy("advanceDate", "desc")), { idField: "id" }) as Observable<AdvanceRecord[]>;
  }

  addAdvance(payload: Omit<AdvanceRecord, "id" | "recoveredAmount">): Observable<AdvanceRecord> {
    return from(addDoc(this.col, { ...payload, recoveredAmount: 0, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, recoveredAmount: 0 } as AdvanceRecord))
    );
  }

  getCustomerAdvanceSummary(customerId: string | number): Observable<CustomerAdvanceSummary> {
    return from(getDocs(query(this.col, where("customerId", "==", String(customerId))))).pipe(
      map(snapshot => {
        let totalAdvance = 0;
        let totalRecovered = 0;
        snapshot.docs.forEach((d: any) => {
          const data = d.data();
          totalAdvance += Number(data["amount"] || 0);
          totalRecovered += Number(data["recoveredAmount"] || 0);
        });
        return { totalAdvance, totalRecovered, outstandingAdvance: totalAdvance - totalRecovered };
      })
    );
  }
}
