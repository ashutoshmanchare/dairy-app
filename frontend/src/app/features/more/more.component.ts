import { Component, inject } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";

@Component({
  selector: "app-more",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./more.component.html"
})
export class MoreComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  get userName(): string {
    return this.authService.getSessionUserName() || "Admin";
  }

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl("/login");
  }
}
