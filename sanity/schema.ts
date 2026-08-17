// Sanity content schemas for Free-Fall News.
// Plain objects (no `sanity` import) so they can be consumed by the Studio
// and by the migration script without extra dependencies.
// Run `npx sanity@latest init` to connect this project to the Studio.

export const article = {
  type: "document",
  name: "article",
  title: "Article",
  fields: [
    { name: "title", type: "string", title: "Title", validation: (r: any) => r.required() },
    {
      name: "slug",
      type: "slug",
      title: "Slug",
      options: { source: "title", maxLength: 120 },
      validation: (r: any) => r.required(),
    },
    { name: "publishedAt", type: "date", title: "Published date", validation: (r: any) => r.required() },
    { name: "excerpt", type: "text", title: "Excerpt", rows: 3 },
    { name: "author", type: "string", title: "Author" },
    { name: "category", type: "reference", title: "Category", to: [{ type: "category" }] },
    { name: "coverImage", type: "image", title: "Cover image", options: { hotspot: true } },
    {
      name: "body",
      type: "array",
      title: "Body",
      of: [{ type: "block" }, { type: "image" }],
    },
    {
      name: "headline",
      type: "boolean",
      title: "Homepage headline",
      description: "Show as the top headline on the homepage.",
      initialValue: false,
    },
    { name: "trending", type: "boolean", title: "Trending", initialValue: false },
  ],
};

export const writer = {
  type: "document",
  name: "writer",
  title: "Writer",
  fields: [
    { name: "name", type: "string", title: "Name", validation: (r: any) => r.required() },
    { name: "role", type: "string", title: "Role" },
    { name: "bio", type: "text", title: "Bio", rows: 5 },
    { name: "photo", type: "image", title: "Photo", options: { hotspot: true } },
    { name: "order", type: "number", title: "Display order" },
  ],
};

export const category = {
  type: "document",
  name: "category",
  title: "Category",
  fields: [
    { name: "title", type: "string", title: "Title", validation: (r: any) => r.required() },
    { name: "slug", type: "slug", title: "Slug", options: { source: "title" } },
    { name: "description", type: "text", title: "Description", rows: 2 },
    { name: "color", type: "string", title: "Color (hex)" },
  ],
};

export default {
  name: "default",
  title: "Free-Fall News",
  types: [article, writer, category],
};
