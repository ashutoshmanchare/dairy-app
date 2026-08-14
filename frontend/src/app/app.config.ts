import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { routes } from "./app.routes";

/**
 * No Firebase SDK providers here.
 * We use Firestore REST API directly via HttpClient for all data operations.
 * This eliminates WebSocket channel connections that caused slowness.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient()
  ]
};
