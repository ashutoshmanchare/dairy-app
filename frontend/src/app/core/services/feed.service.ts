import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc,
  query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

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

@Injectable({ providedIn: "root" })
export class FeedService {
  private readonly firestore = inject(Firestore);
  private readonly itemsCol = collection(this.firestore, "feed_items");
  private readonly salesCol = collection(this.firestore, "feed_sales");

  getFeedItems(): Observable<FeedItem[]> {
    return collectionData(query(this.itemsCol, orderBy("name", "asc")), { idField: "id" }) as Observable<FeedItem[]>;
  }

  createFeedItem(payload: Omit<FeedItem, "id">): Observable<FeedItem> {
    return from(addDoc(this.itemsCol, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload } as FeedItem))
    );
  }

  getFeedSales(): Observable<FeedSaleRecord[]> {
    return collectionData(query(this.salesCol, orderBy("saleDate", "desc")), { idField: "id" }) as Observable<FeedSaleRecord[]>;
  }

  recordFeedSale(payload: { customerId: string | number; feedItemId: string | number; quantity: number; saleDate: string }): Observable<FeedSaleRecord> {
    return from(addDoc(this.salesCol, { ...payload, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, rate: 0, totalAmount: 0 } as unknown as FeedSaleRecord))
    );
  }
}
