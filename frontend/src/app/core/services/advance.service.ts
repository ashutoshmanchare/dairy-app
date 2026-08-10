import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface AdvanceRecord {
  id: number;
  customerId: number;
  customerName?: string;
  farmerCode?: string;
  amount: number;
  advanceDate: string;
  notes: string;
  recoveredAmount: number;
}

export interface CustomerAdvanceSummary {
  totalAdvance: number;
  totalRecovered: number;
  outstandingAdvance: number;
}

@Injectable({ providedIn: "root" })
export class AdvanceService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getAdvances(): Observable<AdvanceRecord[]> {
    return this.http.get<AdvanceRecord[]>(`${this.api.baseUrl}/advances`);
  }

  addAdvance(payload: Omit<AdvanceRecord, "id" | "recoveredAmount">): Observable<AdvanceRecord> {
    return this.http.post<AdvanceRecord>(`${this.api.baseUrl}/advances`, payload);
  }

  getCustomerAdvanceSummary(customerId: number): Observable<CustomerAdvanceSummary> {
    return this.http.get<CustomerAdvanceSummary>(`${this.api.baseUrl}/advances/customer/${customerId}/summary`);
  }
}
