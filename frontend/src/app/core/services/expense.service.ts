import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface ExpenseRecord {
  id?: number;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}

@Injectable({ providedIn: "root" })
export class ExpenseService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getExpenses(): Observable<ExpenseRecord[]> {
    return this.http.get<ExpenseRecord[]>(`${this.api.baseUrl}/expenses`);
  }

  createExpense(payload: ExpenseRecord): Observable<ExpenseRecord> {
    return this.http.post<ExpenseRecord>(`${this.api.baseUrl}/expenses`, payload);
  }

  deleteExpense(id: number): Observable<any> {
    return this.http.delete(`${this.api.baseUrl}/expenses/${id}`);
  }
}
