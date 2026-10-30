// Keep the original URL for providers without an image transformation API.
export function imageVariant(url: string, width: number): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname !== "res.cloudinary.com" ||
      !parsed.pathname.includes("/image/upload/")
    )
      return url;
    parsed.pathname = parsed.pathname.replace(
      "/image/upload/",
      `/image/upload/f_auto,q_auto,c_limit,w_${width}/`,
    );
    return parsed.toString();
  } catch {
    return url;
  }
}
