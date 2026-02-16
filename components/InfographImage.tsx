'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import ImageModal from './ImageModal';

function normalizeBase64(input: string): string {
  const trimmed = input.trim();
  const dataUrlMatch = trimmed.match(/^data:image\/[^;]+;base64,(.+)$/i);
  const raw = dataUrlMatch ? dataUrlMatch[1] : trimmed;
  return raw.replace(/\s/g, '');
}

function base64ToObjectUrl(base64: string, mimeType: string): string {
  const normalized = normalizeBase64(base64);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

interface InfographImageProps {
  imageBase64: string;
  alt?: string;
  className?: string;
  mimeType?: string;
}

export default function InfographImage({
  imageBase64,
  alt = 'Infograph',
  className = '',
  mimeType = 'image/png',
}: InfographImageProps) {
  const t = useTranslations('Chat');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const raw = typeof imageBase64 === 'string' ? imageBase64 : '';
    if (!raw.trim()) return;
    setError(null);
    try {
      const url = base64ToObjectUrl(raw, mimeType);
      setObjectUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setObjectUrl(null);
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to decode image');
      setObjectUrl(null);
    }
  }, [imageBase64, mimeType]);

  if (error) {
    return (
      <div className={`text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 ${className}`}>
        Image could not be loaded: {error}
      </div>
    );
  }

  if (!objectUrl) {
    return (
      <div className={`rounded-xl bg-gray-100 animate-pulse min-h-[120px] flex items-center justify-center text-[#828282] text-sm ${className}`}>
        Loading image…
      </div>
    );
  }

  return (
    <>
      <div
        className={`group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-lg ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={objectUrl}
          alt={alt}
          className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
          loading="lazy"
        />
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 bg-white/90 text-[#1F263D] text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            {t('infograph.clickToEnlarge')}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ImageModal
          src={objectUrl}
          alt={alt}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
