import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('sak_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('sak_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  /**
   * Helper to retrieve localized product name
   */
  const getLocalizedName = (product) => {
    if (!product) return '';
    if (lang === 'ms' && product.name_ms) return product.name_ms;
    if (lang === 'ta' && product.name_ta) return product.name_ta;
    return product.name;
  };

  /**
   * Helper to retrieve localized product description
   */
  const getLocalizedDesc = (product) => {
    if (!product) return '';
    if (lang === 'ms' && product.description_ms) return product.description_ms;
    if (lang === 'ta' && product.description_ta) return product.description_ta;
    return product.description || '';
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, getLocalizedName, getLocalizedDesc }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
