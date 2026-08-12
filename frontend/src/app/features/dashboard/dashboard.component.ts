import { CommonModule, DatePipe } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { MilkCollection } from "../../core/models/milk.model";
import { MilkService } from "../../core/services/milk.service";
import { ReportService } from "../../core/services/report.service";
import { TranslationService } from "../../core/services/translation.service";

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
  readonly translation = inject(TranslationService);

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

  // Detailed shift stats
  morningAvgFat = 0;
  morningAvgSnf = 0;
  morningAmt = 0;
  eveningAvgFat = 0;
  eveningAvgSnf = 0;
  eveningAmt = 0;
  
  lastRefreshTime = "";

  collectionCenters = ["Shree Center 1", "Dharashiv Route", "Nilanga Center", "Latur Route"];
  selectedCenter = "Shree Center 1";

  chartBars: Array<{ label: string; value: number }> = [];
  message = "";
  loading = true;

  get userName(): string {
    return this.authService.getSessionUserName() || "Admin";
  }

  get greeting(): string {
    const lang = this.translation.currentLanguage;
    const hour = new Date().getHours();
    
    let greetText = "Good Morning";
    if (hour >= 12 && hour < 17) {
      greetText = "Good Afternoon";
    } else if (hour >= 17) {
      greetText = "Good Evening";
    }

    if (lang === "mr") {
      if (hour < 12) greetText = "शुभप्रभात";
      else if (hour < 17) greetText = "शुभ दुपार";
      else greetText = "शुभ संध्याकाळ";
      return `${greetText}, ${this.userName} 👋`;
    }
    return `${greetText}, ${this.userName} 👋`;
  }

  formatRefreshTime(): string {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
    const day = now.getDate();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[now.getMonth()];
    return `${timeStr} ${day} ${month}`;
  }

  ngOnInit(): void {
    this.lastRefreshTime = this.formatRefreshTime();
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
        
        // Calculate shift aggregates for today
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayEntries = entries.filter((e) => {
          const dateStr = (e.entryDate || "").toString().slice(0, 10);
          return dateStr === todayStr;
        });

        const morning = todayEntries.filter((e) => e.shift === "morning");
        const evening = todayEntries.filter((e) => e.shift === "evening");

        // Morning Shift Calculations
        this.morningAmt = morning.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);
        if (morning.length > 0) {
          this.morningAvgFat = morning.reduce((sum, e) => sum + Number(e.fat || 0), 0) / morning.length;
          this.morningAvgSnf = morning.reduce((sum, e) => sum + Number(e.snf || 0), 0) / morning.length;
        } else {
          this.morningAvgFat = 0;
          this.morningAvgSnf = 0;
        }

        // Evening Shift Calculations
        this.eveningAmt = evening.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);
        if (evening.length > 0) {
          this.eveningAvgFat = evening.reduce((sum, e) => sum + Number(e.fat || 0), 0) / evening.length;
          this.eveningAvgSnf = evening.reduce((sum, e) => sum + Number(e.snf || 0), 0) / evening.length;
        } else {
          this.eveningAvgFat = 0;
          this.eveningAvgSnf = 0;
        }
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

  refreshData(): void {
    this.loading = true;
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
        this.lastRefreshTime = this.formatRefreshTime();
        this.loading = false;
      },
      error: () => {
        this.lastRefreshTime = this.formatRefreshTime();
        this.loading = false;
      }
    });
  }
}
