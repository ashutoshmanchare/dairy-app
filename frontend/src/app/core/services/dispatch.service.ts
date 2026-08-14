import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

export interface DispatchRecord {
  id?: string | number;
  dispatchDate: string;
  shift: "morning" | "evening";
  vehicleNo?: string;
  tankerNo?: string;
  quantity: number;
  fat: number;
  snf: number;
  status?: "pending" | "dispatched" | "received";
}

@Injectable({ providedIn: "root" })
export class DispatchService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "milk_dispatches");

  getDispatches(): Observable<DispatchRecord[]> {
    return collectionData(query(this.col, orderBy("dispatchDate", "desc")), { idField: "id" }) as Observable<DispatchRecord[]>;
  }

  createDispatch(payload: DispatchRecord): Observable<DispatchRecord> {
    return from(addDoc(this.col, { ...payload, status: payload.status || "pending", createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload }))
    );
  }

  deleteDispatch(id: string | number): Observable<any> {
    return from(deleteDoc(doc(this.firestore, "milk_dispatches", String(id))));
  }
}
