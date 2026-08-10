import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

interface Summary {
  totalMilk: number;
  todayMilk: number;
  monthlyMilk: number;
  totalCustomers: number;
  totalPayments: number;
  paidAmount: number;
  pendingAmount: number;
}

@Injectable({ providedIn: "root" })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getSummary(): Observable<Summary> {
    return this.http.get<Summary>(`${this.api.baseUrl}/reports/summary`);
  }

  getDailyReport(): Observable<Array<{ date: string; totalQuantity: number; totalAmount: number }>> {
    return this.http.get<Array<{ date: string; totalQuantity: number; totalAmount: number }>>(
      `${this.api.baseUrl}/reports/daily`
    );
  }

  getMonthlyReport(): Observable<Array<{ month: string; totalQuantity: number; totalAmount: number }>> {
    return this.http.get<Array<{ month: string; totalQuantity: number; totalAmount: number }>>(
      `${this.api.baseUrl}/reports/monthly`
    );
  }

  getCustomerReport(): Observable<
    Array<{ customerId: number; customerName: string; totalQuantity: number; billAmount: number; paidAmount: number; pendingAmount: number }>
  > {
    return this.http.get<
      Array<{ customerId: number; customerName: string; totalQuantity: number; billAmount: number; paidAmount: number; pendingAmount: number }>
    >(`${this.api.baseUrl}/reports/customer`);
  }
}
