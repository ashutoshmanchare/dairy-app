import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  updateDoc, query, orderBy, serverTimestamp, where, getDocs
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map, switchMap } from "rxjs/operators";

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
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "bonuses");

  getBonuses(year: number): Observable<BonusRecord[]> {
    return collectionData(query(this.col, where("year", "==", year), orderBy("customerName", "asc")), { idField: "id" }) as Observable<BonusRecord[]>;
  }

  calculateBonus(year: number, bonusRate: number): Observable<{ message: string }> {
    // Get all customers and their milk totals for the year, create bonus records
    return from(getDocs(collection(this.firestore, "customers"))).pipe(
      switchMap(custSnap => {
        const creates = custSnap.docs.map((d: any) => {
          const cust = d.data() as any;
          return addDoc(this.col, {
            customerId: d.id, customerName: cust["name"] || "", farmerCode: cust["farmerCode"] || "",
            year, totalMilk: 0, bonusRate, bonusAmount: 0, status: "pending", createdAt: serverTimestamp()
          });
        });
        return from(Promise.all(creates));
      }),
      map(() => ({ message: "Bonus calculated" }))
    );
  }

  markBonusPaid(id: string | number, status: "paid" | "pending"): Observable<any> {
    return from(updateDoc(doc(this.firestore, "bonuses", String(id)), { status }));
  }
}
