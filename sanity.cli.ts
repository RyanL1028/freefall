import { defineCliConfig } from "sanity/cli";

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "v0wwcks1",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
  studioHost: "freefall-news",
  deployment: {
    appId: "zyh81b1kag4m8hdwtbdo6zuv",
  },
});
