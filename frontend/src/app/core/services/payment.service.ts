import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface PaymentRecord {
  id: number;
  customerId: number;
  customerName?: string;
  farmerCode?: string;
  paymentDate: string;
  amount: number;
  status: "paid" | "pending";
  notes: string;
}

export interface PaymentSummary {
  totalQuantity: number;
  grossAmount: number;
  outstandingAdvance: number;
  advanceRecovery: number;
  totalDeductions: number;
  netAmount: number;
}

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.api.baseUrl}/payments`);
  }

  calculateSummary(payload: { customerId: number; startDate: string; endDate: string }): Observable<PaymentSummary> {
    return this.http.post<PaymentSummary>(`${this.api.baseUrl}/payments/calculate`, payload);
  }

  addPayment(payload: {
    customerId: number;
    paymentDate: string;
    amount: number;
    status: "paid" | "pending";
    notes?: string;
    startDate?: string;
    endDate?: string;
    advanceRecovery?: number;
  }): Observable<PaymentRecord> {
    return this.http.post<PaymentRecord>(`${this.api.baseUrl}/payments`, payload);
  }
}
