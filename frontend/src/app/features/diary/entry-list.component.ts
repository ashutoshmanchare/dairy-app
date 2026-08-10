import { CommonModule, DatePipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { Entry } from "../../core/models/entry.model";
import { EntryService } from "../../core/services/entry.service";
import { EntryFormComponent } from "./entry-form.component";

@Component({
  selector: "app-entry-list",
  standalone: true,
  imports: [CommonModule, EntryFormComponent, DatePipe],
  templateUrl: "./entry-list.component.html"
})
export class EntryListComponent implements OnInit {
  private readonly entryService = inject(EntryService);

  entries: Entry[] = [];
  selectedEntry: Entry | null = null;
  isLoading = false;
  statusMessage = "";
  statusType: "success" | "danger" = "success";

  ngOnInit(): void {
    this.loadEntries();
  }

  loadEntries(): void {
    this.isLoading = true;
    this.entryService.getEntries().subscribe({
      next: (entries) => {
        this.entries = entries;
        this.isLoading = false;
      },
      error: () => {
        this.statusType = "danger";
        this.statusMessage = "Failed to load entries.";
        this.isLoading = false;
      }
    });
  }

  onSave(event: { id: string | null; payload: Partial<Entry> }): void {
    const action$ = event.id
      ? this.entryService.updateEntry(event.id, event.payload)
      : this.entryService.createEntry(event.payload);

    action$.subscribe({
      next: () => {
        this.selectedEntry = null;
        this.statusType = "success";
        this.statusMessage = event.id ? "Entry updated successfully." : "Entry added successfully.";
        this.loadEntries();
      },
      error: () => {
        this.statusType = "danger";
        this.statusMessage = "Unable to save entry.";
      }
    });
  }

  edit(entry: Entry): void {
    this.selectedEntry = entry;
  }

  remove(id: string): void {
    this.entryService.deleteEntry(id).subscribe({
      next: () => {
        this.statusType = "success";
        this.statusMessage = "Entry deleted successfully.";
        this.loadEntries();
      },
      error: () => {
        this.statusType = "danger";
        this.statusMessage = "Delete failed.";
      }
    });
  }
}
