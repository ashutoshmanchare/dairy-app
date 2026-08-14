import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc,
  query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

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
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "deductions");

  getDeductions(): Observable<DeductionRecord[]> {
    return collectionData(query(this.col, orderBy("deductionDate", "desc")), { idField: "id" }) as Observable<DeductionRecord[]>;
  }

  addDeduction(payload: Omit<DeductionRecord, "id" | "isRecovered">): Observable<DeductionRecord> {
    return from(addDoc(this.col, { ...payload, isRecovered: 0, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, isRecovered: 0 } as DeductionRecord))
    );
  }
}
