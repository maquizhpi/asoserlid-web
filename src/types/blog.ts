export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  cover: string;
  date: string;
  author?: string;
  tags?: string[];
  status?: "draft" | "published";
  content: string;
};

export type PostInput = Omit<Post, "slug"> & {
  slug?: string;
};

export type BlogCommentStatus = "pending" | "approved" | "rejected";

export type BlogComment = {
  _id?: string;
  postSlug: string;
  postTitle?: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  status: BlogCommentStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
  updatedAt?: string;
};
