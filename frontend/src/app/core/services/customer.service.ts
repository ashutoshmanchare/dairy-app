import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";
import { Customer } from "../models/customer.model";

@Injectable({ providedIn: "root" })
export class CustomerService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "customers");

  getCustomers(): Observable<Customer[]> {
    return collectionData(query(this.col, orderBy("farmerCode", "asc")), { idField: "id" }) as Observable<Customer[]>;
  }

  addCustomer(payload: Omit<Customer, "id">): Observable<Customer> {
    return from(addDoc(this.col, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload } as Customer))
    );
  }

  updateCustomer(id: string | number, payload: Omit<Customer, "id">): Observable<Customer> {
    return from(updateDoc(doc(this.firestore, "customers", String(id)), { ...payload })).pipe(
      map(() => ({ id, ...payload } as Customer))
    );
  }

  deleteCustomer(id: string | number): Observable<{ message: string }> {
    return from(deleteDoc(doc(this.firestore, "customers", String(id)))).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }
}
