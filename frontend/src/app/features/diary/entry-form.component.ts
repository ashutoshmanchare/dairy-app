import { Component, EventEmitter, Input, Output, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Entry } from "../../core/models/entry.model";

@Component({
  selector: "app-entry-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: "./entry-form.component.html"
})
export class EntryFormComponent {
  private readonly fb = inject(FormBuilder);

  @Input() set editEntry(value: Entry | null) {
    if (!value) {
      this.form.reset({ title: "", content: "", entryDate: "", mood: "neutral", tags: "" });
      this.currentId = null;
      return;
    }

    this.currentId = value._id;
    this.form.patchValue({
      title: value.title,
      content: value.content,
      entryDate: value.entryDate?.slice(0, 10),
      mood: value.mood,
      tags: value.tags.join(", ")
    });
  }

  @Output() save = new EventEmitter<{ id: string | null; payload: Partial<Entry> }>();
  currentId: string | null = null;

  form = this.fb.group({
    title: ["", [Validators.required]],
    content: ["", [Validators.required]],
    entryDate: ["", [Validators.required]],
    mood: ["neutral", [Validators.required]],
    tags: [""]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const tags = values.tags
      ? values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    this.save.emit({
      id: this.currentId,
      payload: {
        title: values.title ?? "",
        content: values.content ?? "",
        entryDate: values.entryDate ?? "",
        mood: (values.mood as "happy" | "neutral" | "sad") ?? "neutral",
        tags
      }
    });

    this.form.reset({ title: "", content: "", entryDate: "", mood: "neutral", tags: "" });
    this.currentId = null;
  }
}
