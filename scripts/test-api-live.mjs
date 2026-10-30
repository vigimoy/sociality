// Opt-in: creates two synthetic accounts and exercises only their own content.
// The API has no account-delete endpoint. Posts and relationships are cleaned up.
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
if (process.env.RUN_LIVE_API_TESTS !== "1" || !process.env.SOCIALITY_QA_STATE)
  throw new Error(
    "Set RUN_LIVE_API_TESTS=1 and SOCIALITY_QA_STATE to a private file outside the project.",
  );
const base =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://be-social-media-api-production.up.railway.app";
let state = await readFile(process.env.SOCIALITY_QA_STATE, "utf8")
  .then(JSON.parse)
  .catch(() => ({}));
const results = [];
let postId, commentId;
let a, b;
async function request(
  path,
  { token, method = "GET", body, status = 200 } = {},
) {
  const form = body instanceof FormData;
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !form ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const json = await response.json().catch(() => ({}));
  assert.ok(
    Array.isArray(status)
      ? status.includes(response.status)
      : response.status === status,
    `${method} ${path}: expected ${status}, received ${response.status}: ${json.message}`,
  );
  results.push({ method, path, status: response.status });
  console.log(`PASS ${method} ${path}: ${response.status}`);
  return json.data;
}
async function account(key) {
  if (!state[key]) {
    const suffix = Date.now() + "_" + key;
    state[key] = {
      name: "Sociality QA " + key,
      username: "sociality_qa_" + suffix,
      email: `sociality.qa.${suffix}@example.invalid`,
      password: randomUUID() + "Aa1!",
    };
    await writeFile(process.env.SOCIALITY_QA_STATE, JSON.stringify(state));
    await request("/api/auth/register", {
      method: "POST",
      body: state[key],
      status: [200, 201],
    });
  }
  return request("/api/auth/login", {
    method: "POST",
    body: { email: state[key].email, password: state[key].password },
  });
}
const image = () =>
  new Blob(
    [
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=",
        "base64",
      ),
    ],
    { type: "image/png" },
  );
try {
  a = await account("a");
  b = await account("b");
  const token = a.token;
  const user = state.b.username;
  await request("/api/auth/login", {
    method: "POST",
    body: { email: state.a.email, password: "incorrect-password" },
    status: [400, 401],
  });
  await request("/api/me", { status: 401 });
  const profile = await request("/api/me", { token });
  assert.equal(profile.profile.username, state.a.username);
  const edit = new FormData();
  edit.set("name", "Sociality QA A");
  edit.set("bio", "Synthetic acceptance-test account.");
  edit.set("avatar", image(), "qa-avatar.png");
  await request("/api/me", { method: "PATCH", token, body: edit });
  assert.equal(
    (await request("/api/me", { token })).profile.bio,
    "Synthetic acceptance-test account.",
  );
  await request("/api/users/search?q=" + encodeURIComponent(user));
  await request("/api/users/" + user);
  const form = new FormData();
  form.set("image", image(), "qa-pixel.png");
  form.set("caption", "Sociality QA — temporary acceptance test");
  const created = await request("/api/posts", {
    method: "POST",
    token,
    body: form,
    status: [200, 201],
  });
  postId = created.id;
  assert.ok(postId);
  const p = "/api/posts/" + postId;
  assert.equal((await request(p)).id, postId);
  await request("/api/posts?page=1&limit=12");
  await request("/api/posts?page=2&limit=12");
  assert.ok(
    (await request("/api/me/posts", { token })).items.some(
      (x) => x.id === postId,
    ),
  );
  await request("/api/users/" + state.a.username + "/posts");
  await request("/api/feed", { token });
  await request(p + "/like", { method: "POST", token });
  await request(p + "/like", { method: "POST", token });
  assert.equal((await request(p, { token })).likeCount, 1);
  assert.ok(
    (await request(p + "/likes", { token })).users.some(
      (x) => x.id === a.user.id,
    ),
  );
  assert.ok(
    (await request("/api/me/likes", { token })).posts.some(
      (x) => x.id === postId,
    ),
  );
  await request("/api/users/" + state.a.username + "/likes");
  await request(p + "/save", { method: "POST", token });
  await request(p + "/save", { method: "POST", token });
  assert.equal(
    (await request("/api/me/saved", { token })).posts.filter(
      (x) => x.id === postId,
    ).length,
    1,
  );
  const comment = await request(p + "/comments", {
    method: "POST",
    token,
    body: { text: "QA comment" },
    status: [200, 201],
  });
  commentId = comment.id;
  assert.ok(commentId);
  assert.ok(
    (await request(p + "/comments")).comments.some((x) => x.id === commentId),
  );
  assert.equal((await request(p, { token })).commentCount, 1);
  await request("/api/comments/" + commentId, {
    method: "DELETE",
    token: b.token,
    status: [401, 403, 404],
  });
  await request(p, {
    method: "DELETE",
    token: b.token,
    status: [401, 403, 404],
  });
  await request("/api/follow/" + user, { method: "POST", token });
  await request("/api/follow/" + user, { method: "POST", token });
  assert.equal(
    (await request("/api/users/" + user, { token })).counts.followers,
    1,
  );
  await request("/api/users/" + user + "/followers");
  await request("/api/users/" + user + "/following");
  await request("/api/me/followers", { token });
  assert.ok(
    (await request("/api/me/following", { token })).users.some(
      (x) => x.username === user,
    ),
  );
  await request("/api/follow/" + user, { method: "DELETE", token });
  await request("/api/follow/" + user, { method: "DELETE", token });
  await request(p + "/like", { method: "DELETE", token });
  await request(p + "/like", { method: "DELETE", token });
  assert.equal((await request(p, { token })).likeCount, 0);
  await request(p + "/save", { method: "DELETE", token });
  await request(p + "/save", { method: "DELETE", token });
  assert.ok(
    !(await request("/api/me/saved", { token })).posts.some(
      (x) => x.id === postId,
    ),
  );
  await request("/api/comments/" + commentId, { method: "DELETE", token });
  commentId = undefined;
  assert.equal((await request(p, { token })).commentCount, 0);
  if (process.env.KEEP_QA_POST === "1") {
    state.postId = postId;
    await writeFile(process.env.SOCIALITY_QA_STATE, JSON.stringify(state));
    postId = undefined;
  }
} finally {
  if (commentId && a)
    await request("/api/comments/" + commentId, {
      method: "DELETE",
      token: a.token,
    });
  if (postId && a) {
    await request("/api/posts/" + postId, { method: "DELETE", token: a.token });
    await request("/api/posts/" + postId, { status: 404 });
  }
  if (a && b)
    await request("/api/follow/" + state.b.username, {
      method: "DELETE",
      token: a.token,
    });
  if (process.env.SOCIALITY_QA_REPORT)
    await writeFile(
      process.env.SOCIALITY_QA_REPORT,
      JSON.stringify({ at: new Date().toISOString(), results }, null, 2),
    );
}
console.log(`Completed ${results.length} API assertions.`);
