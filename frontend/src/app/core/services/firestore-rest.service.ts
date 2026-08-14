import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, from, forkJoin, BehaviorSubject, of } from "rxjs";
import { map, tap, catchError, switchMap } from "rxjs/operators";

const PROJECT_ID = "dairy-app-7a68c";
const API_KEY = "AIzaSyCEXw6-59VzlT14VPEz9q0AS2ZujpkaRDM";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/** Convert Firestore REST API document to plain JS object */
function fromFirestore(doc: any): any {
  if (!doc || !doc.fields) return {};
  const result: any = {};
  for (const [key, val] of Object.entries<any>(doc.fields)) {
    result[key] = parseValue(val);
  }
  // Extract doc ID from name: "projects/.../documents/collection/DOCID"
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
    if (key === "id") continue; // skip id field
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

/**
 * FirestoreRestService — uses simple HTTP GET/POST/PATCH/DELETE requests.
 * NO WebSocket, NO long-polling channels, NO retry loops.
 * Data is cached in memory after first fetch.
 */
@Injectable({ providedIn: "root" })
export class FirestoreRestService {
  private readonly http = inject(HttpClient);

  // ─── In-memory cache ──────────────────────────────────────────────────────
  private readonly _customers$ = new BehaviorSubject<any[]>([]);
  private readonly _milkEntries$ = new BehaviorSubject<any[]>([]);
  private readonly _payments$ = new BehaviorSubject<any[]>([]);

  readonly customers$ = this._customers$.asObservable();
  readonly milkEntries$ = this._milkEntries$.asObservable();
  readonly payments$ = this._payments$.asObservable();

  private customersLoaded = false;
  private milkLoaded = false;
  private paymentsLoaded = false;

  private url(col: string, docId?: string): string {
    const base = `${BASE_URL}/${col}`;
    const withKey = `${base}${docId ? "/" + docId : ""}?key=${API_KEY}`;
    return withKey;
  }

  // ─── Generic REST methods ─────────────────────────────────────────────────
  private getAll(col: string): Observable<any[]> {
    return this.http.get<any>(`${BASE_URL}/${col}?key=${API_KEY}`).pipe(
      map(res => (res.documents || []).map(fromFirestore)),
      catchError(() => of([]))
    );
  }

  private create(col: string, data: any): Observable<any> {
    const body = toFirestore(data);
    return this.http.post<any>(`${BASE_URL}/${col}?key=${API_KEY}`, body).pipe(
      map(doc => fromFirestore(doc)),
      catchError(err => { console.error("Firestore create error:", err); throw err; })
    );
  }

  private update(col: string, docId: string, data: any): Observable<any> {
    const fields = toFirestore(data).fields;
    const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    const url = `${BASE_URL}/${col}/${docId}?key=${API_KEY}&${fieldNames}`;
    return this.http.patch<any>(url, { fields }).pipe(
      map(doc => fromFirestore(doc)),
      catchError(err => { console.error("Firestore update error:", err); throw err; })
    );
  }

  private remove(col: string, docId: string): Observable<void> {
    return this.http.delete<void>(`${BASE_URL}/${col}/${docId}?key=${API_KEY}`).pipe(
      catchError(err => { console.error("Firestore delete error:", err); throw err; })
    );
  }

  // ─── Customers ─────────────────────────────────────────────────────────────
  loadCustomers(force = false): Observable<any[]> {
    if (this.customersLoaded && !force) return this.customers$;
    return this.getAll("customers").pipe(
      tap(list => {
        list.sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
        this._customers$.next(list);
        this.customersLoaded = true;
      }),
      switchMap(() => this.customers$)
    );
  }

  addCustomer(data: any): Observable<any> {
    return this.create("customers", data).pipe(
      tap(newDoc => {
        const cur = this._customers$.value;
        this._customers$.next([...cur, newDoc].sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999)));
      })
    );
  }

  updateCustomer(docId: string, data: any): Observable<any> {
    return this.update("customers", docId, data).pipe(
      tap(() => {
        const cur = this._customers$.value.map(c => String(c.id) === String(docId) ? { ...c, ...data, id: docId } : c);
        this._customers$.next(cur);
      })
    );
  }

  deleteCustomer(docId: string): Observable<void> {
    return this.remove("customers", docId).pipe(
      tap(() => {
        this._customers$.next(this._customers$.value.filter(c => String(c.id) !== String(docId)));
      })
    );
  }

  // ─── Milk Entries ──────────────────────────────────────────────────────────
  loadMilkEntries(force = false): Observable<any[]> {
    if (this.milkLoaded && !force) return this.milkEntries$;
    return this.getAll("milk_entries").pipe(
      tap(list => {
        list.sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
        this._milkEntries$.next(list);
        this.milkLoaded = true;
      }),
      switchMap(() => this.milkEntries$)
    );
  }

  addMilkEntry(data: any): Observable<any> {
    return this.create("milk_entries", data).pipe(
      tap(newDoc => {
        this._milkEntries$.next([newDoc, ...this._milkEntries$.value]);
      })
    );
  }

  deleteMilkEntry(docId: string): Observable<void> {
    return this.remove("milk_entries", docId).pipe(
      tap(() => {
        this._milkEntries$.next(this._milkEntries$.value.filter(m => String(m.id) !== String(docId)));
      })
    );
  }

  // ─── Payments ──────────────────────────────────────────────────────────────
  loadPayments(force = false): Observable<any[]> {
    if (this.paymentsLoaded && !force) return this.payments$;
    return this.getAll("payments").pipe(
      tap(list => {
        this._payments$.next(list);
        this.paymentsLoaded = true;
      }),
      switchMap(() => this.payments$)
    );
  }

  addPayment(data: any): Observable<any> {
    return this.create("payments", data).pipe(
      tap(newDoc => {
        this._payments$.next([...this._payments$.value, newDoc]);
      })
    );
  }

  // ─── Preload all at once ───────────────────────────────────────────────────
  preloadAll(): void {
    forkJoin([
      this.getAll("customers"),
      this.getAll("milk_entries"),
      this.getAll("payments")
    ]).subscribe(([customers, milk, payments]) => {
      customers.sort((a, b) => Number(a.farmerCode || 9999) - Number(b.farmerCode || 9999));
      milk.sort((a, b) => (b.entryDate || "").localeCompare(a.entryDate || ""));
      this._customers$.next(customers);
      this._milkEntries$.next(milk);
      this._payments$.next(payments);
      this.customersLoaded = true;
      this.milkLoaded = true;
      this.paymentsLoaded = true;
    });
  }

  // ─── Snapshot getters (synchronous, from cache) ───────────────────────────
  get customersSnapshot(): any[] { return this._customers$.value; }
  get milkSnapshot(): any[] { return this._milkEntries$.value; }
  get paymentsSnapshot(): any[] { return this._payments$.value; }
}
