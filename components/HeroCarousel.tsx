'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import 'swiper/css';
import 'swiper/css/pagination';

export default function HeroCarousel() {
  const t = useTranslations('Articles');
  
  const slides = [
    {
      image: '/assets/US-china-Snapshot.jpg',
      slideKey: 'slide1',
    },
    {
      image: '/assets/Ivory-Coast-Election.jpg',
      slideKey: 'slide2',
    },
    {
      image: '/assets/Deconstructing-the-core-ideas-of-extremism.jpg',
      slideKey: 'slide3',
    },
  ];
  return (
    <div className="relative h-screen w-full">
      <Swiper
        modules={[Autoplay, Pagination]}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{
          clickable: true,
          bulletClass: 'swiper-pagination-bullet',
          bulletActiveClass: 'swiper-pagination-bullet-active',
        }}
        loop={true}
        className="h-full w-full hero-swiper"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="relative h-full w-full">
              {/* Background Image */}
              <Image
                src={slide.image}
                alt={t(`hero.${slide.slideKey}.headline`)}
                fill
                className="object-cover"
                priority={index === 0}
              />

              {/* Top Shadow Overlay */}
              <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-b from-black/60 via-black/60 to-transparent pointer-events-none" />
              
              {/* Bottom Shadow Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-80 bg-linear-to-t from-black/80 via-black/50 to-transparent pointer-events-none" />

              {/* Content Overlay - Using logical properties for natural RTL/LTR flow */}
              <div 
                className="absolute bottom-10 z-10"
                style={{ 
                  insetInlineStart: 'clamp(2rem, 7vw, 7rem)',
                }}
              >
                {/* Tag */}
                <div className="inline-block bg-[#10656E] text-white px-2 py-1 rounded-sm text-md font-semibold mb-1 shadow-md border-white border">
                  {t(`hero.${slide.slideKey}.tag`)}
                </div>

                {/* Headline */}
                <h1 className="text-white text-2xl md:text-4xl font-bold mb-2 leading-tight max-sm:max-w-[80%]">
                  {t(`hero.${slide.slideKey}.headline`)}
                </h1>

                {/* Date */}
                <p className="text-white text-md font-medium">{t(`hero.${slide.slideKey}.date`)}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

