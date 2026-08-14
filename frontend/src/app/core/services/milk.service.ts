import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { MilkCollection } from "../models/milk.model";
import { FirestoreRestService } from "./firestore-rest.service";

@Injectable({ providedIn: "root" })
export class MilkService {
  private readonly db = inject(FirestoreRestService);

  getCollections(): Observable<MilkCollection[]> {
    return this.db.loadMilkEntries() as Observable<MilkCollection[]>;
  }

  addCollection(payload: Omit<MilkCollection, "id" | "customerName" | "totalAmount">): Observable<MilkCollection> {
    return this.db.addMilkEntry(payload) as Observable<MilkCollection>;
  }

  deleteCollection(id: string | number): Observable<{ message: string }> {
    return new Observable(observer => {
      this.db.deleteMilkEntry(String(id)).subscribe({
        next: () => { observer.next({ message: "Deleted" }); observer.complete(); },
        error: err => observer.error(err)
      });
    });
  }
}
