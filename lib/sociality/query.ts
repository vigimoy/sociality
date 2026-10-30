"use client";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import { useAppSelector } from "./store";
import { api, withPage } from "./api";
import type { Post, PostPage, User, UserPage, CommentPage } from "./types";
import { toast } from "sonner";
import { mapPosts, mapUser, setLiked } from "./cache";
export { mapPosts } from "./cache";
export function useSession() {
  return useAppSelector((s) => s.auth);
}
export function useResource<T>(path: string, enabled = true) {
  const { session, ready } = useSession();
  return useQuery({
    queryKey: ["api", session?.user.id || 0, path],
    enabled: ready && enabled,
    queryFn: ({ signal }) => api<T>(path, { token: session?.token, signal }),
  });
}
export function usePages<T extends PostPage | UserPage | CommentPage>(
  path: string,
  enabled = true,
) {
  const { session, ready } = useSession();
  return useInfiniteQuery({
    queryKey: ["api", session?.user.id || 0, path, "pages"],
    enabled: ready && enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<T>(withPage(path, pageParam), { token: session?.token, signal }),
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages
        ? last.pagination.page + 1
        : undefined,
  });
}
export function unique<T extends { id: number }>(items: T[]): T[] {
  return [...new Map(items.map((x) => [x.id, x])).values()];
}
export function useSavedIds() {
  return usePostMembership("saved");
}
export function useLikedIds() {
  return usePostMembership("likes");
}
// Public post detail currently returns likedByMe=false even with a valid token.
// Authenticated collections are the authority for the viewer's membership.
function usePostMembership(kind: "saved" | "likes") {
  const { session, ready } = useSession();
  return useQuery({
    queryKey: [kind + "-ids", session?.user.id || 0],
    enabled: ready && !!session,
    queryFn: async ({ signal }) => {
      const ids: number[] = [];
      let page = 1;
      let totalPages = 1;
      do {
        const data = await api<PostPage>(
          withPage("/api/me/" + kind, page, 20),
          {
            token: session!.token,
            signal,
          },
        );
        ids.push(...data.posts.map((p) => p.id));
        totalPages = data.pagination.totalPages;
        page++;
      } while (page <= totalPages);
      return ids;
    },
  });
}
const locks = new Set<string>();
export function track(event: string, id?: number | string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent("sociality:analytics", {
        detail: { event, id, at: new Date().toISOString() },
      }),
    );
}
export function usePostAction(post: Post, kind: "like" | "save") {
  const { session } = useSession();
  const client = useQueryClient();
  const key = `${session?.user.id}:${kind}:${post.id}`;
  const membershipKey = [
    kind === "like" ? "likes-ids" : "saved-ids",
    session?.user.id || 0,
  ];
  const mutation = useMutation({
    mutationKey: ["social-action", key],
    mutationFn: async (active: boolean) =>
      api(`/api/posts/${post.id}/${kind}`, {
        token: session?.token,
        method: active ? "DELETE" : "POST",
      }),
    onMutate: async (active) => {
      await client.cancelQueries({ queryKey: ["api"] });
      {
        await client.cancelQueries({ queryKey: membershipKey });
        client.setQueryData<number[]>(membershipKey, (old) =>
          active
            ? (old || []).filter((id) => id !== post.id)
            : [...new Set([...(old || []), post.id])],
        );
      }
      const update = (p: Post) =>
        kind === "like"
          ? setLiked({ ...p, likedByMe: active }, !active)
          : { ...p, savedByMe: !active, isSaved: !active };
      client.setQueriesData({ queryKey: ["api"] }, (d) =>
        mapPosts(d, post.id, update),
      );
      return { active };
    },
    onError: (error, _vars, ctx) => {
      if (ctx) {
        client.setQueryData<number[]>(membershipKey, (old) =>
          ctx.active
            ? [...new Set([...(old || []), post.id])]
            : (old || []).filter((id) => id !== post.id),
        );
        client.setQueriesData({ queryKey: ["api"] }, (d) =>
          mapPosts(d, post.id, (p) =>
            kind === "like"
              ? setLiked({ ...p, likedByMe: !ctx.active }, ctx.active)
              : { ...p, savedByMe: ctx.active, isSaved: ctx.active },
          ),
        );
      }
      toast.error(error.message);
    },
    onSuccess: (_data, active) =>
      track(`${active ? "un" : ""}${kind}`, post.id),
    onSettled: async () => {
      try {
        if (client.isMutating({ mutationKey: ["social-action"] }) === 1)
          await Promise.all([
            client.invalidateQueries({ queryKey: ["api"] }),
            client.invalidateQueries({ queryKey: ["saved-ids"] }),
            client.invalidateQueries({ queryKey: ["likes-ids"] }),
          ]);
      } finally {
        locks.delete(key);
      }
    },
  });
  return {
    ...mutation,
    toggle: (active: boolean) => {
      if (!session || locks.has(key)) return;
      locks.add(key);
      mutation.mutate(active);
    },
  };
}
export function useFollow(user: User) {
  const { session } = useSession();
  const client = useQueryClient();
  const key = `${session?.user.id}:follow:${user.username}`;
  const mutation = useMutation({
    mutationKey: ["social-action", key],
    mutationFn: (active: boolean) =>
      api(`/api/follow/${encodeURIComponent(user.username)}`, {
        method: active ? "DELETE" : "POST",
        token: session?.token,
      }),
    onMutate: async (active) => {
      await client.cancelQueries({ queryKey: ["api"] });
      client.setQueriesData({ queryKey: ["api"] }, (d) =>
        mapUser(d, user.username, !active),
      );
      return active;
    },
    onError: (e, _v, active) => {
      client.setQueriesData({ queryKey: ["api"] }, (d) =>
        mapUser(d, user.username, !!active),
      );
      toast.error(e.message);
    },
    onSuccess: (_d, active) => track(active ? "unfollow" : "follow", user.id),
    onSettled: async () => {
      try {
        if (client.isMutating({ mutationKey: ["social-action"] }) === 1)
          await Promise.all([
            client.invalidateQueries({ queryKey: ["api"] }),
            client.invalidateQueries({ queryKey: ["saved-ids"] }),
            client.invalidateQueries({ queryKey: ["likes-ids"] }),
          ]);
      } finally {
        locks.delete(key);
      }
    },
  });
  return {
    ...mutation,
    toggle: () => {
      if (!session || locks.has(key)) return;
      locks.add(key);
      mutation.mutate(Boolean(user.isFollowing ?? user.isFollowedByMe));
    },
  };
}
