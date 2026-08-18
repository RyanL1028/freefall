import { defineConfig } from "sanity";
import { article, writer, category } from "./sanity/schema";

export default defineConfig({
  name: "default",
  title: "Free-Fall News",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "v0wwcks1",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  schema: { types: [article, writer, category] },
});
