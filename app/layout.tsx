export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Next.js requires a root layout, but next-intl handles the actual html/body in [locale]/layout
  // This is a pass-through layout
  return <>{children}</>;
}
