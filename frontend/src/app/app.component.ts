import { NgClass, NgIf } from "@angular/common";
import { Component, HostBinding, inject } from "@angular/core";
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { AuthService } from "./core/services/auth.service";

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
  readonly mobileNavItems = [
    { path: "/dashboard", label: "Home", icon: "bi-house-door-fill" },
    { path: "/customers", label: "Customers", icon: "bi-people-fill" },
    { path: "/milk", label: "Collection", icon: "bi-droplet-fill" },
    { path: "/payment", label: "Payments", icon: "bi-wallet2" },
    { path: "/more", label: "More", icon: "bi-grid-fill" }
  ];

  @HostBinding("class.app-authenticated")
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }
}
