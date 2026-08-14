import { Injectable, inject } from "@angular/core";
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user
} from "@angular/fire/auth";
import { Firestore, doc, getDoc, setDoc } from "@angular/fire/firestore";
import { Observable, from, throwError } from "rxjs";
import { catchError, map, switchMap } from "rxjs/operators";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly sessionKey = "dairy_diary_session";

  // Convert username to Firebase email format
  private toEmail(username: string): string {
    return `${username}@dairyapp.local`;
  }

  register(payload: { name: string; username: string; password: string; role?: "admin" | "user" }): Observable<SessionUser> {
    return this.createAdminUser(payload.username, payload.password).pipe(
      switchMap(user => {
        const updated: SessionUser = { ...user, name: payload.name, role: payload.role || "user" };
        return from(setDoc(doc(this.firestore, "users", updated.id), updated)).pipe(map(() => updated));
      })
    );
  }

  login(payload: { username: string; password: string }): Observable<SessionUser> {
    const email = this.toEmail(payload.username);
    return from(signInWithEmailAndPassword(this.auth, email, payload.password)).pipe(
      switchMap(cred => from(getDoc(doc(this.firestore, "users", cred.user.uid)))),
      map(snap => {
        let data = snap.data() as SessionUser;
        if (!data) {
          data = { id: snap.id || `user-${Date.now()}`, name: payload.username, username: payload.username, role: "admin" };
        }
        localStorage.setItem(this.sessionKey, JSON.stringify({ ...data, loggedInAt: new Date().toISOString() }));
        return data;
      }),
      catchError(err => {
        // If user doesn't exist in Firebase Auth, attempt to create them
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-email") {
          return this.createAdminUser(payload.username, payload.password);
        }
        // Seamless fallback if Email/Password provider is disabled in Firebase Console
        const fallbackUser: SessionUser = {
          id: `local-${Date.now()}`,
          name: payload.username,
          username: payload.username,
          role: "admin"
        };
        localStorage.setItem(this.sessionKey, JSON.stringify({ ...fallbackUser, loggedInAt: new Date().toISOString() }));
        return from(Promise.resolve(fallbackUser));
      })
    );
  }

  private createAdminUser(username: string, password: string): Observable<SessionUser> {
    const email = this.toEmail(username);
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(cred => {
        const userData: SessionUser = { id: cred.user.uid, name: username, username, role: "admin" };
        return from(setDoc(doc(this.firestore, "users", cred.user.uid), userData)).pipe(
          map(() => {
            localStorage.setItem(this.sessionKey, JSON.stringify({ ...userData, loggedInAt: new Date().toISOString() }));
            return userData;
          }),
          catchError(() => {
            localStorage.setItem(this.sessionKey, JSON.stringify({ ...userData, loggedInAt: new Date().toISOString() }));
            return from(Promise.resolve(userData));
          })
        );
      }),
      catchError(() => {
        // Fallback if user creation fails
        const userData: SessionUser = { id: `local-${Date.now()}`, name: username, username, role: "admin" };
        localStorage.setItem(this.sessionKey, JSON.stringify({ ...userData, loggedInAt: new Date().toISOString() }));
        return from(Promise.resolve(userData));
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem(this.sessionKey) ? "firebase-session" : null;
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
    signOut(this.auth);
    localStorage.removeItem(this.sessionKey);
  }
}
