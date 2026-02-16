import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Cairo } from "next/font/google";
import { routing } from '@/i18n/routing';
import "../globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const messages = await getMessages({ locale });
  
  // Helper to get nested translation value
  const getTranslation = (messages: any, key: string): string => {
    const keys = key.split('.');
    let value: any = messages;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    return typeof value === 'string' ? value : key;
  };

  const title = getTranslation(messages, 'Metadata.title');
  const description = getTranslation(messages, 'Metadata.description');

  return {
    title,
    description,
    icons: {
      icon: '/assets/logo-round.png',
    },
    openGraph: {
      title,
      description,
      images: ['https://trends-poc.netlify.app/assets/TRENDS-Logo-text.png'],
      type: 'website',
      url: 'https://trends-poc.netlify.app',
    },
    twitter: {
      card: 'summary' as const,
      title,
      description,
      images: ['https://trends-poc.netlify.app/assets/TRENDS-Logo-text.png'],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  
  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({ locale });

  // Set direction based on locale
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${cairo.variable} antialiased`} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

