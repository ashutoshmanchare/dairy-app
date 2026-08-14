import { Injectable } from "@angular/core";
import { Observable, from } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { catchError, map } from "rxjs/operators";
import { of } from "rxjs";

const PROJECT_ID = "dairy-app-7a68c";
const API_KEY = "AIzaSyCEXw6-59VzlT14VPEz9q0AS2ZujpkaRDM";
const FIREBASE_AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

/**
 * AuthService — uses only localStorage for session management.
 * NO Firebase Auth SDK, NO WebSocket connections.
 * Validates credentials against a hardcoded admin or localStorage-stored users.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly sessionKey = "dairy_diary_session";
  private readonly usersKey = "dairy_local_users";

  private getLocalUsers(): Array<{ username: string; password: string; name: string; role: string }> {
    try {
      const raw = localStorage.getItem(this.usersKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  private saveLocalUser(user: { username: string; password: string; name: string; role: string }): void {
    const users = this.getLocalUsers();
    const existing = users.findIndex(u => u.username === user.username);
    if (existing >= 0) {
      users[existing] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  login(payload: { username: string; password: string }): Observable<SessionUser> {
    // Check localStorage users first
    const users = this.getLocalUsers();
    const match = users.find(u => u.username === payload.username && u.password === payload.password);

    if (match) {
      const sessionUser: SessionUser = {
        id: `user-${match.username}`,
        name: match.name || match.username,
        username: match.username,
        role: match.role || "admin"
      };
      localStorage.setItem(this.sessionKey, JSON.stringify({ ...sessionUser, loggedInAt: new Date().toISOString() }));
      return of(sessionUser);
    }

    // Default admin credentials — always works
    const defaultAdmins = [
      { username: "Ashu.M", password: "123" },
      { username: "admin", password: "admin" },
      { username: "admin", password: "123" }
    ];

    const isDefault = defaultAdmins.some(a => a.username === payload.username && a.password === payload.password);
    if (isDefault) {
      const sessionUser: SessionUser = {
        id: `admin-${payload.username}`,
        name: payload.username,
        username: payload.username,
        role: "admin"
      };
      // Save to local users so it persists
      this.saveLocalUser({ username: payload.username, password: payload.password, name: payload.username, role: "admin" });
      localStorage.setItem(this.sessionKey, JSON.stringify({ ...sessionUser, loggedInAt: new Date().toISOString() }));
      return of(sessionUser);
    }

    // If no match, create as new admin (first-time setup)
    const newUser: SessionUser = {
      id: `user-${payload.username}-${Date.now()}`,
      name: payload.username,
      username: payload.username,
      role: "admin"
    };
    this.saveLocalUser({ username: payload.username, password: payload.password, name: payload.username, role: "admin" });
    localStorage.setItem(this.sessionKey, JSON.stringify({ ...newUser, loggedInAt: new Date().toISOString() }));
    return of(newUser);
  }

  register(payload: { name: string; username: string; password: string; role?: "admin" | "user" }): Observable<SessionUser> {
    const newUser: SessionUser = {
      id: `user-${payload.username}-${Date.now()}`,
      name: payload.name,
      username: payload.username,
      role: payload.role || "user"
    };
    this.saveLocalUser({ username: payload.username, password: payload.password, name: payload.name, role: payload.role || "user" });
    localStorage.setItem(this.sessionKey, JSON.stringify({ ...newUser, loggedInAt: new Date().toISOString() }));
    return of(newUser);
  }

  getToken(): string | null {
    return localStorage.getItem(this.sessionKey) ? "local-session" : null;
  }

  getSessionUserName(): string {
    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) return "";
    try { return JSON.parse(raw).name ?? ""; } catch { return ""; }
  }

  isAuthenticated(): boolean {
    return Boolean(localStorage.getItem(this.sessionKey));
  }

  logout(): void {
    localStorage.removeItem(this.sessionKey);
  }
}
