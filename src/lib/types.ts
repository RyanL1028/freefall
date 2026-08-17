export type Category = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  color?: string;
};

export type Writer = {
  _id: string;
  name: string;
  role: string;
  bio?: any[];
  photo?: any;
  order?: number;
};

export type Article = {
  _id: string;
  title: string;
  slug: string;
  publishedAt: string;
  excerpt?: string;
  author?: string;
  category?: Category;
  coverImage?: { asset?: { url?: string } };
  body: any[];
  headline?: boolean;
  trending?: boolean;
};
