import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Customer } from "../models/customer.model";
import { FirestoreRestService } from "./firestore-rest.service";

@Injectable({ providedIn: "root" })
export class CustomerService {
  private readonly db = inject(FirestoreRestService);

  getCustomers(): Observable<Customer[]> {
    return this.db.loadCustomers() as Observable<Customer[]>;
  }

  addCustomer(payload: Omit<Customer, "id">): Observable<Customer> {
    return this.db.addCustomer(payload) as Observable<Customer>;
  }

  updateCustomer(id: string | number, payload: Omit<Customer, "id">): Observable<Customer> {
    return this.db.updateCustomer(String(id), payload) as Observable<Customer>;
  }

  deleteCustomer(id: string | number): Observable<{ message: string }> {
    return new Observable(observer => {
      this.db.deleteCustomer(String(id)).subscribe({
        next: () => { observer.next({ message: "Deleted" }); observer.complete(); },
        error: err => observer.error(err)
      });
    });
  }
}
