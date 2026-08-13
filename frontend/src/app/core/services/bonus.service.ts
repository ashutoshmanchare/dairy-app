import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface BonusRecord {
  id?: number;
  customerId: number;
  customerName: string;
  farmerCode: string;
  year: number;
  totalMilk: number;
  bonusRate: number;
  bonusAmount: number;
  status: "pending" | "paid";
}

@Injectable({ providedIn: "root" })
export class BonusService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getBonuses(year: number): Observable<BonusRecord[]> {
    return this.http.get<BonusRecord[]>(`${this.api.baseUrl}/bonuses?year=${year}`);
  }

  calculateBonus(year: number, bonusRate: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api.baseUrl}/bonuses/calculate`, { year, bonusRate });
  }

  markBonusPaid(id: number, status: "paid" | "pending"): Observable<any> {
    return this.http.put(`${this.api.baseUrl}/bonuses/${id}/pay`, { status });
  }
}
