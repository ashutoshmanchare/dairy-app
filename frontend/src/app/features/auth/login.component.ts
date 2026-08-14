import { NgIf } from "@angular/common";
import { Component, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { FirestoreRestService } from "../../core/services/firestore-rest.service";

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
  private readonly db = inject(FirestoreRestService);
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
        // Preload ALL data in parallel after login — pages open instantly
        this.db.preloadAll();
        this.router.navigateByUrl("/");
      },
      error: (err: any) => {
        this.loading = false;
        if (err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential") {
          this.error = "चुकीचा पासवर्ड. पुन्हा प्रयत्न करा.";
          return;
        }
        this.error = "लॉगिन अयशस्वी. कृपया पुन्हा प्रयत्न करा.";
      }
    });
  }
}

