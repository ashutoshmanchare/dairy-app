import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, of } from "rxjs";

const KEY = "dairy_app_notices_v1";

export interface NoticeRecord {
  id?: string | number;
  title: string;
  content: string;
  noticeDate: string;
  isActive?: number;
}

const DEFAULT_NOTICES: NoticeRecord[] = [
  {
    id: "not_1",
    title: "दूध संकलन वेळ सूचना",
    content: "सकाळचे दूध संकलन ६:०० ते ९:०० वाजेपर्यंत आणि संध्याकाळचे संकलन ५:०० ते ८:०० वाजेपर्यंत राहील.",
    noticeDate: new Date().toISOString().slice(0, 10),
    isActive: 1
  }
];

@Injectable({ providedIn: "root" })
export class NoticeService {
  private readonly _notices$ = new BehaviorSubject<NoticeRecord[]>([]);

  constructor() {
    this.initLocal();
  }

  private initLocal(): void {
    try {
      const raw = localStorage.getItem(KEY);
      const notices = raw ? JSON.parse(raw) : DEFAULT_NOTICES;
      this._notices$.next(notices);
      if (!raw) localStorage.setItem(KEY, JSON.stringify(DEFAULT_NOTICES));
    } catch {
      this._notices$.next(DEFAULT_NOTICES);
    }
  }

  private saveLocal(data: NoticeRecord[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  getNotices(): Observable<NoticeRecord[]> {
    return of(this._notices$.value);
  }

  createNotice(payload: NoticeRecord): Observable<NoticeRecord> {
    const newDoc: NoticeRecord = {
      ...payload,
      id: `not_${Date.now()}`,
      isActive: 1
    };
    const updated = [newDoc, ...this._notices$.value];
    this._notices$.next(updated);
    this.saveLocal(updated);
    return of(newDoc);
  }

  toggleNoticeActive(id: string | number, isActive: boolean): Observable<any> {
    const updated = this._notices$.value.map(n => String(n.id) === String(id) ? { ...n, isActive: isActive ? 1 : 0 } : n);
    this._notices$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Updated" });
  }

  deleteNotice(id: string | number): Observable<any> {
    const updated = this._notices$.value.filter(n => String(n.id) !== String(id));
    this._notices$.next(updated);
    this.saveLocal(updated);
    return of({ message: "Deleted" });
  }
}
