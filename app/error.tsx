"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="empty-state" role="alert">
      <h1>Something went wrong</h1>
      <p>Please try opening this page again.</p>
      <button className="text-link" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
