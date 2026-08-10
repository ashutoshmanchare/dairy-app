export interface Entry {
  _id: string;
  title: string;
  content: string;
  entryDate: string;
  mood: "happy" | "neutral" | "sad";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
