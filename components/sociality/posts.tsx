"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useWatch, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/sociality/api";
import { imageVariant } from "@/lib/sociality/media";
import { isFullPost, type PostPreview } from "@/lib/sociality/types";
import {
  useSession,
  usePostAction,
  usePages,
  useResource,
  unique,
  track,
  mapPosts,
  useSavedIds,
  useLikedIds,
} from "@/lib/sociality/query";
import { useAppSelector, useAppDispatch, setFeed } from "@/lib/sociality/store";
import type {
  Post,
  PostPage,
  Comment,
  CommentPage,
} from "@/lib/sociality/types";
import {
  Icon,
  Avatar,
  Shell,
  Loading,
  ErrorState,
  Empty,
  LoadMore,
  PeopleDialog,
  AuthGuard,
  useRequireLogin,
  share,
} from "./common";
dayjs.extend(relativeTime);
export function Time({ value }: { value: string }) {
  return (
    <time dateTime={value} title={dayjs(value).format("D MMM YYYY, HH:mm")}>
      {dayjs(value).fromNow()}
    </time>
  );
}
export function Media(props: Parameters<typeof MediaImage>[0]) {
  return <MediaImage key={props.post.imageUrl} {...props} />;
}
function MediaImage({
  post,
  priority = false,
  thumbnail = false,
}: {
  post: PostPreview;
  priority?: boolean;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [original, setOriginal] = useState(false);
  const optimized = imageVariant(post.imageUrl, thumbnail ? 480 : 1200);
  return failed ? (
    <div className="media-fallback">Photo unavailable</div>
  ) : (
    <img
      className="post-image"
      src={original ? post.imageUrl : optimized}
      srcSet={
        !original && optimized !== post.imageUrl
          ? [360, 720, 1200]
              .map((w) => `${imageVariant(post.imageUrl, w)} ${w}w`)
              .join(",")
          : undefined
      }
      sizes={
        thumbnail
          ? "(max-width: 640px) 33vw, 270px"
          : "(max-width: 640px) 100vw, 720px"
      }
      alt={
        post.caption?.slice(0, 160) ||
        (post.author ? `Photo by ${post.author.name}` : "Saved photo")
      }
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      onError={() =>
        original || optimized === post.imageUrl
          ? setFailed(true)
          : setOriginal(true)
      }
    />
  );
}
export function Actions({
  post,
  onComments,
}: {
  post: Post;
  onComments: () => void;
}) {
  const like = usePostAction(post, "like");
  const save = usePostAction(post, "save");
  const savedIds = useSavedIds();
  const likedIds = useLikedIds();
  const isLiked = likedIds.data?.includes(post.id) ?? post.likedByMe;
  const isSaved =
    savedIds.data?.includes(post.id) ?? !!(post.savedByMe || post.isSaved);
  const requireLogin = useRequireLogin();
  const [people, setPeople] = useState(false);
  return (
    <>
      <div className="post-actions">
        <div className="action-group">
          <div className="action-pair">
            <button
              className="icon-button"
              aria-label={isLiked ? "Unlike post" : "Like post"}
              aria-pressed={!!isLiked}
              disabled={like.isPending || likedIds.isFetching}
              onClick={() => {
                if (!requireLogin()) return;
                if (!likedIds.data) {
                  toast.error("Unable to load your likes. Retrying…");
                  void likedIds.refetch();
                  return;
                }
                like.toggle(isLiked);
              }}
            >
              <Icon name={isLiked ? "liked" : "heart"} />
            </button>
            <button
              className="count-button"
              aria-label={`${post.likeCount} likes. View people who liked`}
              onClick={() => setPeople(true)}
            >
              {post.likeCount}
            </button>
          </div>
          <button
            className="action-pair"
            aria-label={`${post.commentCount} comments. Open comments`}
            onClick={onComments}
          >
            <Icon name="comment" />
            <span>{post.commentCount}</span>
          </button>
          <button
            className="icon-button"
            aria-label="Share post"
            onClick={() => share("/posts/" + post.id)}
          >
            <Icon name="share" />
          </button>
        </div>
        <button
          className="icon-button"
          aria-label={isSaved ? "Unsave post" : "Save post"}
          aria-pressed={isSaved}
          disabled={save.isPending || savedIds.isFetching}
          onClick={() => {
            if (!requireLogin()) return;
            if (!savedIds.data) {
              toast.error("Unable to load your saved posts. Retrying…");
              void savedIds.refetch();
              return;
            }
            save.toggle(isSaved);
          }}
        >
          <Icon name={isSaved ? "saved" : "save"} />
        </button>
      </div>
      {people && (
        <PeopleDialog
          title="Likes"
          path={`/api/posts/${post.id}/likes`}
          onClose={() => setPeople(false)}
        />
      )}
    </>
  );
}
function DeletePost({
  post,
  onDeleted,
}: {
  post: Post;
  onDeleted?: () => void;
}) {
  const { session } = useSession();
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      api(`/api/posts/${post.id}`, { token: session?.token, method: "DELETE" }),
    onSuccess: async () => {
      setConfirm(false);
      toast.success("Post deleted.");
      client.removeQueries({
        queryKey: ["api", session?.user.id, `/api/posts/${post.id}`],
        exact: true,
      });
      await client.invalidateQueries({ queryKey: ["api"] });
      onDeleted?.();
    },
    onError: (e) => toast.error(e.message),
  });
  if (session?.user.id !== post.author.id) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="icon-button" aria-label="Post options">
            <Icon name="more" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setConfirm(true)}>
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogTitle>Delete this post?</DialogTitle>
          <DialogDescription>
            This will remove your photo, caption, and its comments. This cannot
            be undone.
          </DialogDescription>
          <div className="dialog-actions">
            <Button
              variant="outline"
              className="pill"
              onClick={() => setConfirm(false)}
              disabled={mutation.isPending}
            >
              Keep post
            </Button>
            <Button
              variant="destructive"
              className="pill"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Deleting…" : "Delete post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function PostCard({
  post,
  priority = false,
}: {
  post: Post;
  priority?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(false);
  return (
    <article className="post-card" data-post-id={post.id}>
      <div className="post-author">
        <Link
          className="user-info"
          href={"/profile/" + encodeURIComponent(post.author.username)}
        >
          <Avatar user={post.author} size={64} />
          <span>
            <strong>{post.author.username}</strong>
            <small>
              <Time value={post.createdAt} />
            </small>
          </span>
        </Link>
        <DeletePost post={post} />
      </div>
      <button
        className="post-photo"
        aria-label={`Open post by ${post.author.username}`}
        onClick={() => setDetail(true)}
      >
        <Media post={post} priority={priority} />
      </button>
      <Actions post={post} onComments={() => setDetail(true)} />
      <div className="post-caption">
        <Link href={"/profile/" + encodeURIComponent(post.author.username)}>
          <strong>{post.author.username}</strong>
        </Link>
        <p className={expanded ? "" : "clamp-two"}>{post.caption}</p>
        {post.caption?.length > 130 && (
          <button className="text-link" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
      </div>
      {detail && <PostDialog id={post.id} onClose={() => setDetail(false)} />}
    </article>
  );
}
export function PostList({
  path,
  grid = false,
  emptyTitle = "Your story starts here",
  emptyDescription = "Share your first post and let the world see your moments, passions, and memories.",
}: {
  path: string;
  grid?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const query = usePages<PostPage>(path);
  const [selected, setSelected] = useState<number | null>(null);
  if (query.isPending)
    return (
      <div className="post-skeleton" role="status" aria-label="Loading posts">
        <div />
        <div />
        <span />
      </div>
    );
  if (query.isError && !query.data)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const posts = unique(query.data?.pages.flatMap((p) => p.posts) || []);
  return (
    <>
      {posts.length ? (
        <div className={grid ? "gallery" : "post-list"}>
          {posts.map((post, i) =>
            grid || !isFullPost(post) ? (
              <button
                className="gallery-item"
                key={post.id}
                aria-label={`${post.author ? "Open post by " + post.author.username : "Open saved post"}: ${post.caption?.slice(0, 60) || "Photo"}`}
                onClick={() => setSelected(post.id)}
              >
                <Media post={post} thumbnail />
                <span className="gallery-overlay">
                  {typeof post.likeCount === "number" &&
                  typeof post.commentCount === "number"
                    ? `♥ ${post.likeCount} · ${post.commentCount} comments`
                    : "View post"}
                </span>
              </button>
            ) : (
              <PostCard key={post.id} post={post} priority={i === 0} />
            ),
          )}
        </div>
      ) : (
        <Empty title={emptyTitle} description={emptyDescription}>
          <Button className="pill" asChild>
            <Link href={path === "/api/feed" ? "/users/search" : "/posts/new"}>
              {path === "/api/feed" ? "Find people" : "Create a post"}
            </Link>
          </Button>
        </Empty>
      )}
      <LoadMore
        hasNext={query.hasNextPage}
        isLoading={query.isFetchingNextPage}
        error={query.isFetchNextPageError ? query.error : null}
        onClick={() => query.fetchNextPage()}
      />
      {selected !== null && (
        <PostDialog id={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
export function Feed({ privateFeed = false }: { privateFeed?: boolean }) {
  const { session } = useSession();
  const selected = useAppSelector((s) => s.ui.feed);
  const dispatch = useAppDispatch();
  const content = (
    <Shell>
      <div className="feed-container">
        {session && (
          <div className="feed-tabs" role="tablist" aria-label="Feed type">
            <button
              role="tab"
              aria-selected={selected === "explore"}
              onClick={() => dispatch(setFeed("explore"))}
            >
              Explore
            </button>
            <button
              role="tab"
              aria-selected={selected === "following"}
              onClick={() => dispatch(setFeed("following"))}
            >
              Following
            </button>
          </div>
        )}
        <PostList
          path={
            session && selected === "following" ? "/api/feed" : "/api/posts"
          }
          emptyTitle="Your feed is waiting"
          emptyDescription="Follow people or share your first photo to bring your feed to life."
        />
      </div>
    </Shell>
  );
  return privateFeed ? <AuthGuard>{content}</AuthGuard> : content;
}
const commentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(2000, "Use 2,000 characters or fewer."),
});
function Comments({ post }: { post: Post }) {
  const { session } = useSession();
  const client = useQueryClient();
  const requireLogin = useRequireLogin();
  const path = `/api/posts/${post.id}/comments`;
  const query = usePages<CommentPage>(path);
  const [emoji, setEmoji] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const busy = useRef(false);
  const form = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: "" },
  });
  const key = ["api", session?.user.id || 0, path, "pages"];
  const commentText = useWatch({ control: form.control, name: "text", defaultValue: "" });
  const add = useMutation({
    mutationKey: ["social-action", "comment", post.id],
    mutationFn: (text: string) =>
      api<Comment>(path, {
        token: session?.token,
        method: "POST",
        body: { text },
      }),
    onMutate: async (text) => {
      await client.cancelQueries({ queryKey: ["api"] });
      const tempId = -Date.now();
      const comment: Comment = {
        id: tempId,
        text,
        createdAt: new Date().toISOString(),
        author: session!.user,
        pending: true,
      };
      client.setQueryData<InfiniteData<CommentPage>>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p, i) =>
                i === 0 ? { ...p, comments: [comment, ...p.comments] } : p,
              ),
            }
          : {
              pages: [
                {
                  comments: [comment],
                  pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
                },
              ],
              pageParams: [1],
            },
      );
      client.setQueriesData({ queryKey: ["api"] }, (d) =>
        mapPosts(d, post.id, (p) => ({
          ...p,
          commentCount: p.commentCount + 1,
        })),
      );
      return tempId;
    },
    onSuccess: () => {
      form.reset();
      track("comment_submit", post.id);
    },
    onError: (e, _text, tempId) => {
      client.setQueryData<InfiniteData<CommentPage>>(key, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((p) => ({
                ...p,
                comments: p.comments.filter((c) => c.id !== tempId),
              })),
            }
          : old,
      );
      client.setQueriesData({ queryKey: ["api"] }, (d) =>
        mapPosts(d, post.id, (p) => ({
          ...p,
          commentCount: Math.max(0, p.commentCount - 1),
        })),
      );
      toast.error(e.message);
    },
    onSettled: async () => {
      try {
        if (client.isMutating({ mutationKey: ["social-action"] }) === 1)
          await Promise.all([
            client.invalidateQueries({ queryKey: ["api"] }),
            client.invalidateQueries({ queryKey: ["saved-ids"] }),
            client.invalidateQueries({ queryKey: ["likes-ids"] }),
          ]);
      } finally {
        busy.current = false;
      }
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) =>
      api(`/api/comments/${id}`, { token: session?.token, method: "DELETE" }),
    onSuccess: async () => {
      setDeleteId(null);
      toast.success("Comment deleted.");
      await client.invalidateQueries({ queryKey: ["api"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const comments = unique(query.data?.pages.flatMap((p) => p.comments) || []);
  return (
    <>
      <section className="comments-section" aria-label="Comments">
        <h2>Comments</h2>
        {query.isPending ? (
          <Loading />
        ) : query.isError && !query.data ? (
          <ErrorState error={query.error} retry={() => query.refetch()} />
        ) : comments.length ? (
          comments.map((c) => (
            <div className="comment" key={c.id}>
              <div className="comment-top">
                <Link
                  className="user-info"
                  href={"/profile/" + encodeURIComponent(c.author.username)}
                >
                  <Avatar user={c.author} size={40} />
                  <span>
                    <strong>{c.author.name}</strong>
                    <small>
                      {c.pending ? "Sending…" : <Time value={c.createdAt} />}
                    </small>
                  </span>
                </Link>
                {session?.user.id === c.author.id && !c.pending && (
                  <button
                    className="text-link delete-comment"
                    aria-label={`Delete comment by ${c.author.name}`}
                    onClick={() => setDeleteId(c.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p>{c.text}</p>
            </div>
          ))
        ) : (
          <Empty
            title="No comments yet"
            description="Start the conversation."
          />
        )}
        <LoadMore
          hasNext={query.hasNextPage}
          isLoading={query.isFetchingNextPage}
          error={query.isFetchNextPageError ? query.error : null}
          onClick={() => query.fetchNextPage()}
        />
      </section>
      <div className="detail-bottom">
        <Actions
          post={post}
          onComments={() =>
            document.getElementById("comment-input-" + post.id)?.focus()
          }
        />
        <form
          className="comment-composer"
          onSubmit={(event) => form.handleSubmit(({ text }) => {
            if (requireLogin() && !busy.current) {
              busy.current = true;
              add.mutate(text);
            }
          })(event)}
        >
          <div className="emoji-wrap">
            <button
              type="button"
              className="emoji-button"
              aria-label="Choose an emoji"
              aria-expanded={emoji}
              onClick={() => setEmoji(!emoji)}
            >
              <Icon name="emoji" />
            </button>
            {emoji && (
              <div className="emoji-panel">
                {"😀 😅 🥰 😇 🙂 😋 🤪 🤗 ✨ ❤️ 🙌 😍".split(" ").map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      form.setValue("text", form.getValues("text") + e);
                      setEmoji(false);
                      form.setFocus("text");
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="comment-input">
            <Input
              id={"comment-input-" + post.id}
              aria-label="Add a comment"
              placeholder={session ? "Add Comment" : "Log in to comment"}
              {...form.register("text")}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={add.isPending || !commentText.trim()}
            >
              {add.isPending ? "Sending…" : "Post"}
            </button>
          </div>
        </form>
        {form.formState.errors.text && (
          <p className="field-error" role="alert">
            {form.formState.errors.text.message}
          </p>
        )}
      </div>
      <Dialog
        open={deleteId !== null}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Delete your comment?</DialogTitle>
          <DialogDescription>
            This comment will be permanently removed.
          </DialogDescription>
          <div className="dialog-actions">
            <Button
              variant="outline"
              className="pill"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              className="pill"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteId !== null && remove.mutate(deleteId)}
            >
              Delete comment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
function DetailBody({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const query = useResource<Post>(
    `/api/posts/${id}`,
    Number.isInteger(id) && id > 0,
  );
  const loaded = !!query.data;
  useEffect(() => {
    if (loaded) track("view_post", id);
  }, [id, loaded]);
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const post = query.data;
  return (
    <div className="detail-layout">
      <div className="detail-photo">
        <Media post={post} priority />
      </div>
      <div className="detail-panel">
        <div className="detail-intro">
          <div className="comment-top">
            <Link
              className="user-info"
              href={"/profile/" + encodeURIComponent(post.author.username)}
            >
              <Avatar user={post.author} size={40} />
              <span>
                <strong>{post.author.name}</strong>
                <small>
                  <Time value={post.createdAt} />
                </small>
              </span>
            </Link>
            <DeletePost post={post} onDeleted={onDeleted} />
          </div>
          <p>{post.caption}</p>
        </div>
        <Comments post={post} />
      </div>
    </div>
  );
}
export function PostDialog({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="post-dialog">
        <DialogTitle className="sr-only">Post details</DialogTitle>
        <DialogDescription className="sr-only">
          View the photo, reactions, and comments.
        </DialogDescription>
        <DetailBody id={id} onDeleted={onClose} />
        <Link href={"/posts/" + id} className="detail-permalink">
          Open full post
        </Link>
      </DialogContent>
    </Dialog>
  );
}
export function PostDetail({ id }: { id: number }) {
  const router = useRouter();
  return (
    <Shell title="Post" back>
      <div className="standalone-detail">
        <DetailBody id={id} onDeleted={() => router.push("/")} />
      </div>
    </Shell>
  );
}
