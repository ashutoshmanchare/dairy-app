import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject, of, forkJoin } from "rxjs";
import { map, catchError } from "rxjs/operators";

const PROJECT_ID = "dairy-app-7a68c";
const API_KEY = "AIzaSyCEXw6-59VzlT14VPEz9q0AS2ZujpkaRDM";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const KEY_CUSTOMERS = "dairy_app_customers_permanent";
const KEY_MILK = "dairy_app_milk_permanent";
const KEY_PAYMENTS = "dairy_app_payments_permanent";

/** Convert Firestore REST API document to plain JS object */
function fromFirestore(doc: any): any {
  if (!doc || !doc.fields) return {};
  const result: any = {};
  for (const [key, val] of Object.entries<any>(doc.fields)) {
    result[key] = parseValue(val);
  }
  if (doc.name) {
    const parts = doc.name.split("/");
    result["id"] = parts[parts.length - 1];
  }
  return result;
}

function parseValue(val: any): any {
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) return (val.arrayValue.values || []).map(parseValue);
  if (val.mapValue !== undefined) return fromFirestore(val.mapValue);
  return null;
}

/** Convert plain JS object to Firestore REST fields */
function toFirestore(data: any): { fields: any } {
  const fields: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (key === "id") continue;
    fields[key] = toValue(val);
  }
  return { fields };
}

function toValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toValue) } };
  if (typeof val === "object") return { mapValue: toFirestore(val) };
  return { stringValue: String(val) };
}

// Initial seed customers if local storage is completely empty
const SEED_CUSTOMERS = [
  { id: "cust_101", farmerCode: "1", name: "अशोक शेलार", mobile: "9822012345", village: "तिखोल", defaultAnimalType: "cow", status: "active" },
  { id: "cust_102", farmerCode: "2", name: "बाळासाहेब वाघमारे", mobile: "9822054321", village: "तिखोल", defaultAnimalType: "buffalo", status: "active" },
  { id: "cust_103", farmerCode: "3", name: "ज्ञानेश्वर काळे", mobile: "9822099999", village: "तिखोल", defaultAnimalType: "cow", status: "active" }
];

/**
 * Robust Local-First Database Service.
 * - LocalStorage is the PRIMARY Database. Data NEVER disappears or resets on refresh!
 * - Instant 0ms latency for all UI reads & writes.
 * - Background Cloud Sync safely merges if cloud database is available.
 */
@Injectable({ providedIn: "root" })
export class FirestoreRestService {
  private readonly http = inject(HttpClient);

  private readonly _customers$ = new BehaviorSubject<any[]>([]);
  private readonly _milkEntries$ = new BehaviorSubject<any[]>([]);
  private readonly _payments$ = new BehaviorSubject<any[]>([]);

  readonly customers$ = this._customers$.asObservable();
  readonly milkEntries$ = this._milkEntries$.asObservable();
  readonly payments$ = this._payments$.asObservable();

  constructor() {
    this.initLocalData();
    // Try background sync after initialization
    setTimeout(() => this.preloadAll(), 500);
  }

  private initLocalData(): void {
    try {
      // Migrate from any legacy keys if present
      const legacyCustomerKeys = ["dairy_app_customers_permanent", "dairy_app_customers_v3", "dairy_local_customers_v2", "dairy_local_customers", "dairy_customers"];
      let loadedCustomers: any[] | null = null;
      for (const k of legacyCustomerKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedCustomers = parsed;
              break;
            }
          } catch {}
        }
      }
      const customers = loadedCustomers || SEED_CUSTOMERS;
      this._customers$.next(customers);
      localStorage.setItem("dairy_app_customers_permanent", JSON.stringify(customers));

      // Milk entries
      const legacyMilkKeys = ["dairy_app_milk_permanent", "dairy_app_milk_v3", "dairy_local_milk_v2", "dairy_local_milk", "dairy_milk"];
      let loadedMilk: any[] | null = null;
      for (const k of legacyMilkKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedMilk = parsed;
              break;
            }
          } catch {}
        }
      }
      const milk = loadedMilk || [];
      this._milkEntries$.next(milk);
      localStorage.setItem("dairy_app_milk_permanent", JSON.stringify(milk));

      // Payments
      const legacyPaymentKeys = ["dairy_app_payments_permanent", "dairy_app_payments_v3", "dairy_local_payments_v2", "dairy_local_payments", "dairy_payments"];
      let loadedPayments: any[] | null = null;
      for (const k of legacyPaymentKeys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedPayments = parsed;
              break;
            }
          } catch {}
        }
      }
      const payments = loadedPayments || [];
      this._payments$.next(payments);
      localStorage.setItem("dairy_app_payments_permanent", JSON.stringify(payments));
    } catch (e) {
      console.warn("Error initializing local database:", e);
      this._customers$.next(SEED_CUSTOMERS);
    }
  }

  private saveLocal(key: string, data: any[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  }

  // ─── Generic REST API HTTP Helpers ─────────────────────────────────────────
  private fetchRemoteCollection(col: string): Observable<any[]> {
    return this.http.get<any>(`${BASE_URL}/${col}?key=${API_KEY}`).pipe(
      map(res => (res && res.documents ? res.documents.map(fromFirestore) : [])),
      catchError(() => of([]))
    );
  }

  private postRemoteDoc(col: string, data: any): Observable<any> {
    const body = toFirestore(data);
    const docId = data.id || `doc_${Date.now()}`;
    return this.http.post<any>(`${BASE_URL}/${col}?documentId=${docId}&key=${API_KEY}`, body).pipe(
      map(doc => fromFirestore(doc)),
      catchError(err => {
        console.warn(`Cloud sync post notice (${col}):`, err?.status || err);
        return of(data);
      })
    );
  }

  private patchRemoteDoc(col: string, docId: string, data: any): Observable<any> {
    const fields = toFirestore(data).fields;
    const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    const url = `${BASE_URL}/${col}/${docId}?key=${API_KEY}&${fieldNames}`;
    return this.http.patch<any>(url, { fields }).pipe(
      map(doc => fromFirestore(doc)),
      catchError(() => of(data))
    );
  }

  private deleteRemoteDoc(col: string, docId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${col}/${docId}?key=${API_KEY}`).pipe(
      catchError(() => of(undefined))
    );
  }

  // ─── CUSTOMERS (PERSISTENT & INSTANT) ────────────────────────────────────
  loadCustomers(force = false): Observable<any[]> {
    if (force) {
      this.fetchRemoteCollection("customers").subscribe(remote => {
        if (remote && remote.length > 0) {
          const localMap = new Map<string, any>(this._customers$.value.map(c => [String(c.id), c]));
          remote.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
          const merged = Array.from(localMap.values()).sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
          this._customers$.next(merged);
          this.saveLocal(KEY_CUSTOMERS, merged);
        }
      });
    }
    return of(this._customers$.value);
  }

  addCustomer(data: any): Observable<any> {
    const id = `cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDoc = { ...data, id };
    
    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const current = this._customers$.value;
    const updated = [...current, newDoc].sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
    this._customers$.next(updated);
    this.saveLocal(KEY_CUSTOMERS, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.postRemoteDoc("customers", newDoc).subscribe();

    return of(newDoc);
  }

  updateCustomer(docId: string, data: any): Observable<any> {
    const updatedDoc = { ...data, id: docId };

    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const updated = this._customers$.value.map(c => String(c.id) === String(docId) ? { ...c, ...updatedDoc } : c);
    this._customers$.next(updated);
    this.saveLocal(KEY_CUSTOMERS, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.patchRemoteDoc("customers", docId, data).subscribe();

    return of(updatedDoc);
  }

  deleteCustomer(docId: string): Observable<void> {
    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const updated = this._customers$.value.filter(c => String(c.id) !== String(docId));
    this._customers$.next(updated);
    this.saveLocal(KEY_CUSTOMERS, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.deleteRemoteDoc("customers", docId).subscribe();

    return of(undefined);
  }

  // ─── MILK ENTRIES (PERSISTENT & INSTANT) ─────────────────────────────────
  loadMilkEntries(force = false): Observable<any[]> {
    if (force) {
      this.fetchRemoteCollection("milk_entries").subscribe(remote => {
        if (remote && remote.length > 0) {
          const localMap = new Map<string, any>(this._milkEntries$.value.map(m => [String(m.id), m]));
          remote.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
          const merged = Array.from(localMap.values()).sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
          this._milkEntries$.next(merged);
          this.saveLocal(KEY_MILK, merged);
        }
      });
    }
    return of(this._milkEntries$.value);
  }

  addMilkEntry(data: any): Observable<any> {
    const id = `milk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDoc = { ...data, id };

    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const updated = [newDoc, ...this._milkEntries$.value];
    this._milkEntries$.next(updated);
    this.saveLocal(KEY_MILK, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.postRemoteDoc("milk_entries", newDoc).subscribe();

    return of(newDoc);
  }

  deleteMilkEntry(docId: string): Observable<void> {
    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const updated = this._milkEntries$.value.filter(m => String(m.id) !== String(docId));
    this._milkEntries$.next(updated);
    this.saveLocal(KEY_MILK, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.deleteRemoteDoc("milk_entries", docId).subscribe();

    return of(undefined);
  }

  // ─── PAYMENTS (PERSISTENT & INSTANT) ─────────────────────────────────────
  loadPayments(force = false): Observable<any[]> {
    if (force) {
      this.fetchRemoteCollection("payments").subscribe(remote => {
        if (remote && remote.length > 0) {
          const localMap = new Map<string, any>(this._payments$.value.map(p => [String(p.id), p]));
          remote.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
          const merged = Array.from(localMap.values());
          this._payments$.next(merged);
          this.saveLocal(KEY_PAYMENTS, merged);
        }
      });
    }
    return of(this._payments$.value);
  }

  addPayment(data: any): Observable<any> {
    const id = `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newDoc = { ...data, id };

    // 1. INSTANT LOCAL UPDATE & PERSISTENCE
    const updated = [...this._payments$.value, newDoc];
    this._payments$.next(updated);
    this.saveLocal(KEY_PAYMENTS, updated);

    // 2. BACKGROUND CLOUD SYNC
    this.postRemoteDoc("payments", newDoc).subscribe();

    return of(newDoc);
  }

  // ─── BACKGROUND SYNC (SAFE MERGE ONLY) ──────────────────────────────────
  preloadAll(): void {
    forkJoin([
      this.fetchRemoteCollection("customers"),
      this.fetchRemoteCollection("milk_entries"),
      this.fetchRemoteCollection("payments")
    ]).subscribe(([customers, milk, payments]) => {
      // ONLY merge if remote actually returned items (never overwrite with empty array!)
      if (customers && customers.length > 0) {
        const localMap = new Map<string, any>(this._customers$.value.map(c => [String(c.id), c]));
        customers.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
        const mergedC = Array.from(localMap.values()).sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
        this._customers$.next(mergedC);
        this.saveLocal(KEY_CUSTOMERS, mergedC);
      }

      if (milk && milk.length > 0) {
        const localMap = new Map<string, any>(this._milkEntries$.value.map(m => [String(m.id), m]));
        milk.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
        const mergedM = Array.from(localMap.values()).sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
        this._milkEntries$.next(mergedM);
        this.saveLocal(KEY_MILK, mergedM);
      }

      if (payments && payments.length > 0) {
        const localMap = new Map<string, any>(this._payments$.value.map(p => [String(p.id), p]));
        payments.forEach(r => localMap.set(String(r.id), { ...localMap.get(String(r.id)), ...r }));
        const mergedP = Array.from(localMap.values());
        this._payments$.next(mergedP);
        this.saveLocal(KEY_PAYMENTS, mergedP);
      }
    });
  }

  // Synchronous Snapshots
  get customersSnapshot(): any[] { return this._customers$.value; }
  get milkSnapshot(): any[] { return this._milkEntries$.value; }
  get paymentsSnapshot(): any[] { return this._payments$.value; }
}
