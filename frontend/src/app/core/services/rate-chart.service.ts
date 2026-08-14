import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  updateDoc, query, orderBy, serverTimestamp, where, getDocs, writeBatch
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map, switchMap } from "rxjs/operators";

export interface RateChart {
  id: string | number;
  name: string;
  animalType: "cow" | "buffalo";
  calculationType: "fat_only" | "fat_snf" | "fat_clr" | "fixed";
  fixedRate?: number;
  baseFat?: number;
  baseSnf?: number;
  baseRate?: number;
  isActive: number;
  effectiveFrom: string;
}

@Injectable({ providedIn: "root" })
export class RateChartService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "rate_charts");

  getRateCharts(): Observable<RateChart[]> {
    return collectionData(query(this.col, orderBy("effectiveFrom", "desc")), { idField: "id" }) as Observable<RateChart[]>;
  }

  createRateChart(payload: any): Observable<any> {
    return from(addDoc(this.col, { ...payload, isActive: 0, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, isActive: 0 }))
    );
  }

  setActiveRateChart(id: string | number): Observable<{ message: string }> {
    // Deactivate all, then activate selected
    return from(getDocs(this.col)).pipe(
      switchMap(snapshot => {
        const batch = writeBatch(this.firestore);
        snapshot.docs.forEach((d: any) => batch.update(d.ref, { isActive: 0 }));
        batch.update(doc(this.firestore, "rate_charts", String(id)), { isActive: 1 });
        return from(batch.commit());
      }),
      map(() => ({ message: "Activated" }))
    );
  }

  calculateRate(animalType: "cow" | "buffalo", fat: number, snf: number): Observable<{ rate: number }> {
    return from(getDocs(query(this.col, where("animalType", "==", animalType), where("isActive", "==", 1)))).pipe(
      map(snapshot => {
        if (snapshot.empty) return { rate: 0 };
        const chart = snapshot.docs[0].data() as RateChart;
        let rate = 0;
        if (chart.calculationType === "fixed") {
          rate = chart.fixedRate || 0;
        } else if (chart.calculationType === "fat_only") {
          rate = fat * (chart.baseRate || 0);
        } else if (chart.calculationType === "fat_snf") {
          const fatDiff = fat - (chart.baseFat || 0);
          const snfDiff = snf - (chart.baseSnf || 0);
          rate = (chart.baseRate || 0) + fatDiff * 0.5 + snfDiff * 0.3;
        }
        return { rate: Math.round(rate * 100) / 100 };
      })
    );
  }
}
