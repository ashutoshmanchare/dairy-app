import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { MilkCollection } from "../models/milk.model";

@Injectable({ providedIn: "root" })
export class MilkService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "milk_entries");

  getCollections(): Observable<MilkCollection[]> {
    return (collectionData(this.col, { idField: "id" }) as Observable<MilkCollection[]>).pipe(
      map(rows => (rows || []).sort((a, b) => new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime()))
    );
  }

  addCollection(payload: Omit<MilkCollection, "id" | "customerName" | "totalAmount">): Observable<MilkCollection> {
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload } as unknown as MilkCollection))
    );
  }

  deleteCollection(id: string | number): Observable<{ message: string }> {
    return from(deleteDoc(doc(this.firestore, "milk_entries", String(id)))).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }
}
