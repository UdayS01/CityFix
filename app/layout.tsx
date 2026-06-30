import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { GovAuthProvider } from "./lib/gov-auth-context";
import Navbar from "./components/Navbar";
import BackgroundLayer from "./components/BackgroundLayer";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CityFix — Report & Resolve City Issues",
  description: "Track, report, and resolve civic issues in your community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GovAuthProvider>
          <AuthProvider>
            <BackgroundLayer />
            <Navbar />
            <main className="relative z-10 flex-grow">
              {children}
            </main>
          </AuthProvider>
        </GovAuthProvider>
      </body>
    </html>
  );
}
