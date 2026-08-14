import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_dispatches_v1";

export interface DispatchRecord {
  id?: string | number;
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
  private readonly _dispatches$ = new BehaviorSubject<DispatchRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      this._dispatches$.next(raw ? JSON.parse(raw) : []);
    } catch {
      this._dispatches$.next([]);
    }
  }

  private saveLocal(data: DispatchRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getDispatches(): Observable<DispatchRecord[]> {
    return of(this._dispatches$.value);
  }

  createDispatch(payload: DispatchRecord): Observable<DispatchRecord> {
    const newDoc: DispatchRecord = {
      ...payload,
      id: `disp_${Date.now()}`,
      status: payload.status || "dispatched"
    };
    const updated = [newDoc, ...this._dispatches$.value].sort((a, b) => String(b.dispatchDate || "").localeCompare(String(a.dispatchDate || "")));
    this._dispatches$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  deleteDispatch(id: string | number): Observable<any> {
    const updated = this._dispatches$.value.filter(d => String(d.id) !== String(id));
    this._dispatches$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
