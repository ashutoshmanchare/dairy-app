import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, catchError, tap, throwError } from "rxjs";
import { User } from "../models/user.model";
import { ApiService } from "./api.service";

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: "root"
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly tokenKey = "diary_token";
  private readonly sessionKey = "dairy_diary_session";

  register(payload: {
    name: string;
    username: string;
    password: string;
    role?: "admin" | "user";
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api.baseUrl}/auth/register`, payload)
      .pipe(tap((res) => this.storeSession(res.user, res.token)));
  }

  login(payload: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api.baseUrl}/auth/login`, payload).pipe(
      tap((res) => this.storeSession(res.user, res.token)),
      catchError((error) => throwError(() => error))
    );
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.api.baseUrl}/auth/me`);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getSessionUserName(): string {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return "";
    }
    try {
      return JSON.parse(raw).name ?? "";
    } catch {
      return "";
    }
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(this.sessionKey));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.sessionKey);
  }

  private storeSession(user: User, token: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(
      this.sessionKey,
      JSON.stringify({
        ...user,
        loggedInAt: new Date().toISOString()
      })
    );
  }
}
