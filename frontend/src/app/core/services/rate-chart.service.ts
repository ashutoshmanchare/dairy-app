import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface RateChart {
  id: number;
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
  private readonly api = inject(ApiService);

  getRateCharts(): Observable<RateChart[]> {
    return this.http.get<RateChart[]>(`${this.api.baseUrl}/rate-charts`);
  }

  createRateChart(payload: any): Observable<any> {
    return this.http.post<any>(`${this.api.baseUrl}/rate-charts`, payload);
  }

  setActiveRateChart(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api.baseUrl}/rate-charts/${id}/activate`, {});
  }

  calculateRate(animalType: "cow" | "buffalo", fat: number, snf: number): Observable<{ rate: number }> {
    return this.http.post<{ rate: number }>(`${this.api.baseUrl}/rate-charts/calculate`, { animalType, fat, snf });
  }
}
