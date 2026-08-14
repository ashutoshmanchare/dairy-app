import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";

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

export interface ExpenseRecord {
  id?: string | number;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

@Injectable({ providedIn: "root" })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly COL = "dairy_expenses";

  getExpenses(): Observable<ExpenseRecord[]> {
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      map(res => {
        const docs: ExpenseRecord[] = (res.documents || []).map(fromDoc);
        return docs.sort((a, b) => String(b.expenseDate).localeCompare(String(a.expenseDate)));
      }),
      catchError(() => of([]))
    );
  }

  createExpense(payload: ExpenseRecord): Observable<ExpenseRecord> {
    const body = { fields: toFields(payload) };
    return this.http.post<any>(`${BASE}/${this.COL}?key=${API_KEY}`, body).pipe(
      map(doc => fromDoc(doc) as ExpenseRecord)
    );
  }

  deleteExpense(id: string | number): Observable<any> {
    return this.http.delete<void>(`${BASE}/${this.COL}/${String(id)}?key=${API_KEY}`);
  }
}
