import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class ApiService {
  readonly baseUrl: string;

  constructor() {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const isLocal = hostname === "localhost" || 
                    hostname === "127.0.0.1" || 
                    hostname.startsWith("192.168.") || 
                    hostname.startsWith("10.") || 
                    hostname.startsWith("172.16.") || 
                    hostname.endsWith(".local");

    if (isLocal) {
      this.baseUrl = `http://${hostname}:5001/api`;
    } else {
      this.baseUrl = "PROD_API_URL_PLACEHOLDER/api";
    }
  }
}
