import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Trends",
  description: "Smart AI Assistant",
  manifest: "/manifest.json", // 👈 هذا هو الرابط بملف الإعدادات
  icons: {
    apple: "/logo.png", // أيقونة الآيفون
    icon: "/logo.png",  // الأيقونة العامة
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff", // لون شريط الحالة في الموبايل
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // يمنع التكبير ليعطي شعور التطبيق الحقيقي
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js requires a root layout, but next-intl handles the actual html/body in [locale]/layout
  // This is a pass-through layout
  return <>{children}</>;
}
