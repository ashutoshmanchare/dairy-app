import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface MilkSaleRecord {
  id?: number;
  buyerName: string;
  saleDate: string;
  shift: "morning" | "evening";
  animalType: "cow" | "buffalo";
  quantity: number;
  rate: number;
  totalAmount?: number;
}

@Injectable({ providedIn: "root" })
export class MilkSaleService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getMilkSales(): Observable<MilkSaleRecord[]> {
    return this.http.get<MilkSaleRecord[]>(`${this.api.baseUrl}/milk-sales`);
  }

  createMilkSale(payload: MilkSaleRecord): Observable<MilkSaleRecord> {
    return this.http.post<MilkSaleRecord>(`${this.api.baseUrl}/milk-sales`, payload);
  }

  deleteMilkSale(id: number): Observable<any> {
    return this.http.delete(`${this.api.baseUrl}/milk-sales/${id}`);
  }
}
