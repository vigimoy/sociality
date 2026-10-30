import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { mapPosts, mapUser, setLiked } from "../lib/sociality/cache";
import type { Post } from "../lib/sociality/types";
const post: Post = {
  id: 12,
  imageUrl: "/photo.png",
  caption: "Moment",
  createdAt: "2026-10-30T00:00:00Z",
  author: { id: 3, name: "Tester", username: "tester", avatarUrl: null },
  likedByMe: false,
  likeCount: 0,
  commentCount: 0,
};
describe("optimistic cache consistency", () => {
  it("updates the same post in feed, profile and detail without changing another post", () => {
    const client = new QueryClient();
    client.setQueryData(["api", 3, "feed"], {
      pages: [{ posts: [post, { ...post, id: 13 }], pagination: { page: 1 } }],
      pageParams: [1],
    });
    client.setQueryData(["api", 3, "profile"], { posts: [post] });
    client.setQueryData(["api", 3, "detail"], post);
    client.setQueriesData({ queryKey: ["api"] }, (data) =>
      mapPosts(data, 12, (p) => setLiked(p, true)),
    );
    expect(client.getQueryData(["api", 3, "detail"])).toMatchObject({
      likedByMe: true,
      likeCount: 1,
    });
    expect(client.getQueryData(["api", 3, "profile"])).toEqual({
      posts: [{ ...post, likedByMe: true, likeCount: 1 }],
    });
    const feed = client.getQueryData<{ pages: { posts: Post[] }[] }>([
      "api",
      3,
      "feed",
    ])!;
    expect(feed.pages[0].posts[1]).toEqual({ ...post, id: 13 });
    expect(post.likeCount).toBe(0);
    client.clear();
  });
  it("does not double count repeated optimistic updates or rollbacks", () => {
    const liked = setLiked(setLiked(post, true), true);
    expect(liked.likeCount).toBe(1);
    expect(setLiked(setLiked(liked, false), false)).toEqual(post);
  });
  it("preserves concurrent comment and save changes when rolling back a like", () => {
    const current = { ...setLiked(post, true), commentCount: 1, isSaved: true };
    expect(setLiked(current, false)).toMatchObject({
      likeCount: 0,
      commentCount: 1,
      isSaved: true,
    });
  });
  it("keeps follower counters idempotent across profile and search shapes", () => {
    const user = {
      ...post.author,
      counts: { post: 0, followers: 4, following: 0, likes: 0 },
      isFollowing: false,
    };
    const followed = mapUser({ users: [user] }, "tester", true);
    expect(mapUser(followed, "tester", true)).toEqual(followed);
    expect(mapUser(followed, "tester", false)).toMatchObject({
      users: [
        { counts: { followers: 4 }, isFollowing: false, isFollowedByMe: false },
      ],
    });
  });
});
