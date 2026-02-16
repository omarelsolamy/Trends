import Navbar from '@/components/Navbar';
import HeroCarousel from '@/components/HeroCarousel';
import FeaturedArticles from '@/components/FeaturedArticles';
import ChatButton from '@/components/ChatButton';

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <HeroCarousel />
      <FeaturedArticles />
      <ChatButton />
    </main>
  );
}

