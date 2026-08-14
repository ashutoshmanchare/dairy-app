import { Injectable, inject } from "@angular/core";
import {
  Firestore, collection, collectionData, addDoc, doc,
  deleteDoc, updateDoc, query, orderBy, serverTimestamp
} from "@angular/fire/firestore";
import { Observable, from } from "rxjs";
import { map } from "rxjs/operators";

export interface NoticeRecord {
  id?: string | number;
  title: string;
  content: string;
  noticeDate: string;
  isActive?: number;
}

@Injectable({ providedIn: "root" })
export class NoticeService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, "notices");

  getNotices(): Observable<NoticeRecord[]> {
    return collectionData(query(this.col, orderBy("noticeDate", "desc")), { idField: "id" }) as Observable<NoticeRecord[]>;
  }

  createNotice(payload: NoticeRecord): Observable<NoticeRecord> {
    return from(addDoc(this.col, { ...payload, isActive: 1, createdAt: serverTimestamp() })).pipe(
      map(ref => ({ id: ref.id, ...payload, isActive: 1 }))
    );
  }

  toggleNoticeActive(id: string | number, isActive: boolean): Observable<any> {
    return from(updateDoc(doc(this.firestore, "notices", String(id)), { isActive: isActive ? 1 : 0 }));
  }

  deleteNotice(id: string | number): Observable<any> {
    return from(deleteDoc(doc(this.firestore, "notices", String(id))));
  }
}
