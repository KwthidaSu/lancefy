import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { resources } from './resources'

const storedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('lang') : null

const initialLanguage =
  storedLanguage === 'th' || storedLanguage === 'en' ? storedLanguage : 'en'

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLanguage,
    fallbackLng: 'en',
    ns: ['common', 'auth', 'errors'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
