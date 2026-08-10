import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable, fromEvent, merge, of } from "rxjs";
import { map } from "rxjs/operators";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class OfflineService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private readonly onlineStatusSubject = new BehaviorSubject<boolean>(navigator.onLine);
  readonly isOnline$: Observable<boolean> = this.onlineStatusSubject.asObservable();

  private readonly QUEUE_KEY = "offline_milk_collections";

  constructor() {
    // Listen to browser online/offline events
    merge(
      of(navigator.onLine),
      fromEvent(window, "online").pipe(map(() => true)),
      fromEvent(window, "offline").pipe(map(() => false))
    ).subscribe((status) => {
      this.onlineStatusSubject.next(status);
      if (status) {
        console.log("Internet restored. Triggering automatic queue sync...");
        this.syncQueue().subscribe();
      }
    });
  }

  get isOnline(): boolean {
    return this.onlineStatusSubject.value;
  }

  getQueuedEntries(): any[] {
    const raw = localStorage.getItem(this.QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  saveToQueue(entry: any): void {
    const entries = this.getQueuedEntries();
    // Assign a temporary negative ID so it stands out in the UI lists
    entry.id = -Date.now();
    entries.push(entry);
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(entries));
  }

  clearQueue(): void {
    localStorage.removeItem(this.QUEUE_KEY);
  }

  syncQueue(): Observable<boolean> {
    const entries = this.getQueuedEntries();
    if (entries.length === 0) return of(true);

    console.log(`Syncing ${entries.length} offline milk collection entries to Server...`);
    
    // We can POST them one by one or batched. Let's send them one by one recursively
    const processNext = (index: number): Observable<boolean> => {
      if (index >= entries.length) {
        this.clearQueue();
        return of(true);
      }
      const entry = { ...entries[index] };
      delete entry.id; // remove temp local ID
      
      return new Observable<boolean>((observer) => {
        this.http.post(`${this.api.baseUrl}/milk`, entry).subscribe({
          next: () => {
            processNext(index + 1).subscribe({
              next: (res) => {
                observer.next(res);
                observer.complete();
              },
              error: (err) => {
                observer.error(err);
              }
            });
          },
          error: (err) => {
            console.error("Failed to sync entry at index", index, err.message);
            // Slice the queue to keep unsynced items
            const remaining = entries.slice(index);
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
            observer.next(false);
            observer.complete();
          }
        });
      });
    };

    return processNext(0);
  }
}
