import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Sprout,
  TrendingUp,
  Wrench,
  ShoppingCart,
  MessageCircle,
  Shield,
  Brain,
  CloudSun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Section } from '../App';

interface HeroProps {
  onNavigate: (section: Section) => void;
}

const features = (t: any) => [
  {
    icon: Brain,
    title: t('hero.feature.farmHealth'),
    description: t('hero.feature.farmHealthDesc'),
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: TrendingUp,
    title: t('hero.feature.market'),
    description: t('hero.feature.marketDesc'),
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Wrench,
    title: t('hero.feature.tools'),
    description: t('hero.feature.toolsDesc'),
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: ShoppingCart,
    title: t('hero.feature.marketplace'),
    description: t('hero.feature.marketplaceDesc'),
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: MessageCircle,
    title: t('hero.feature.community'),
    description: t('hero.feature.communityDesc'),
    color: 'from-rose-500 to-red-500'
  },
  {
    icon: Shield,
    title: t('hero.feature.schemes'),
    description: t('hero.feature.schemesDesc'),
    color: 'from-indigo-500 to-violet-500'
  }
];

const stats = (t: any) => [
  { value: '50,000+', label: t('hero.stats.farmers') },
  { value: '₹100Cr+', label: t('hero.stats.sales') },
  { value: '10,000+', label: t('hero.stats.tools') },
  { value: '25+', label: t('hero.stats.states') }
];

import { useLanguageStore } from '../stores/languageStore';

interface HeroProps {
  onNavigate: (section: Section) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  const { t } = useLanguageStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const heroImages = [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200',
    'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=1200',
    'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1200'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Images with Overlay */}
      <div className="absolute inset-0">
        {heroImages.map((img, index) => (
          <div
            key={img}
            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <img
              src={img}
              alt={`Farm ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 backdrop-blur-sm">
                <CloudSun className="w-3 h-3 mr-1" />
                {t('hero.aiPlatform')}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-sm">
                {t('hero.madeInIndia')}
              </Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              {t('hero.title').split('Brighter Tomorrow')[0]}
              <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                {t('hero.title').includes('Brighter Tomorrow') ? 'Brighter Tomorrow' : ''}
                {t('hero.title').includes('उद्याच्या चांगल्या भविष्यासाठी') ? 'उद्याच्या चांगल्या भविष्यासाठी' : ''}
                {t('hero.title').includes('बेहतर कल के लिए') ? 'बेहतर कल के लिए' : ''}
              </span>
            </h1>

            <p className="text-lg text-gray-300 max-w-xl">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={() => onNavigate('dashboard')}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8"
              >
                {t('hero.getStarted')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-white/10">
              {stats(t).map((stat, index) => (
                <div key={index} className="text-center sm:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {features(t).map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  onClick={() => {
                    const sectionMap: Record<string, Section> = {
                      [t('hero.feature.farmHealth')]: 'farm-health',
                      [t('hero.feature.market')]: 'market',
                      [t('hero.feature.tools')]: 'tools-lending',
                      [t('hero.feature.marketplace')]: 'market',
                      [t('hero.feature.community')]: 'chat',
                      [t('hero.feature.schemes')]: 'government-schemes'
                    };
                    onNavigate(sectionMap[feature.title] || 'home');
                  }}
                  className="group cursor-pointer bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-300 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
