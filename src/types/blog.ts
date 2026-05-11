export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  author?: string;
  tags?: string[];
  content: string;
};

export type PostInput = Omit<Post, "slug"> & {
  slug?: string;
};
