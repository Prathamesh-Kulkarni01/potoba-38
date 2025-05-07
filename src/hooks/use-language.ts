import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export const useLanguage = () => {
  const { i18n, t } = useTranslation();
  const { toast } = useToast();

  const changeLanguage = useCallback(async (newLanguage: string) => {
    console.log('Attempting to change language to:', newLanguage);
    console.log('Current language before change:', i18n.language);
    console.log('Available languages:', i18n.languages);
    
    try {
      await i18n.changeLanguage(newLanguage);
      console.log('Language change successful');
      console.log('New language:', i18n.language);
      console.log('Current translations:', i18n.getResourceBundle(newLanguage, 'translation'));
      
      localStorage.setItem('i18nextLng', newLanguage);
      document.documentElement.lang = newLanguage;
      
      toast({
        description: t('settings.languageChanged', 'Language changed successfully!'),
      });
      
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      toast({
        title: t('settings.error', 'Error'),
        description: t('settings.languageChangeError', 'Failed to change language. Please try again.'),
        variant: "destructive",
      });
      return false;
    }
  }, [i18n, t, toast]);

  const getCurrentLanguage = useCallback(() => {
    const currentLang = i18n.language || 'en';
    console.log('Getting current language:', currentLang);
    return currentLang;
  }, [i18n]);

  return {
    currentLanguage: getCurrentLanguage(),
    changeLanguage,
    t,
  };
}; 