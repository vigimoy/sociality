import type { Post, User } from "./types";
export function mapPosts(
  data: unknown,
  id: number,
  change: (p: Post) => Post,
): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data))
    return data.map((item) => mapPosts(item, id, change));
  const d = data as Record<string, unknown>;
  if (d.id === id && typeof d.imageUrl === "string" && d.author)
    return change(d as unknown as Post);
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, mapPosts(v, id, change)]),
  );
}
export function mapUser(
  data: unknown,
  username: string,
  following: boolean,
): unknown {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data))
    return data.map((v) => mapUser(v, username, following));
  const d = data as Record<string, unknown>;
  if (d.username === username) {
    const old = Boolean(d.isFollowing ?? d.isFollowedByMe);
    return {
      ...d,
      isFollowing: following,
      isFollowedByMe: following,
      ...(d.counts
        ? {
            counts: {
              ...(d.counts as User["counts"]),
              followers: Math.max(
                0,
                (d.counts as NonNullable<User["counts"]>).followers +
                  (old === following ? 0 : following ? 1 : -1),
              ),
            },
          }
        : {}),
    };
  }
  return Object.fromEntries(
    Object.entries(d).map(([k, v]) => [k, mapUser(v, username, following)]),
  );
}

export function setLiked(p: Post, liked: boolean): Post {
  return {
    ...p,
    likedByMe: liked,
    likeCount: Math.max(
      0,
      p.likeCount + (p.likedByMe === liked ? 0 : liked ? 1 : -1),
    ),
  };
}
