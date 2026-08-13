import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface DispatchRecord {
  id?: number;
  dispatchDate: string;
  shift: "morning" | "evening";
  vehicleNo?: string;
  tankerNo?: string;
  quantity: number;
  fat: number;
  snf: number;
  status?: "pending" | "dispatched" | "received";
}

@Injectable({ providedIn: "root" })
export class DispatchService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getDispatches(): Observable<DispatchRecord[]> {
    return this.http.get<DispatchRecord[]>(`${this.api.baseUrl}/dispatches`);
  }

  createDispatch(payload: DispatchRecord): Observable<DispatchRecord> {
    return this.http.post<DispatchRecord>(`${this.api.baseUrl}/dispatches`, payload);
  }

  deleteDispatch(id: number): Observable<any> {
    return this.http.delete(`${this.api.baseUrl}/dispatches/${id}`);
  }
}
