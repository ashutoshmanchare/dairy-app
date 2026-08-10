import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { Customer } from "../models/customer.model";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.api.baseUrl}/customers`);
  }

  addCustomer(payload: Omit<Customer, "id">): Observable<Customer> {
    return this.http.post<Customer>(`${this.api.baseUrl}/customers`, payload);
  }

  updateCustomer(id: number, payload: Omit<Customer, "id">): Observable<Customer> {
    return this.http.put<Customer>(`${this.api.baseUrl}/customers/${id}`, payload);
  }

  deleteCustomer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/customers/${id}`);
  }
}
