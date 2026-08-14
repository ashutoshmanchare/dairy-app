import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, BehaviorSubject, of } from "rxjs";

const PROJECT_ID = "dairy-app-7a68c";
const API_KEY = "AIzaSyCEXw6-59VzlT14VPEz9q0AS2ZujpkaRDM";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const KEY_RATE_CHARTS = "dairy_app_rate_charts_v1";

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

const DEFAULT_RATE_CHARTS: RateChart[] = [
  {
    id: "rc_cow_default",
    name: "गाय दूध दर पत्रक (Standard)",
    animalType: "cow",
    calculationType: "fat_snf",
    baseFat: 3.5,
    baseSnf: 8.5,
    baseRate: 35.00,
    isActive: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10)
  },
  {
    id: "rc_buffalo_default",
    name: "म्हैस दूध दर पत्रक (Standard)",
    animalType: "buffalo",
    calculationType: "fat_snf",
    baseFat: 6.0,
    baseSnf: 9.0,
    baseRate: 55.00,
    isActive: 1,
    effectiveFrom: new Date().toISOString().slice(0, 10)
  }
];

@Injectable({ providedIn: "root" })
export class RateChartService {
  private readonly http = inject(HttpClient);
  private readonly _charts$ = new BehaviorSubject<RateChart[]>([]);

  constructor() {
    this.initLocalData();
  }

  private initLocalData(): void {
    try {
      const raw = localStorage.getItem(KEY_RATE_CHARTS);
      const charts = raw ? JSON.parse(raw) : DEFAULT_RATE_CHARTS;
      this._charts$.next(charts);
      if (!raw) localStorage.setItem(KEY_RATE_CHARTS, JSON.stringify(DEFAULT_RATE_CHARTS));
    } catch {
      this._charts$.next(DEFAULT_RATE_CHARTS);
    }
  }

  private saveLocal(charts: RateChart[]): void {
    try {
      localStorage.setItem(KEY_RATE_CHARTS, JSON.stringify(charts));
    } catch (e) {
      console.warn("Failed to write rate charts to localStorage:", e);
    }
  }

  getRateCharts(): Observable<RateChart[]> {
    return of(this._charts$.value);
  }

  createRateChart(payload: any): Observable<any> {
    const id = `rc_${Date.now()}`;
    const newChart: RateChart = {
      id,
      name: payload.name || "नवीन दर पत्रक",
      animalType: payload.animalType || "cow",
      calculationType: payload.calculationType || "fat_snf",
      fixedRate: Number(payload.fixedRate) || 0,
      baseFat: Number(payload.baseFat) || 3.5,
      baseSnf: Number(payload.baseSnf) || 8.5,
      baseRate: Number(payload.baseRate) || 35.00,
      isActive: 0,
      effectiveFrom: payload.effectiveFrom || new Date().toISOString().slice(0, 10)
    };

    const updated = [newChart, ...this._charts$.value];
    this._charts$.next(updated);
    this.saveLocal(updated);

    return of(newChart);
  }

  setActiveRateChart(id: string | number): Observable<{ message: string }> {
    const current = this._charts$.value;
    const targetChart = current.find(c => String(c.id) === String(id));
    if (!targetChart) return of({ message: "Activated" });

    // Deactivate all charts of the same animalType, activate target
    const updated = current.map(c => {
      if (c.animalType === targetChart.animalType) {
        return { ...c, isActive: String(c.id) === String(id) ? 1 : 0 };
      }
      return c;
    });

    this._charts$.next(updated);
    this.saveLocal(updated);

    return of({ message: "दर पत्रक सक्रिय झाले!" });
  }

  calculateRate(animalType: "cow" | "buffalo", fat: number, snf: number): Observable<{ rate: number }> {
    const docs = this._charts$.value;
    const chart = docs.find(d => d.animalType === animalType && Number(d.isActive) === 1);
    if (!chart) {
      // Fallback rate calculation if no active chart found
      const fallbackBase = animalType === "cow" ? 35 : 55;
      const baseF = animalType === "cow" ? 3.5 : 6.0;
      const baseS = animalType === "cow" ? 8.5 : 9.0;
      const fatDiff = fat - baseF;
      const snfDiff = snf - baseS;
      const calculated = fallbackBase + (fatDiff * 0.5) + (snfDiff * 0.3);
      return of({ rate: Math.max(0, Math.round(calculated * 100) / 100) });
    }

    let rate = 0;
    if (chart.calculationType === "fixed") {
      rate = chart.fixedRate || 0;
    } else if (chart.calculationType === "fat_only") {
      rate = fat * (chart.baseRate || 0);
    } else if (chart.calculationType === "fat_snf") {
      const fatDiff = fat - (chart.baseFat || 3.5);
      const snfDiff = snf - (chart.baseSnf || 8.5);
      rate = (chart.baseRate || 35) + (fatDiff * 0.5) + (snfDiff * 0.3);
    }

    return of({ rate: Math.max(0, Math.round(rate * 100) / 100) });
  }
}
