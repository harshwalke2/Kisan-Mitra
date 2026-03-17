import { ChevronDown, Languages, Leaf, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState('en');

  const languageOptions = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'mr', label: 'मराठी' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'ur', label: 'اردو' }
  ];

  useEffect(() => {
    const savedLangCode = localStorage.getItem('kisan_lang_code') || 'en';
    const savedLangLabel = localStorage.getItem('kisan_lang_label') || 'English';
    setSelectedLanguageCode(savedLangCode);
    setSelectedLanguage(savedLangLabel);

    window.googleTranslateElementInit = () => {
      const container = document.getElementById('google_translate_element');
      if (!container || container.childElementCount > 0) {
        return;
      }

      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,hi,mr,ta,te,kn,ml,gu,pa,bn,or,ur',
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
          },
          'google_translate_element'
        );
      }
    };

    const existingScript = document.querySelector(
      'script[src*="translate.google.com/translate_a/element.js"]'
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }

    const cookieLanguage = savedLangCode === 'en' ? '/en/en' : `/en/${savedLangCode}`;
    document.cookie = `googtrans=${cookieLanguage};path=/`;
    if (window.location.hostname) {
      document.cookie = `googtrans=${cookieLanguage};path=/;domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieLanguage};path=/;domain=.${window.location.hostname}`;
    }
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLanguageChange = (languageCode, languageLabel) => {
    if (languageCode === selectedLanguageCode) {
      setLanguageOpen(false);
      return;
    }

    const cookieLanguage = languageCode === 'en' ? '/en/en' : `/en/${languageCode}`;
    document.cookie = `googtrans=${cookieLanguage};path=/`;
    if (window.location.hostname) {
      document.cookie = `googtrans=${cookieLanguage};path=/;domain=${window.location.hostname}`;
      document.cookie = `googtrans=${cookieLanguage};path=/;domain=.${window.location.hostname}`;
    }

    localStorage.setItem('kisan_lang_code', languageCode);
    localStorage.setItem('kisan_lang_label', languageLabel);

    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = languageCode;
      combo.dispatchEvent(new Event('change'));
    }

    setSelectedLanguageCode(languageCode);
    setSelectedLanguage(languageLabel);
    setLanguageOpen(false);

    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <Leaf size={28} />
          <span>KISAN</span>
        </Link>

        <button className="menu-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <ul className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
          <li><Link to="/" onClick={() => setIsMenuOpen(false)}>Home</Link></li>
          <li><Link to="/recommend" onClick={() => setIsMenuOpen(false)}>Get Recommendation</Link></li>
          <li><Link to="/market-insights" onClick={() => setIsMenuOpen(false)}>Market Insights</Link></li>
          <li><Link to="/global-market" onClick={() => setIsMenuOpen(false)}>Global Market</Link></li>
          <li><Link to="/government-schemes" onClick={() => setIsMenuOpen(false)}>Government Schemes</Link></li>
          <li className="translate-item">
            <button
              type="button"
              className="translate-button"
              onClick={() => setLanguageOpen(!languageOpen)}
            >
              <Languages size={16} />
              <span>{selectedLanguage}</span>
              <ChevronDown size={14} className={languageOpen ? 'rotate' : ''} />
            </button>

            {languageOpen && (
              <div className="language-dropdown">
                {languageOptions.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    className={`language-option ${selectedLanguage === language.label ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(language.code, language.label)}
                  >
                    {language.label}
                  </button>
                ))}
              </div>
            )}

            <div id="google_translate_element" className="google-translate-container"></div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
