import type { Metadata } from "next";
import Providers from "@/components/sociality/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Sociality — Share your moments",
    template: "%s | Sociality",
  },
  description:
    "Connect with your people. Share photos, discover moments, and keep the memories you love.",
  icons: { icon: "/design/7e105.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
