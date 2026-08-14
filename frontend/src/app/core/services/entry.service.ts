import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { Entry } from "../models/entry.model";

@Injectable({ providedIn: "root" })
export class EntryService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "entries");

  getEntries(): Observable<Entry[]> {
    return collectionData(query(this.col, orderBy("date", "desc")), { idField: "id" }) as Observable<Entry[]>;
  }

  createEntry(payload: Partial<Entry>): Observable<Entry> {
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload } as Entry))
    );
  }

  updateEntry(id: string, payload: Partial<Entry>): Observable<Entry> {
    return from(updateDoc(doc(this.firestore, "entries", id), { ...payload })).pipe(
      map(() => ({ id, ...payload } as Entry))
    );
  }

  deleteEntry(id: string): Observable<{ message: string }> {
    return from(deleteDoc(doc(this.firestore, "entries", id))).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }
}
