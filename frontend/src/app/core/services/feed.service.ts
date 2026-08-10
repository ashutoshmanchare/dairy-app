import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface FeedItem {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  unit: string;
}

export interface FeedSaleRecord {
  id: number;
  customerId: number;
  customerName?: string;
  farmerCode?: string;
  feedItemId: number;
  feedItemName?: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  saleDate: string;
}

@Injectable({ providedIn: "root" })
export class FeedService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getFeedItems(): Observable<FeedItem[]> {
    return this.http.get<FeedItem[]>(`${this.api.baseUrl}/feed/items`);
  }

  createFeedItem(payload: Omit<FeedItem, "id">): Observable<FeedItem> {
    return this.http.post<FeedItem>(`${this.api.baseUrl}/feed/items`, payload);
  }

  getFeedSales(): Observable<FeedSaleRecord[]> {
    return this.http.get<FeedSaleRecord[]>(`${this.api.baseUrl}/feed/sales`);
  }

  recordFeedSale(payload: { customerId: number; feedItemId: number; quantity: number; saleDate: string }): Observable<FeedSaleRecord> {
    return this.http.post<FeedSaleRecord>(`${this.api.baseUrl}/feed/sales`, payload);
  }
}
