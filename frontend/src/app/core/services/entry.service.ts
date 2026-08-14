import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { map, catchError } from "rxjs/operators";
import { Entry } from "../models/entry.model";

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
    if (k === "id" || k === "_id") continue;
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

@Injectable({ providedIn: "root" })
export class EntryService {
  private readonly http = inject(HttpClient);
  private readonly COL = "entries";

  getEntries(): Observable<Entry[]> {
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      map(res => {
        const docs: any[] = (res.documents || []).map(fromDoc);
        return docs.sort((a, b) => String(b.date || b.entryDate || "").localeCompare(String(a.date || a.entryDate || ""))) as Entry[];
      }),
      catchError(() => of([]))
    );
  }

  createEntry(payload: Partial<Entry>): Observable<Entry> {
    const body = { fields: toFields(payload) };
    return this.http.post<any>(`${BASE}/${this.COL}?key=${API_KEY}`, body).pipe(
      map(doc => fromDoc(doc) as Entry)
    );
  }

  updateEntry(id: string, payload: Partial<Entry>): Observable<Entry> {
    const fields = toFields(payload);
    const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
    const url = `${BASE}/${this.COL}/${id}?key=${API_KEY}&${fieldNames}`;
    return this.http.patch<any>(url, { fields }).pipe(
      map(doc => fromDoc(doc) as Entry)
    );
  }

  deleteEntry(id: string): Observable<{ message: string }> {
    return this.http.delete<void>(`${BASE}/${this.COL}/${id}?key=${API_KEY}`).pipe(
      map(() => ({ message: "Deleted" }))
    );
  }
}
