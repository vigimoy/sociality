export type User = {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio?: string | null;
  email?: string;
  phone?: string | null;
  isFollowedByMe?: boolean;
  isFollowing?: boolean;
  isMe?: boolean;
  followsMe?: boolean;
  counts?: {
    post: number;
    followers: number;
    following: number;
    likes: number;
    saved?: number;
  };
};
export type Post = {
  id: number;
  imageUrl: string;
  caption: string;
  createdAt: string;
  author: User;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe?: boolean;
  isSaved?: boolean;
};
export type Comment = {
  id: number;
  text: string;
  createdAt: string;
  author: User;
  pending?: boolean;
};
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
// Saved entries omit author and reaction metadata; detail supplies those later.
export type PostPreview = Pick<
  Post,
  "id" | "imageUrl" | "caption" | "createdAt"
> &
  Partial<Post>;
export function isFullPost(post: PostPreview): post is Post {
  return (
    !!post.author &&
    typeof post.likeCount === "number" &&
    typeof post.commentCount === "number" &&
    typeof post.likedByMe === "boolean"
  );
}
export type PostPage = { posts: PostPreview[]; pagination: Pagination };
export type UserPage = { users: User[]; pagination: Pagination };
export type CommentPage = { comments: Comment[]; pagination: Pagination };
export type Session = { token: string; user: User };
