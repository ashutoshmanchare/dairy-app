import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface ReceiveRecord {
  id?: number;
  receivedDate: string;
  shift: "morning" | "evening";
  source: string;
  quantity: number;
  fat: number;
  snf: number;
}

@Injectable({ providedIn: "root" })
export class ReceiveService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getReceives(): Observable<ReceiveRecord[]> {
    return this.http.get<ReceiveRecord[]>(`${this.api.baseUrl}/receives`);
  }

  createReceive(payload: ReceiveRecord): Observable<ReceiveRecord> {
    return this.http.post<ReceiveRecord>(`${this.api.baseUrl}/receives`, payload);
  }

  deleteReceive(id: number): Observable<any> {
    return this.http.delete(`${this.api.baseUrl}/receives/${id}`);
  }
}
