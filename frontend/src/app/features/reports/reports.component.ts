import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { ReportService } from "../../core/services/report.service";

@Component({
  selector: "app-reports",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./reports.component.html"
})
export class ReportsComponent implements OnInit {
  private readonly reportService = inject(ReportService);

  daily: Array<{ date: string; totalQuantity: number; totalAmount: number }> = [];
  monthly: Array<{ month: string; totalQuantity: number; totalAmount: number }> = [];
  customer: Array<{ customerId: number; customerName: string; totalQuantity: number; billAmount: number; paidAmount: number; pendingAmount: number }> = [];

  ngOnInit(): void {
    this.reportService.getDailyReport().subscribe((rows) => (this.daily = rows));
    this.reportService.getMonthlyReport().subscribe((rows) => (this.monthly = rows));
    this.reportService.getCustomerReport().subscribe((rows) => (this.customer = rows));
  }
}
