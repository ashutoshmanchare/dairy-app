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

export interface RateChart {
  id: string | number;
  name: string;
  animalType: "cow" | "buffalo";
  calculationType: "fat_only" | "fat_snf" | "fat_clr" | "fixed";
  fixedRate?: number;
  baseFat?: number;
  baseSnf?: number;
  baseRate?: number;
  isActive: number;
  effectiveFrom: string;
}

@Injectable({ providedIn: "root" })
export class RateChartService {
  private readonly http = inject(HttpClient);
  private readonly COL = "rate_charts";

  getRateCharts(): Observable<RateChart[]> {
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      map(res => {
        const docs: RateChart[] = (res.documents || []).map(fromDoc);
        return docs.sort((a, b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
      }),
      catchError(() => of([]))
    );
  }

  createRateChart(payload: any): Observable<any> {
    const body = { fields: toFields({ ...payload, isActive: 0 }) };
    return this.http.post<any>(`${BASE}/${this.COL}?key=${API_KEY}`, body).pipe(
      map(doc => fromDoc(doc))
    );
  }

  setActiveRateChart(id: string | number): Observable<{ message: string }> {
    // First get all rate charts, then deactivate all and activate the selected one
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      switchMap(res => {
        const docs: any[] = (res.documents || []).map(fromDoc);
        const deactivations = docs.map(d => {
          const fields = toFields({ isActive: 0 });
          const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
          const url = `${BASE}/${this.COL}/${String(d.id)}?key=${API_KEY}&${fieldNames}`;
          return this.http.patch<any>(url, { fields });
        });
        return deactivations.length > 0 ? forkJoin(deactivations) : of([]);
      }),
      switchMap(() => {
        const fields = toFields({ isActive: 1 });
        const fieldNames = Object.keys(fields).map(k => `updateMask.fieldPaths=${k}`).join("&");
        const url = `${BASE}/${this.COL}/${String(id)}?key=${API_KEY}&${fieldNames}`;
        return this.http.patch<any>(url, { fields });
      }),
      map(() => ({ message: "Activated" }))
    );
  }

  calculateRate(animalType: "cow" | "buffalo", fat: number, snf: number): Observable<{ rate: number }> {
    return this.http.get<any>(`${BASE}/${this.COL}?key=${API_KEY}`).pipe(
      map(res => {
        const docs: RateChart[] = (res.documents || []).map(fromDoc);
        const chart = docs.find(d => d.animalType === animalType && d.isActive === 1);
        if (!chart) return { rate: 0 };
        let rate = 0;
        if (chart.calculationType === "fixed") {
          rate = chart.fixedRate || 0;
        } else if (chart.calculationType === "fat_only") {
          rate = fat * (chart.baseRate || 0);
        } else if (chart.calculationType === "fat_snf") {
          const fatDiff = fat - (chart.baseFat || 0);
          const snfDiff = snf - (chart.baseSnf || 0);
          rate = (chart.baseRate || 0) + fatDiff * 0.5 + snfDiff * 0.3;
        }
        return { rate: Math.round(rate * 100) / 100 };
      }),
      catchError(() => of({ rate: 0 }))
    );
  }
}
