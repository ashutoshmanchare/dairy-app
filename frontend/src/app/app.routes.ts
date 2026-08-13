import { Routes } from "@angular/router";
import { authGuard } from "./core/guards/auth.guard";
import { LoginComponent } from "./features/auth/login.component";
import { RegisterComponent } from "./features/auth/register.component";
import { CustomersComponent } from "./features/customers/customers.component";
import { DashboardComponent } from "./features/dashboard/dashboard.component";
import { MilkComponent } from "./features/milk/milk.component";
import { MoreComponent } from "./features/more/more.component";
import { PaymentComponent } from "./features/payment/payment.component";
import { ReportsComponent } from "./features/reports/reports.component";
import { RateChartComponent } from "./features/rate-chart/rate-chart.component";
import { AdvanceComponent } from "./features/advance/advance.component";
import { DeductionComponent } from "./features/deduction/deduction.component";
import { FeedComponent } from "./features/feed/feed.component";
import { InvoiceComponent } from "./features/invoice/invoice.component";
import { MilkSaleComponent } from "./features/milk-sale/milk-sale.component";
import { ExpenseComponent } from "./features/expense/expense.component";
import { NoticeComponent } from "./features/notice/notice.component";
import { BonusComponent } from "./features/bonus/bonus.component";
import { DispatchComponent } from "./features/dispatch/dispatch.component";
import { ReceiveComponent } from "./features/receive/receive.component";

export const routes: Routes = [
  { path: "login", component: LoginComponent },
  { path: "register", component: RegisterComponent },
  { path: "dashboard", component: DashboardComponent, canActivate: [authGuard] },
  { path: "customers", component: CustomersComponent, canActivate: [authGuard] },
  { path: "milk", component: MilkComponent, canActivate: [authGuard] },
  { path: "reports", component: ReportsComponent, canActivate: [authGuard] },
  { path: "payment", component: PaymentComponent, canActivate: [authGuard] },
  { path: "rate-chart", component: RateChartComponent, canActivate: [authGuard] },
  { path: "advance", component: AdvanceComponent, canActivate: [authGuard] },
  { path: "deduction", component: DeductionComponent, canActivate: [authGuard] },
  { path: "feed", component: FeedComponent, canActivate: [authGuard] },
  { path: "invoice", component: InvoiceComponent, canActivate: [authGuard] },
  { path: "milk-sale", component: MilkSaleComponent, canActivate: [authGuard] },
  { path: "expense", component: ExpenseComponent, canActivate: [authGuard] },
  { path: "notice", component: NoticeComponent, canActivate: [authGuard] },
  { path: "bonus", component: BonusComponent, canActivate: [authGuard] },
  { path: "dispatch", component: DispatchComponent, canActivate: [authGuard] },
  { path: "receive", component: ReceiveComponent, canActivate: [authGuard] },
  { path: "more", component: MoreComponent, canActivate: [authGuard] },
  { path: "", redirectTo: "dashboard", pathMatch: "full" },
  { path: "**", redirectTo: "dashboard" }
];
