import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, forkJoin } from "rxjs";
import { map, catchError, switchMap } from "rxjs/operators";

const PROJECT_ID = "dairy-app-7a68c";
const API_KEY = "AIzaSyCEXw6-59VzlT14VPEz9q0AS2ZujpkaRDM";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function fromDoc(doc: any): any {
  if (!doc?.fields) return {};
  const r: any = {};
  for (const [k, v] of Object.entries<any>(doc.fields)) r[k] = parseVal(v);
  if (doc.name) r["id"] = doc.name.split("/").pop();
  return r;
}
function parseVal(v: any): any {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(parseVal);
  if (v.mapValue) return fromDoc(v.mapValue);
  return null;
}
function toFields(data: any): any {
  const f: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "id") continue;
    f[k] = toVal(v);
  }
  return f;
}
function toVal(v: any): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toVal) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

export interface BonusRecord {
  id?: string | number;
  customerId: string | number;
  customerName: string;
  farmerCode: string;
  year: number;
  totalMilk: number;
  bonusRate: number;
  bonusAmount: number;
  status: "pending" | "paid";
}

@Injectable({ providedIn: "root" })
export class BonusService {
  private readonly http = inject(HttpClient);
  private readonly COL = "bonuses";

  getBonuses(year: number): Observable<BonusRecord[]> {
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      map(res => {
        const docs: BonusRecord[] = (res.documents || []).map(fromDoc);
        return docs
          .filter(d => Number(d.year) === year)
          .sort((a, b) => String(a.customerName).localeCompare(String(b.customerName)));
      }),
      catchError(() => of([]))
    );
  }

  calculateBonus(year: number, bonusRate: number): Observable<{ message: string }> {
    return this.http.get<any>(`${BASE}/customers?key=${API_KEY}`).pipe(
      switchMap(res => {
        const customers: any[] = (res.documents || []).map(fromDoc);
        const creates = customers.map(cust =>
          this.http.post<any>(`${BASE}/${this.COL}?key=${API_KEY}`, {
            fields: toFields({
              customerId: cust.id, customerName: cust.name || "", farmerCode: cust.farmerCode || "",
              year, totalMilk: 0, bonusRate, bonusAmount: 0, status: "pending"
            })
          })
        );
        return creates.length > 0 ? forkJoin(creates) : of([]);
      }),
      map(() => ({ message: "Bonus calculated" }))
    );
  }

  markBonusPaid(id: string | number, status: "paid" | "pending"): Observable<any> {
    const fields = toFields({ status });
    const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    const url = `${BASE}/${this.COL}/${String(id)}?key=${API_KEY}&${fieldNames}`;
    return this.http.patch<any>(url, { fields }).pipe(
      map(doc => fromDoc(doc))
    );
  }
}
