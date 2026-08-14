import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

export interface ExpenseRecord {
  id?: string | number;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

@Injectable({ providedIn: "root" })
export class ExpenseService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "dairy_expenses");

  getExpenses(): Observable<ExpenseRecord[]> {
    return collectionData(query(this.col, orderBy("expenseDate", "desc")), { idField: "id" }) as Observable<ExpenseRecord[]>;
  }

  createExpense(payload: ExpenseRecord): Observable<ExpenseRecord> {
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload }))
    );
  }

  deleteExpense(id: string | number): Observable<any> {
    return from(deleteDoc(doc(this.firestore, "dairy_expenses", String(id))));
  }
}
