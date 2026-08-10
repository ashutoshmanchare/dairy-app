import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface PaymentRecord {
  id: number;
  customerId: number;
  customerName?: string;
  paymentDate: string;
  amount: number;
  status: "paid" | "pending";
  notes: string;
}

@Injectable({ providedIn: "root" })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getPayments(): Observable<PaymentRecord[]> {
    return this.http.get<PaymentRecord[]>(`${this.api.baseUrl}/payments`);
  }

  addPayment(payload: Omit<PaymentRecord, "id" | "customerName">): Observable<PaymentRecord> {
    return this.http.post<PaymentRecord>(`${this.api.baseUrl}/payments`, payload);
  }
}
