import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

export interface ReceiveRecord {
  id?: string | number;
  receivedDate: string;
  shift: "morning" | "evening";
  source: string;
  quantity: number;
  fat: number;
  snf: number;
}

@Injectable({ providedIn: "root" })
export class ReceiveService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "milk_received");

  getReceives(): Observable<ReceiveRecord[]> {
    return collectionData(query(this.col, orderBy("receivedDate", "desc")), { idField: "id" }) as Observable<ReceiveRecord[]>;
  }

  createReceive(payload: ReceiveRecord): Observable<ReceiveRecord> {
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload }))
    );
  }

  deleteReceive(id: string | number): Observable<any> {
    return from(deleteDoc(doc(this.firestore, "milk_received", String(id))));
  }
}
