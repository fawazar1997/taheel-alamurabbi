import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "تأهيل المربي | إدارة الجهات",
  description: "نظام إدارة ومتابعة الجهات المشاركة في مشروع تأهيل المربي",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${tajawal.variable} antialiased`}>{children}</body>
    </html>
  );
}
