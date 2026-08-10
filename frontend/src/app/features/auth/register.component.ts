import { NgIf } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf],
  templateUrl: "./register.component.html"
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  error = "";
  loading = false;

  form = this.fb.group({
    name: ["", [Validators.required, Validators.minLength(2)]],
    username: ["", [Validators.required, Validators.minLength(3)]],
    password: ["", [Validators.required, Validators.minLength(3)]],
    role: ["user", [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = "";
    this.authService
      .register(this.form.getRawValue() as { name: string; username: string; password: string; role: "admin" | "user" })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigateByUrl("/dashboard");
        },
        error: () => {
          this.loading = false;
          this.error = "Registration failed";
        }
      });
  }
}
