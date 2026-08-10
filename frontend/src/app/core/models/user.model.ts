export interface User {
  id: number | string;
  name: string;
  username: string;
  role: "admin" | "user";
}
