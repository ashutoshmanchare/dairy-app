import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from, BehaviorSubject, of } from "rxjs";
import { map, tap, shareReplay, switchMap } from "rxjs/operators";
import { Customer } from "../models/customer.model";
import { MilkCollection } from "../models/milk.model";

/**
 * DataCacheService — Central cache to avoid repeated Firestore round-trips.
 * All components share the same in-memory snapshot, refreshed only when data changes.
 */
@Injectable({ providedIn: "root" })
export class DataCacheService {
  private readonly firestore = inject(Firestore);

  // ─── Internal BehaviorSubjects (source of truth) ──────────────────────────
  private readonly _customers$ = new BehaviorSubject<Customer[]>([]);
  private readonly _milkEntries$ = new BehaviorSubject<MilkCollection[]>([]);
  private readonly _payments$ = new BehaviorSubject<any[]>([]);

  // ─── Public Observables ───────────────────────────────────────────────────
  readonly customers$ = this._customers$.asObservable();
  readonly milkEntries$ = this._milkEntries$.asObservable();
  readonly payments$ = this._payments$.asObservable();

  // ─── Load flags — only load once unless explicitly refreshed ─────────────
  private customersLoaded = false;
  private milkLoaded = false;
  private paymentsLoaded = false;

  // ─── Customers ─────────────────────────────────────────────────────────────
  loadCustomers(force = false): Observable<Customer[]> {
    if (this.customersLoaded && !force) {
      return this.customers$;
    }
    return from(getDocs(collection(this.firestore, "customers"))).pipe(
      tap(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Customer));
        list.sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
        this._customers$.next(list);
        this.customersLoaded = true;
      }),
      switchMap(() => this.customers$)
    );
  }

  addCustomer(payload: Omit<Customer, "id">): Observable<Customer> {
    return from(addDoc(collection(this.firestore, "customers"), { ...payload, createdAt: serverTimestamp() })).pipe(
      tap(ref => {
        const cur = this._customers$.value;
        const newCust: Customer = { id: ref.id, ...payload };
        this._customers$.next([...cur, newCust].sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999)));
      }),
      map(ref => ({ id: ref.id, ...payload } as Customer))
    );
  }

  updateCustomer(id: string | number, payload: Omit<Customer, "id">): Observable<Customer> {
    return from(updateDoc(doc(this.firestore, "customers", String(id)), { ...payload })).pipe(
      tap(() => {
        const cur = this._customers$.value.map(c => String(c.id) === String(id) ? { id, ...payload } : c);
        this._customers$.next(cur);
      }),
      map(() => ({ id, ...payload } as Customer))
    );
  }

  deleteCustomer(id: string | number): Observable<{ message: string }> {
    return from(deleteDoc(doc(this.firestore, "customers", String(id)))).pipe(
      tap(() => {
        this._customers$.next(this._customers$.value.filter(c => String(c.id) !== String(id)));
      }),
      map(() => ({ message: "Deleted" }))
    );
  }

  // ─── Milk Entries ──────────────────────────────────────────────────────────
  loadMilkEntries(force = false): Observable<MilkCollection[]> {
    if (this.milkLoaded && !force) {
      return this.milkEntries$;
    }
    return from(getDocs(collection(this.firestore, "milk_entries"))).pipe(
      tap(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as MilkCollection));
        list.sort((a, b) => new Date(b.entryDate || 0).getTime() - new Date(a.entryDate || 0).getTime());
        this._milkEntries$.next(list);
        this.milkLoaded = true;
      }),
      switchMap(() => this.milkEntries$)
    );
  }

  addMilkEntry(payload: any): Observable<MilkCollection> {
    return from(addDoc(collection(this.firestore, "milk_entries"), { ...payload, createdAt: serverTimestamp() })).pipe(
      tap(ref => {
        const cur = this._milkEntries$.value;
        const newEntry: MilkCollection = { id: ref.id, ...payload };
        const updated = [newEntry, ...cur];
        this._milkEntries$.next(updated);
      }),
      map(ref => ({ id: ref.id, ...payload } as unknown as MilkCollection))
    );
  }

  deleteMilkEntry(id: string | number): Observable<{ message: string }> {
    return from(deleteDoc(doc(this.firestore, "milk_entries", String(id)))).pipe(
      tap(() => {
        this._milkEntries$.next(this._milkEntries$.value.filter(m => String(m.id) !== String(id)));
      }),
      map(() => ({ message: "Deleted" }))
    );
  }

  // ─── Payments ──────────────────────────────────────────────────────────────
  loadPayments(force = false): Observable<any[]> {
    if (this.paymentsLoaded && !force) {
      return this.payments$;
    }
    return from(getDocs(collection(this.firestore, "payments"))).pipe(
      tap(snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        this._payments$.next(list);
        this.paymentsLoaded = true;
      }),
      switchMap(() => this.payments$)
    );
  }

  addPayment(payload: any): Observable<any> {
    return from(addDoc(collection(this.firestore, "payments"), { ...payload, createdAt: serverTimestamp() })).pipe(
      tap(ref => {
        const newPay = { id: ref.id, ...payload };
        this._payments$.next([...this._payments$.value, newPay]);
      }),
      map(ref => ({ id: ref.id, ...payload }))
    );
  }

  // ─── Utility: Force refresh all data ──────────────────────────────────────
  refreshAll(): void {
    this.customersLoaded = false;
    this.milkLoaded = false;
    this.paymentsLoaded = false;
    this.loadCustomers(true).subscribe();
    this.loadMilkEntries(true).subscribe();
    this.loadPayments(true).subscribe();
  }

  // ─── Snapshot getters (synchronous, from cache) ───────────────────────────
  get customersSnapshot(): Customer[] { return this._customers$.value; }
  get milkSnapshot(): MilkCollection[] { return this._milkEntries$.value; }
  get paymentsSnapshot(): any[] { return this._payments$.value; }
}
