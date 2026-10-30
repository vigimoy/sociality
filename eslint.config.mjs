import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "coverage/**", "next-env.d.ts"]),
  {
    // Photos use responsive Cloudinary URLs and srcSet with an original-URL
    // fallback; design SVGs and blob previews use native image elements.
    rules: { "@next/next/no-img-element": "off" },
  },
]);
