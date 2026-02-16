'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function FeaturedArticles() {
  const t = useTranslations('Articles');
  
  const articles = [
    {
      categoryKey: 'analysis',
      image: '/assets/Deconstructing-the-core-ideas-of-extremism.jpg',
      articleKey: 'article1',
    },
    {
      categoryKey: 'snapshots',
      image: '/assets/US-china-Snapshot.jpg',
      articleKey: 'article2',
    },
  ];
  return (
    <section className="bg-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {articles.map((article, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow duration-300"
            >
              {/* Image - Full Width at Top */}
              <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 w-full">
                <Image
                  src={article.image}
                  alt={t(`featured.${article.articleKey}.headline`)}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Text Content with Generous Padding */}
              <div className="p-4">
                {/* Category - Plain Text */}
                <p className="text-[#157e8a] text-sm font-bold uppercase mb-6">
                  {t(`categories.${article.categoryKey}`)}
                </p>

                {/* Headline */}
                <h2 className="text-lg font-medium text-gray-950 mb-4 leading-snug">
                  {t(`featured.${article.articleKey}.headline`)}
                </h2>
                
                {/* Author and Date */}
                <div className="flex items-start gap-2 text-black text-sm flex-col">
                  {article.articleKey === 'article1' && (
                    <>
                      <span>{t(`featured.${article.articleKey}.author`)}</span>
                      
                    </>
                  )}
                  <span>{t(`featured.${article.articleKey}.date`)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
