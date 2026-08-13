import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { ApiService } from "./api.service";

export interface NoticeRecord {
  id?: number;
  title: string;
  content: string;
  noticeDate: string;
  isActive?: number;
}

@Injectable({ providedIn: "root" })
export class NoticeService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  getNotices(): Observable<NoticeRecord[]> {
    return this.http.get<NoticeRecord[]>(`${this.api.baseUrl}/notices`);
  }

  createNotice(payload: NoticeRecord): Observable<NoticeRecord> {
    return this.http.post<NoticeRecord>(`${this.api.baseUrl}/notices`, payload);
  }

  toggleNoticeActive(id: number, isActive: boolean): Observable<any> {
    return this.http.put(`${this.api.baseUrl}/notices/${id}/active`, { isActive });
  }

  deleteNotice(id: number): Observable<any> {
    return this.http.delete(`${this.api.baseUrl}/notices/${id}`);
  }
}
