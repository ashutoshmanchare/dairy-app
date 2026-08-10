import { NgIf } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  templateUrl: "./login.component.html"
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  error = "";
  loading = false;

  form = this.fb.group({
    username: ["", [Validators.required, Validators.minLength(3)]],
    password: ["", [Validators.required, Validators.minLength(3)]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = "";
    this.authService.login(this.form.getRawValue() as { username: string; password: string }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl("/");
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        if (err.status === 0 || err.status >= 500) {
          this.error = "Cannot reach server. Is backend running on port 5000?";
          return;
        }
        if (err.status === 401) {
          this.error = "Invalid username or password";
          return;
        }
        this.error = err.error?.message || "Login failed. Please try again.";
      }
    });
  }
}
