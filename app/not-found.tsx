import Link from "next/link";
export default function NotFound() {
  return (
    <main className="empty-state">
      <h1>Page not found</h1>
      <p>This page may have moved or the link is incorrect.</p>
      <Link className="text-link" href="/">
        Back to Sociality
      </Link>
    </main>
  );
}
