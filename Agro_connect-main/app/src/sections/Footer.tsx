import {
  Sprout,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Heart,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Section } from '../App';
import { useLanguageStore } from '../stores/languageStore';

interface FooterProps {
  onNavigate: (section: Section) => void;
}

const quickLinks = (t: any) => [
  { label: t('nav.farmHealth'), section: 'farm-health' as Section },
  { label: t('nav.market'), section: 'market-intelligence' as Section },
  { label: t('nav.tools'), section: 'tools-lending' as Section },
  { label: t('nav.marketplace') || 'Marketplace', section: 'marketplace' as Section },
  { label: t('nav.schemes'), section: 'government-schemes' as Section },
];

const supportLinks = (t: any) => [
  { label: 'Help Center', href: '#' },
  { label: 'FAQs', href: '#' },
  { label: 'Contact Us', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer({ onNavigate }: FooterProps) {
  const { t } = useLanguageStore();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">AgroConnect</span>
            </div>
            <p className="text-gray-400 mb-4">
              {t('footer.motto')}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2">
              {quickLinks(t).map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => onNavigate(link.section)}
                    className="text-gray-400 hover:text-green-400 transition-colors flex items-center gap-1 text-left"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2">
              {supportLinks(t).map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-green-400 transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.stayUpdated')}</h3>
            <p className="text-gray-400 mb-4">
              {t('footer.newsletterDesc')}
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('footer.newsletterPlaceholder')}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid sm:grid-cols-3 gap-6 mt-12 pt-8 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('footer.helpline')}</p>
              <p className="font-medium">1800-XXX-XXXX</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('footer.email') || 'Email'}</p>
              <p className="font-medium">support@agroconnect.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('footer.address') || 'Address'}</p>
              <p className="font-medium">New Delhi, India</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © 2024 AgroConnect. {t('footer.rights')}
            </p>
            <p className="text-gray-400 text-sm flex items-center gap-1">
              {t('footer.madeWith')} <Heart className="w-4 h-4 text-red-500 fill-red-500" /> {t('footer.forFarmers')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
