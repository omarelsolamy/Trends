'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { MdKeyboardDoubleArrowRight, MdKeyboardDoubleArrowLeft, MdPerson, MdSearch, MdMenu, MdClose } from 'react-icons/md';
import { useTranslations, useLocale } from 'next-intl';
import LocaleSwitcher from './LocaleSwitcher';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const isOpaque = isScrolled || isHovered;

  const textColorClass = isOpaque ? 'text-gray-800' : 'text-white';
  const iconColorClass = isOpaque ? 'text-gray-600' : 'text-white';

  const navLinks = [
    { key: 'aboutTrends', hasDropdown: true },
    { key: 'globalOffices', hasDropdown: false },
    { key: 'research', hasDropdown: true },
    { key: 'publications', hasDropdown: true },
    { key: 'advisory', hasDropdown: false },
    { key: 'globalBarometer', hasDropdown: true },
    { key: 'training', hasDropdown: false },
    { key: 'programs', hasDropdown: true },
    { key: 'events', hasDropdown: true },
  ];

  return (
    <nav
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 pb-4 ${
        isOpaque ? 'bg-white' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto lg:px-10 px-4">
        {/* Top Row - Utility Navigation - Hidden on mobile */}
        <div className="hidden xl:flex justify-end items-center gap-4 h-8 mt-1">
          <a href="#" className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-teal-500 ${textColorClass}`}>
            {t('publishWithUs')}
            <ChevronDown size={16} className={iconColorClass} />
          </a>
          <LocaleSwitcher textColorClass={textColorClass} iconColorClass={iconColorClass} />
          <button className={`transition-colors hover:text-teal-500 ${iconColorClass}`}>
            <MdSearch size={18} />
          </button>
        </div>

        {/* Bottom Row - Logo and Main Navigation */}
        <div className="flex items-center justify-between xl:justify-start h-14 mt-2 relative">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`xl:hidden transition-colors hover:text-teal-500 ${iconColorClass} z-10`}
          >
            {isMobileMenuOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
          </button>

          {/* Logo Section - Centered on Mobile, Left on Desktop */}
          <div className="flex items-center absolute left-1/2 -translate-x-1/2 xl:relative xl:left-auto xl:translate-x-0">
            <Image
              src={
                isOpaque 
                  ? (locale === 'ar' ? '/assets/TRENDS-Logo-B-AR.png' : '/assets/nav-logo.png')
                  : locale === 'ar' 
                    ? '/assets/TRENDS-Logo-W-AR.png' 
                    : '/assets/nav-logo-not-hovered.png'
              }
              alt="TRENDS Research & Advisory"
              width={220}
              height={48}
              priority
              className="h-auto w-40 sm:w-48 xl:w-60 transition-opacity duration-300"
            />
          </div>

          {/* Spacer for Desktop */}
          <div className="hidden xl:block flex-1"></div>

          {/* Desktop Navigation Links */}
          <div className="hidden xl:flex items-center gap-12">
            {navLinks.map((link) => (
              <a
                key={link.key}
                href="#"
                className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-teal-500 ${textColorClass}`}
              >
                {t(link.key)}
                {link.hasDropdown && <ChevronDown size={16} className={iconColorClass} />}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="xl:hidden fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Slider */}
      <div className={`
        xl:hidden fixed top-0 bottom-0 w-[280px] sm:w-[320px] bg-white z-50
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isRTL ? 'right-0' : 'left-0'}
        ${isMobileMenuOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
      `}>
        <div className="px-5 py-4 h-full flex flex-col">
            {/* Header with Logo and Close Button */}
            <div className="flex items-start justify-between mb-5">
              <Image
                src="/assets/logo-round.png"
                alt="TRENDS"
                width={60}
                height={60}
                className="w-[60px] h-[60px]"
              />
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-700 hover:text-gray-900 transition-colors cursor-pointer p-1"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Top Utility Icons */}
            <div className="flex items-center gap-5 mb-5 text-gray-700">
              <LocaleSwitcher textColorClass="text-gray-700" iconColorClass="text-gray-700" />
              <button className="hover:text-teal-600 transition-colors">
                <MdPerson size={18} />
              </button>
              <button className="hover:text-teal-600 transition-colors">
                <MdSearch size={18} />
              </button>
            </div>

            {/* Main Navigation Links */}
            <nav className="space-y-0 flex-1 overflow-y-auto">
              {navLinks.map((link) => (
                <a
                  key={link.key}
                  href="#"
                  className="flex items-center gap-2 py-2.5 text-gray-800 hover:text-teal-600 transition-colors"
                >
                  <span className="text-sm font-medium">{t(link.key)}</span>
                  {link.hasDropdown && (
                    isRTL ? (
                      <MdKeyboardDoubleArrowLeft size={18} className="text-gray-600" />
                    ) : (
                      <MdKeyboardDoubleArrowRight size={18} className="text-gray-600" />
                    )
                  )}
                </a>
              ))}
              
              {/* Publish with Us */}
              <a
                href="#"
                className="flex items-center gap-2 py-2.5 text-gray-800 hover:text-teal-600 transition-colors"
              >
                <span className="text-sm font-medium">{t('publishWithUs')}</span>
                {isRTL ? (
                  <MdKeyboardDoubleArrowLeft size={18} className="text-gray-600" />
                ) : (
                  <MdKeyboardDoubleArrowRight size={18} className="text-gray-600" />
                )}
              </a>
            </nav>

            {/* Separator */}
            <div className="h-px bg-gray-300 my-3" />

            {/* Contact Us */}
            <a
              href="#"
              className="block py-2.5 text-gray-800 hover:text-teal-600 transition-colors mb-4"
            >
              <span className="text-sm font-medium">{t('contactUs')}</span>
            </a>
          </div>
        </div>
    </nav>
  );
}
