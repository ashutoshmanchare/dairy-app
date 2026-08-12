import { NgClass, NgIf } from "@angular/common";
import { Component, HostBinding, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/services/auth.service";
import { TranslationService } from "./core/services/translation.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf, NgClass],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css"
})
export class AppComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly translation = inject(TranslationService);

  get mobileNavItems() {
    return [
      { path: "/dashboard", label: this.translation.t("nav_home"), icon: "bi-house-door-fill" },
      { path: "/customers", label: this.translation.t("nav_customers"), icon: "bi-people-fill" },
      { path: "/milk", label: this.translation.t("nav_collection"), icon: "bi-droplet-fill" },
      { path: "/payment", label: this.translation.t("nav_payments"), icon: "bi-wallet2" },
      { path: "/more", label: this.translation.t("nav_more"), icon: "bi-grid-fill" }
    ];
  }

  @HostBinding("class.app-authenticated")
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }
}
