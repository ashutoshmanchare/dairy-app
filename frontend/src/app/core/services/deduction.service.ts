import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface DeductionRecord {
  id: number;
  customerId: number;
  customerName?: string;
  farmerCode?: string;
  type: "feed" | "loan" | "medicine" | "other";
  amount: number;
  deductionDate: string;
  notes: string;
  isRecovered: number;
}

@Injectable({ providedIn: "root" })
export class DeductionService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getDeductions(): Observable<DeductionRecord[]> {
    return this.http.get<DeductionRecord[]>(`${this.api.baseUrl}/deductions`);
  }

  addDeduction(payload: Omit<DeductionRecord, "id" | "isRecovered">): Observable<DeductionRecord> {
    return this.http.post<DeductionRecord>(`${this.api.baseUrl}/deductions`, payload);
  }
}
