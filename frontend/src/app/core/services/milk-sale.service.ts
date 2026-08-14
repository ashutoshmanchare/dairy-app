import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, updateDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

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
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "milk_sales");

  getMilkSales(): Observable<MilkSaleRecord[]> {
    return collectionData(query(this.col, orderBy("saleDate", "desc")), { idField: "id" }) as Observable<MilkSaleRecord[]>;
  }

  createMilkSale(payload: MilkSaleRecord): Observable<MilkSaleRecord> {
    const totalAmount = payload.quantity * payload.rate;
    return from(addDoc(this.col, { ...payload, totalAmount, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, totalAmount }))
    );
  }

  deleteMilkSale(id: string | number): Observable<any> {
    return from(deleteDoc(doc(this.firestore, "milk_sales", String(id))));
  }
}
