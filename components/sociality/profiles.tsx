"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession, useResource } from "@/lib/sociality/query";
import { userPath } from "@/lib/sociality/api";
import type { User } from "@/lib/sociality/types";
import {
  useAppSelector,
  useAppDispatch,
  setSearch,
} from "@/lib/sociality/store";
import {
  Shell,
  Avatar,
  Icon,
  AuthGuard,
  Loading,
  ErrorState,
  FollowButton,
  UserResults,
  Empty,
  PageHeading,
  share,
} from "./common";
import { PostList } from "./posts";
import type { MeResponse } from "./forms";
export function Profile({
  username,
  tab = "posts",
}: {
  username?: string;
  tab?: string;
}) {
  return username ? (
    <ProfileBody key={`${username}:${tab}`} username={username} initialTab={tab} />
  ) : (
    <AuthGuard>
      <ProfileBody key={tab} initialTab={tab} />
    </AuthGuard>
  );
}
function ProfileBody({
  username,
  initialTab,
}: {
  username?: string;
  initialTab: string;
}) {
  const { session } = useSession();
  const mine = !username || session?.user.username === username;
  const [tab, setTab] = useState(initialTab);
  const path = mine ? "/api/me" : userPath(username!);
  const query = useResource<User | MeResponse>(path);
  const data = query.data;
  const user = data
    ? "profile" in data
      ? {
          ...data.profile,
          counts: {
            post: data.stats.posts,
            followers: data.stats.followers,
            following: data.stats.following,
            likes: data.stats.likes,
          },
        }
      : data
    : undefined;
  const root = mine ? "/me" : "/profile/" + encodeURIComponent(username!);
  const postsPath = mine
    ? `/api/me/${tab === "saved" ? "saved" : tab === "likes" ? "likes" : "posts"}`
    : userPath(username!) + (tab === "likes" ? "/likes" : "/posts");
  return (
    <Shell title={user?.name || "Profile"} back>
      <div className="profile-container">
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} retry={() => query.refetch()} />
        ) : (
          user && (
            <>
              <section className="profile-header">
                <div className="profile-top">
                  <div className="user-info">
                    <Avatar user={user} size={64} />
                    <div>
                      <strong>{user.name}</strong>
                      <p>{user.username}</p>
                    </div>
                  </div>
                  <div className="profile-buttons">
                    {mine ? (
                      <Button className="pill" variant="outline" asChild>
                        <Link href="/me/settings">Edit Profile</Link>
                      </Button>
                    ) : (
                      <FollowButton user={user} />
                    )}
                    <button
                      className="share-profile"
                      aria-label="Share profile"
                      onClick={() =>
                        share("/profile/" + encodeURIComponent(user.username))
                      }
                    >
                      <Icon name="share" />
                    </button>
                  </div>
                </div>
                {user.bio && <p className="profile-bio">{user.bio}</p>}
                <div className="profile-stats">
                  <button onClick={() => setTab("posts")}>
                    <strong>{user.counts?.post || 0}</strong>
                    <span>Post</span>
                  </button>
                  <Link href={root + "/followers"}>
                    <strong>{user.counts?.followers || 0}</strong>
                    <span>Followers</span>
                  </Link>
                  <Link href={root + "/following"}>
                    <strong>{user.counts?.following || 0}</strong>
                    <span>Following</span>
                  </Link>
                  <button onClick={() => setTab("likes")}>
                    <strong>{user.counts?.likes || 0}</strong>
                    <span>Likes</span>
                  </button>
                </div>
              </section>
              <div
                role="tablist"
                aria-label="Profile posts"
                className="profile-tabs"
              >
                <button
                  role="tab"
                  aria-selected={tab === "posts"}
                  onClick={() => setTab("posts")}
                >
                  <Icon name="grid" />
                  Gallery
                </button>
                {mine && (
                  <button
                    role="tab"
                    aria-selected={tab === "saved"}
                    onClick={() => setTab("saved")}
                  >
                    <Icon name="save" />
                    Saved
                  </button>
                )}
                <button
                  role="tab"
                  aria-selected={tab === "likes"}
                  onClick={() => setTab("likes")}
                >
                  <Icon name="heart" />
                  Liked
                </button>
              </div>
              <PostList
                key={postsPath}
                path={postsPath}
                grid
                emptyTitle={
                  tab === "saved"
                    ? "No saved posts yet"
                    : tab === "likes"
                      ? "No liked posts yet"
                      : mine
                        ? "Your story starts here"
                        : "No posts yet"
                }
                emptyDescription={
                  tab === "saved"
                    ? "Save photos you love and find them here."
                    : tab === "likes"
                      ? "Photos you like will appear here."
                      : mine
                        ? "Share your first post and let the world see your moments, passions, and memories."
                        : "This person has not shared any photos yet."
                }
              />
            </>
          )
        )}
      </div>
    </Shell>
  );
}
export function SearchPage() {
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const query = useAppSelector((s) => s.ui.search);
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const q = params.get("q");
    if (q !== null) dispatch(setSearch(q));
  }, [params, dispatch]);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  return (
    <Shell title="Search" back>
      <div className="search-container">
        <PageHeading>Search people</PageHeading>
        <div className="search-field">
          <Icon name="search" />
          <Input
            aria-label="Search by name or username"
            placeholder="Search by name or username"
            value={query}
            onChange={(e) => dispatch(setSearch(e.target.value))}
          />
        </div>
        {debounced ? (
          <UserResults
            key={debounced}
            path={"/api/users/search?q=" + encodeURIComponent(debounced)}
          />
        ) : (
          <Empty
            title="Find your people"
            description="Search for a name or username to connect."
          />
        )}
      </div>
    </Shell>
  );
}
export function PeoplePage({
  username,
  type,
}: {
  username?: string;
  type: "followers" | "following";
}) {
  const title = type === "followers" ? "Followers" : "Following";
  const content = (
    <Shell title={title} back>
      <div className="people-container">
        <PageHeading
          href={username ? "/profile/" + encodeURIComponent(username) : "/me"}
        >
          {title}
        </PageHeading>
        <UserResults
          path={(username ? userPath(username) : "/api/me") + "/" + type}
        />
      </div>
    </Shell>
  );
  return username ? content : <AuthGuard>{content}</AuthGuard>;
}
