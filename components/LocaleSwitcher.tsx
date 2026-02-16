'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { MdLanguage } from 'react-icons/md';
import { useTranslations } from 'next-intl';

interface LocaleSwitcherProps {
  textColorClass: string;
  iconColorClass: string;
}

export default function LocaleSwitcher({ textColorClass, iconColorClass }: LocaleSwitcherProps) {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    router.replace(pathname, { locale: newLocale });
    // Store preference in sessionStorage for future visits
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('preferred-locale', newLocale);
    }
  };

  return (
    <button
      onClick={switchLocale}
      className={`cursor-pointer transition-colors flex items-center gap-1 group ${textColorClass}`}
      aria-label={`Switch to ${locale === 'en' ? 'Arabic' : 'English'}`}
    >
      <MdLanguage size={18} className={`${iconColorClass} group-hover:text-teal-500 transition-colors`} />
      <span className={`text-sm font-medium ${textColorClass} group-hover:text-teal-500 transition-colors`}>{t('language')}</span>
    </button>
  );
}

