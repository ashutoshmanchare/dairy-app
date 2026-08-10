import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { MilkCollection } from "../models/milk.model";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class MilkService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getCollections(): Observable<MilkCollection[]> {
    return this.http.get<MilkCollection[]>(`${this.api.baseUrl}/milk`);
  }

  addCollection(payload: Omit<MilkCollection, "id" | "customerName" | "totalAmount">): Observable<MilkCollection> {
    return this.http.post<MilkCollection>(`${this.api.baseUrl}/milk`, payload);
  }

  deleteCollection(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/milk/${id}`);
  }
}
