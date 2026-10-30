"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useFollow, usePages, unique } from "@/lib/sociality/query";
import {
  useAppDispatch,
  setSession,
  setSearch,
  resetUI,
} from "@/lib/sociality/store";
import type { User, UserPage } from "@/lib/sociality/types";
import { toast } from "sonner";
const icons = {
  add: "43213",
  search: "4821e",
  heart: "bbbc6",
  liked: "6fe31",
  comment: "2a088",
  share: "4d36f",
  save: "c0477",
  saved: "5d9a8",
  home: "574f3",
  homeActive: "5f673",
  profile: "f840a",
  grid: "a75d8",
  close: "2dce1",
  back: "11ba2",
  check: "af402",
  upload: "e8dd2",
  eye: "9c246",
  more: "a294e",
  emoji: "61ad3",
};
export function Icon({
  name,
  className = "",
}: {
  name: keyof typeof icons;
  className?: string;
}) {
  return (
    <img
      className={`design-icon ${className}`}
      src={`/design/${icons[name]}.svg`}
      alt=""
      aria-hidden="true"
    />
  );
}
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Sociality home">
      <span className="brand-mark">
        <img src="/design/7e105.svg" alt="" />
      </span>
      <span>Sociality</span>
    </Link>
  );
}
export function Avatar({
  user,
  size = 48,
}: {
  user?: Partial<User> | null;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, minWidth: size }}
    >
      {user?.avatarUrl && user.avatarUrl !== failedUrl ? (
        <img
          src={user.avatarUrl}
          alt={`${user.name || user.username || "User"} avatar`}
          onError={() => setFailedUrl(user.avatarUrl || null)}
        />
      ) : (
        <span aria-label={`${user?.name || "User"} avatar`}>
          {(user?.name || user?.username || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
export function AuthGuard({ children }: { children: ReactNode }) {
  const { session, ready } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (ready && !session)
      router.replace("/login?returnTo=" + encodeURIComponent(pathname));
  }, [ready, session, router, pathname]);
  return !ready || !session ? <Loading /> : children;
}
export function useRequireLogin() {
  const { session } = useSession();
  const router = useRouter();
  const path = usePathname();
  return () => {
    if (session) return true;
    router.push("/login?returnTo=" + encodeURIComponent(path));
    return false;
  };
}
export function Shell(props: Parameters<typeof ShellBody>[0]) {
  const path = usePathname();
  return <ShellBody key={path} {...props} />;
}
function ShellBody({
  children,
  title,
  back = false,
  nav = true,
}: {
  children: ReactNode;
  title?: string;
  back?: boolean;
  nav?: boolean;
}) {
  const { session } = useSession();
  const path = usePathname();
  const dispatch = useAppDispatch();
  const client = useQueryClient();
  const router = useRouter();
  const [query, update] = useState("");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);
  const logout = () => {
    dispatch(setSession(null));
    dispatch(resetUI());
    client.clear();
    router.push("/login");
    toast.success("You have logged out.");
  };
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="header">
        <div className="header-inner">
          <div className={back ? "desktop-brand" : ""}>
            <Brand />
          </div>
          {back && (
            <div className="mobile-heading">
              <Link href="/" aria-label="Back home">
                <Icon name="back" />
              </Link>
              <strong>{title}</strong>
            </div>
          )}
          <div className="header-search">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatch(setSearch(query));
                router.push("/users/search?q=" + encodeURIComponent(query));
                setOpen(false);
              }}
            >
              <Icon name="search" />
              <Input
                aria-label="Search people"
                placeholder="Search"
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => update(e.target.value)}
              />
            </form>
            {open && debounced && (
              <>
                <button
                  className="search-dismiss"
                  aria-label="Close search"
                  onClick={() => setOpen(false)}
                />
                <div className="search-popover">
                  <UserResults
                    path={
                      "/api/users/search?q=" + encodeURIComponent(debounced)
                    }
                    compact
                  />
                  <Link
                    href={"/users/search?q=" + encodeURIComponent(debounced)}
                    className="text-link"
                  >
                    View all results
                  </Link>
                </div>
              </>
            )}
          </div>
          <div className="header-actions">
            <Link
              className="mobile-search icon-button"
              aria-label="Search people"
              href="/users/search"
            >
              <Icon name="search" />
            </Link>
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="account-button" aria-label="Account menu">
                    <Avatar user={session.user} />
                    <strong>{session.user.name}</strong>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="account-menu">
                  <DropdownMenuItem asChild>
                    <Link href="/me">My profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/me/saved">Saved posts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/me/likes">Liked posts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/me/settings">Edit profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="auth-links">
                <Button asChild variant="outline" className="pill">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="pill">
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main id="main">{children}</main>
      {nav && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <Link
            href={session ? "/feed" : "/"}
            className={!path.startsWith("/me") ? "active" : ""}
          >
            <Icon name={!path.startsWith("/me") ? "homeActive" : "home"} />
            <span>Home</span>
          </Link>
          <Link
            href="/posts/new"
            className="nav-create"
            aria-label="Create a post"
          >
            <Icon name="add" />
          </Link>
          <Link href="/me" className={path.startsWith("/me") ? "active" : ""}>
            <Icon name="profile" />
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </>
  );
}
export function PageHeading({
  children,
  href = "/",
}: {
  children: ReactNode;
  href?: string;
}) {
  return (
    <h1 className="page-heading">
      <Link href={href} className="icon-button" aria-label="Go back">
        <Icon name="back" />
      </Link>
      {children}
    </h1>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      <span>Loading…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <Button className="pill" variant="outline" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function LoadMore({
  hasNext,
  isLoading,
  onClick,
  error,
}: {
  hasNext?: boolean;
  isLoading: boolean;
  onClick: () => void;
  error?: Error | null;
}) {
  if (!hasNext && !error) return null;
  return (
    <div className="load-more">
      {error && <p role="alert">{error.message}</p>}
      <Button
        className="pill"
        variant="outline"
        onClick={onClick}
        disabled={isLoading}
      >
        {isLoading ? "Loading…" : error ? "Try again" : "Load more"}
      </Button>
    </div>
  );
}
export function FollowButton({ user }: { user: User }) {
  const { session } = useSession();
  const mutation = useFollow(user);
  const requireLogin = useRequireLogin();
  const followed = Boolean(user.isFollowing ?? user.isFollowedByMe);
  if (user.isMe || session?.user.id === user.id) return null;
  return (
    <Button
      className="pill follow-button"
      variant={followed ? "outline" : "default"}
      aria-pressed={followed}
      disabled={mutation.isPending}
      onClick={() => {
        if (requireLogin()) mutation.toggle();
      }}
    >
      {followed && <Icon name="check" />}
      {followed ? "Following" : "Follow"}
    </Button>
  );
}
export function UserRow({
  user,
  follow = true,
}: {
  user: User;
  follow?: boolean;
}) {
  return (
    <div className="user-row">
      <Link
        href={"/profile/" + encodeURIComponent(user.username)}
        className="user-info"
      >
        <Avatar user={user} />
        <span>
          <strong>{user.name}</strong>
          <small>{user.username}</small>
        </span>
      </Link>
      {follow && <FollowButton user={user} />}
    </div>
  );
}
export function UserResults({
  path,
  compact = false,
}: {
  path: string;
  compact?: boolean;
}) {
  const query = usePages<UserPage>(path);
  if (query.isPending) return <Loading />;
  if (query.isError && !query.data)
    return <ErrorState error={query.error} retry={() => query.refetch()} />;
  const users = unique(query.data?.pages.flatMap((p) => p.users) || []);
  return (
    <>
      {users.length ? (
        users
          .slice(0, compact ? 5 : undefined)
          .map((user) => (
            <UserRow user={user} key={user.id} follow={!compact} />
          ))
      ) : (
        <Empty
          title="No results found"
          description="Try a different name or username."
        />
      )}
      {!compact && (
        <LoadMore
          hasNext={query.hasNextPage}
          isLoading={query.isFetchingNextPage}
          error={query.isFetchNextPageError ? query.error : null}
          onClick={() => query.fetchNextPage()}
        />
      )}
    </>
  );
}
export function PeopleDialog({
  path,
  title,
  onClose,
}: {
  path: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="people-dialog">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">
          People in this list. Open a profile or follow a user.
        </DialogDescription>
        <div className="people-scroll">
          <UserResults path={path} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
export async function share(path: string) {
  const url = window.location.origin + path;
  try {
    if (navigator.share) await navigator.share({ title: "Sociality", url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard.");
    }
  } catch (e) {
    if (!(e instanceof DOMException && e.name === "AbortError"))
      toast.error("Could not share. Copy the link from your address bar.");
  }
}
