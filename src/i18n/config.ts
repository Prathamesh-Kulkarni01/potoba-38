import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all translations
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import bnTranslations from './locales/bn.json';
import teTranslations from './locales/te.json';
import mrTranslations from './locales/mr.json';
import taTranslations from './locales/ta.json';
import guTranslations from './locales/gu.json';
import knTranslations from './locales/kn.json';
import mlTranslations from './locales/ml.json';
import paTranslations from './locales/pa.json';

const resources = {
  en: { translation: enTranslations },
  hi: { translation: hiTranslations },
  bn: { translation: bnTranslations },
  te: { translation: teTranslations },
  mr: { translation: mrTranslations },
  ta: { translation: taTranslations },
  gu: { translation: guTranslations },
  kn: { translation: knTranslations },
  ml: { translation: mlTranslations },
  pa: { translation: paTranslations },
};

// Custom formatter to handle missing translations
const customFormatter = (value: string, format: string, lng: string) => {
  if (format === 'auto') {
    // If the text is not found in translations, use it as a key
    const translation = i18n.t(value, { lng });
    if (translation === value) {
      // If translation is same as key, it means translation was not found
      // Store the original text as a new translation
      if (!resources[lng]) {
        resources[lng] = { translation: {} };
      }
      resources[lng].translation[value] = value;
      return value;
    }
    return translation;
  }
  return value;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
      format: customFormatter,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    saveMissing: true, // Enable saving missing translations
    missingKeyHandler: (lng, ns, key, fallbackValue) => {
      // Store missing translations in localStorage
      const missingTranslations = JSON.parse(localStorage.getItem('missingTranslations') || '{}');
      if (!missingTranslations[lng]) {
        missingTranslations[lng] = {};
      }
      missingTranslations[lng][key] = fallbackValue;
      localStorage.setItem('missingTranslations', JSON.stringify(missingTranslations));
    },
  });

export default i18n; 