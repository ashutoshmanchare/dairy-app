import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Entry } from "../models/entry.model";
import { ApiService } from "./api.service";

@Injectable({
  providedIn: "root"
})
export class EntryService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getEntries(): Observable<Entry[]> {
    return this.http.get<Entry[]>(`${this.api.baseUrl}/entries`);
  }

  createEntry(payload: Partial<Entry>): Observable<Entry> {
    return this.http.post<Entry>(`${this.api.baseUrl}/entries`, payload);
  }

  updateEntry(id: string, payload: Partial<Entry>): Observable<Entry> {
    return this.http.put<Entry>(`${this.api.baseUrl}/entries/${id}`, payload);
  }

  deleteEntry(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/entries/${id}`);
  }
}
