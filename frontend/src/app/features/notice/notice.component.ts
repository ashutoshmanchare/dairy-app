import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { NoticeRecord, NoticeService } from "../../core/services/notice.service";

@Component({
  selector: "app-notice",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: "./notice.component.html"
})
export class NoticeComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly noticeService = inject(NoticeService);

  notices: NoticeRecord[] = [];
  loading = true;
  saving = false;
  msg = "";
  errorMsg = "";

  form = this.fb.group({
    title: ["", [Validators.required]],
    content: ["", [Validators.required]],
    noticeDate: ["", [Validators.required]]
  });

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.form.patchValue({ noticeDate: today });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.noticeService.getNotices().subscribe({
      next: (data) => {
        this.notices = data;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMsg = "";

    const val = this.form.value;
    const payload: NoticeRecord = {
      title: val.title!,
      content: val.content!,
      noticeDate: val.noticeDate!
    };

    this.noticeService.createNotice(payload).subscribe({
      next: () => {
        this.saving = false;
        this.msg = "Notice published successfully!";
        this.form.reset({
          title: "",
          content: "",
          noticeDate: new Date().toISOString().slice(0, 10)
        });
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err.error?.message || "Failed to publish notice.";
      }
    });
  }

  toggleActive(notice: NoticeRecord): void {
    const newStatus = notice.isActive === 1 ? false : true;
    this.noticeService.toggleNoticeActive(notice.id!, newStatus).subscribe({
      next: () => {
        this.msg = "Notice status updated!";
        this.load();
        setTimeout(() => (this.msg = ""), 3000);
      }
    });
  }

  remove(id?: number): void {
    if (!id) return;
    if (confirm("Are you sure you want to delete this notice?")) {
      this.noticeService.deleteNotice(id).subscribe({
        next: () => {
          this.msg = "Notice deleted successfully!";
          this.load();
          setTimeout(() => (this.msg = ""), 3000);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(["/dashboard"]);
  }
}
