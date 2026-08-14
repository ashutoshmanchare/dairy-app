import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { Customer } from "../models/customer.model";
import { MilkCollection } from "../models/milk.model";
import { FirestoreRestService } from "./firestore-rest.service";

/**
 * DataCacheService — Central cache to avoid repeated Firestore round-trips.
 * All components share the same in-memory snapshot, refreshed only when data changes.
 * Delegates all HTTP operations to FirestoreRestService (no @angular/fire dependency).
 */
@Injectable({ providedIn: "root" })
export class DataCacheService {
  private readonly svc = inject(FirestoreRestService);

  // ─── Public Observables (proxy through FirestoreRestService) ──────────────
  readonly customers$ = this.svc.customers$;
  readonly milkEntries$ = this.svc.milkEntries$;
  readonly payments$ = this.svc.payments$;

  // ─── Customers ─────────────────────────────────────────────────────────────
  loadCustomers(force = false): Observable<Customer[]> {
    return this.svc.loadCustomers(force) as Observable<Customer[]>;
  }

  addCustomer(payload: Omit<Customer, "id">): Observable<Customer> {
    return this.svc.addCustomer(payload) as Observable<Customer>;
  }

  updateCustomer(id: string | number, payload: Omit<Customer, "id">): Observable<Customer> {
    return this.svc.updateCustomer(String(id), payload) as Observable<Customer>;
  }

  deleteCustomer(id: string | number): Observable<{ message: string }> {
    return this.svc.deleteCustomer(String(id)).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }

  // ─── Milk Entries ──────────────────────────────────────────────────────────
  loadMilkEntries(force = false): Observable<MilkCollection[]> {
    return this.svc.loadMilkEntries(force) as Observable<MilkCollection[]>;
  }

  addMilkEntry(payload: any): Observable<MilkCollection> {
    return this.svc.addMilkEntry(payload) as Observable<MilkCollection>;
  }

  deleteMilkEntry(id: string | number): Observable<{ message: string }> {
    return this.svc.deleteMilkEntry(String(id)).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }

  // ─── Payments ──────────────────────────────────────────────────────────────
  loadPayments(force = false): Observable<any[]> {
    return this.svc.loadPayments(force);
  }

  addPayment(payload: any): Observable<any> {
    return this.svc.addPayment(payload);
  }

  // ─── Utility: Force refresh all data ──────────────────────────────────────
  refreshAll(): void {
    this.svc.preloadAll();
  }

  // ─── Snapshot getters (synchronous, from cache) ───────────────────────────
  get customersSnapshot(): Customer[] { return this.svc.customersSnapshot as Customer[]; }
  get milkSnapshot(): MilkCollection[] { return this.svc.milkSnapshot as MilkCollection[]; }
  get paymentsSnapshot(): any[] { return this.svc.paymentsSnapshot; }
}
