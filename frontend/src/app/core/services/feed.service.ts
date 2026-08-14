import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY_ITEMS = "dairy_app_feed_items_v1";
const KEY_SALES = "dairy_app_feed_sales_v1";

export interface FeedItem {
  id: string | number;
  name: string;
  price: number;
  stockQuantity: number;
  unit: string;
}

export interface FeedSaleRecord {
  id: string | number;
  customerId: string | number;
  customerName?: string;
  farmerCode?: string;
  feedItemId: string | number;
  feedItemName?: string;
  quantity: number;
  rate: number;
  totalAmount: number;
  saleDate: string;
}

const DEFAULT_FEED_ITEMS: FeedItem[] = [
  { id: "feed_1", name: "सरकी पेंड (Sarki Pend)", price: 1650, stockQuantity: 50, unit: "bag" },
  { id: "feed_2", name: "गोळी पेंड (Goli Pend)", price: 1450, stockQuantity: 30, unit: "bag" },
  { id: "feed_3", name: "मका भरडा (Maize Feed)", price: 1200, stockQuantity: 40, unit: "bag" }
];

@Injectable({ providedIn: "root" })
export class FeedService {
  private readonly _items$ = new BehaviorSubject<FeedItem[]>([]);
  private readonly _sales$ = new BehaviorSubject<FeedSaleRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const rawI = localStorage.getItem(KEY_ITEMS);
      const items = rawI ? JSON.parse(rawI) : DEFAULT_FEED_ITEMS;
      this._items$.next(items);
      if (!rawI) localStorage.setItem(KEY_ITEMS, JSON.stringify(DEFAULT_FEED_ITEMS));

      const rawS = localStorage.getItem(KEY_SALES);
      this._sales$.next(rawS ? JSON.parse(rawS) : []);
    } catch {
      this._items$.next(DEFAULT_FEED_ITEMS);
      this._sales$.next([]);
    }
  }

  private saveItems(data: FeedItem[]): void {
    try { localStorage.setItem(KEY_ITEMS, JSON.stringify(data)); } catch {}
  }

  private saveSales(data: FeedSaleRecord[]): void {
    try { localStorage.setItem(KEY_SALES, JSON.stringify(data)); } catch {}
  }

  getFeedItems(): Observable<FeedItem[]> {
    return of(this._items$.value);
  }

  createFeedItem(payload: Omit<FeedItem, "id">): Observable<FeedItem> {
    const newItem: FeedItem = {
      ...payload,
      id: `feed_${Date.now()}`
    };
    const updated = [...this._items$.value, newItem];
    this._items$.next(updated);
    this.saveItems(updated);
    return of(newItem);
  }

  getFeedSales(): Observable<FeedSaleRecord[]> {
    return of(this._sales$.value);
  }

  recordFeedSale(payload: { customerId: string | number; feedItemId: string | number; quantity: number; saleDate: string }): Observable<FeedSaleRecord> {
    const item = this._items$.value.find(i => String(i.id) === String(payload.feedItemId));
    const rate = item?.price || 0;
    const totalAmount = rate * Number(payload.quantity || 0);

    const newSale: FeedSaleRecord = {
      id: `sale_${Date.now()}`,
      customerId: payload.customerId,
      feedItemId: payload.feedItemId,
      feedItemName: item?.name || "Feed Item",
      quantity: Number(payload.quantity || 0),
      rate,
      totalAmount,
      saleDate: payload.saleDate || new Date().toISOString().slice(0, 10)
    };

    const updatedSales = [newSale, ...this._sales$.value];
    this._sales$.next(updatedSales);
    this.saveSales(updatedSales);

    return of(newSale);
  }
}
