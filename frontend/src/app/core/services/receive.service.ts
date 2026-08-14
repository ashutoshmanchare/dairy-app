import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_receives_v1";

export interface ReceiveRecord {
  id?: string | number;
  receivedDate: string;
  shift: "morning" | "evening";
  source: string;
  quantity: number;
  fat: number;
  snf: number;
}

@Injectable({ providedIn: "root" })
export class ReceiveService {
  private readonly _receives$ = new BehaviorSubject<ReceiveRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._receives$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._receives$.next([]);
    }
  }

  private saveLocal(data: ReceiveRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getReceives(): Observable<ReceiveRecord[]> {
    return of(this._receives$.value);
  }

  createReceive(payload: ReceiveRecord): Observable<ReceiveRecord> {
    const newDoc: ReceiveRecord = {
      ...payload,
      id: `rec_${Date.now()}`
    };
    const updated = [newDoc, ...this._receives$.value].sort((a, b) => String(b.receivedDate || "").localeCompare(String(a.receivedDate || "")));
    this._receives$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  deleteReceive(id: string | number): Observable<any> {
    const updated = this._receives$.value.filter(r => String(r.id) !== String(id));
    this._receives$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
