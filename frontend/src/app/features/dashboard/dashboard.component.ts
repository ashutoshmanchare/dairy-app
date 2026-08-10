import { CommonModule, DatePipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { MilkCollection } from "../../core/models/milk.model";
import { MilkService } from "../../core/services/milk.service";
import { ReportService } from "../../core/services/report.service";

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: "./dashboard.component.html"
})
export class DashboardComponent implements OnInit {
  private readonly milkService = inject(MilkService);
  private readonly reportService = inject(ReportService);
  private readonly authService = inject(AuthService);

  recentEntries: MilkCollection[] = [];
  todayMilk = 0;
  todayAmount = 0;
  pendingPayment = 0;
  totalFarmers = 0;
  monthlyMilk = 0;
  paidAmount = 0;
  
  cowMilk = 0;
  buffaloMilk = 0;
  morningMilk = 0;
  eveningMilk = 0;

  collectionCenters = ["Shree Center 1", "Dharashiv Route", "Nilanga Center", "Latur Route"];
  selectedCenter = "Shree Center 1";

  chartBars: Array<{ label: string; value: number }> = [];
  message = "";
  loading = true;

  get userName(): string {
    return this.authService.getSessionUserName() || "Admin";
  }

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return "Good Morning";
    }
    if (hour < 17) {
      return "Good Afternoon";
    }
    return "Good Evening";
  }

  ngOnInit(): void {
    this.reportService.getSummary().subscribe({
      next: (summary) => {
        this.todayMilk = summary.todayMilk;
        this.todayAmount = summary.todayAmount;
        this.pendingPayment = summary.pendingPayment;
        this.totalFarmers = summary.totalFarmers;
        
        this.cowMilk = summary.cowMilk || 0;
        this.buffaloMilk = summary.buffaloMilk || 0;
        this.morningMilk = summary.morningMilk || 0;
        this.eveningMilk = summary.eveningMilk || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });

    this.milkService.getCollections().subscribe({
      next: (entries) => {
        this.recentEntries = entries.slice(0, 5);
      },
      error: () => {
        this.message = "Unable to load recent entries.";
      }
    });

    this.reportService.getDailyReport().subscribe({
      next: (daily) => {
        const max = Math.max(...daily.map((d) => Number(d.totalQuantity)), 1);
        this.chartBars = daily
          .slice(0, 7)
          .reverse()
          .map((d) => ({
            label: new Date(d.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
            value: Math.round((Number(d.totalQuantity) / max) * 100)
          }));
      }
    });
  }

  changeCenter(center: string): void {
    this.selectedCenter = center;
  }

  initials(name?: string): string {
    if (!name) {
      return "?";
    }
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.charAt(0).toUpperCase();
  }
}
