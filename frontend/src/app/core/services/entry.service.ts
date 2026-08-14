import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";
import { Entry } from "../models/entry.model";

const KEY = "dairy_app_entries_v1";

@Injectable({ providedIn: "root" })
export class EntryService {
  private readonly _entries$ = new BehaviorSubject<Entry[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._entries$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._entries$.next([]);
    }
  }

  private saveLocal(data: Entry[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getEntries(): Observable<Entry[]> {
    return of(this._entries$.value);
  }

  createEntry(payload: Partial<Entry>): Observable<Entry> {
    const newDoc = {
      ...payload,
      id: `entry_${Date.now()}`
    } as Entry;
    const updated = [newDoc, ...this._entries$.value];
    this._entries$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  updateEntry(id: string, payload: Partial<Entry>): Observable<Entry> {
    const updated = this._entries$.value.map(e => String((e as any).id) === String(id) ? { ...e, ...payload } : e);
    this._entries$.next(updated);
    this.saveLocal(updated);
    return of({ id, ...payload } as Entry);
  }

  deleteEntry(id: string): Observable<{ message: string }> {
    const updated = this._entries$.value.filter(e => String((e as any).id) !== String(id));
    this._entries$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
