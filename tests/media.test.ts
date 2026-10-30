import { expect, it } from "vitest";
import { imageVariant } from "../lib/sociality/media";
import { isFullPost } from "../lib/sociality/types";
it("handles saved entries without author or counts", () => {
  expect(
    isFullPost({
      id: 1,
      imageUrl: "/photo.png",
      caption: "Saved",
      createdAt: "2026-10-30",
    }),
  ).toBe(false);
});
it("transforms Cloudinary images while retaining other providers", () => {
  expect(
    imageVariant(
      "https://res.cloudinary.com/demo/image/upload/v1/photo.jpg",
      720,
    ),
  ).toContain("/image/upload/f_auto,q_auto,c_limit,w_720/v1/");
  expect(imageVariant("https://example.com/photo.jpg", 720)).toBe(
    "https://example.com/photo.jpg",
  );
});
