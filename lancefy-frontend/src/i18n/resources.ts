import enCommon from '../locales/en/common.json'
import enAuth from '../locales/en/auth.json'
import enErrors from '../locales/en/errors.json'

import thCommon from '../locales/th/common.json'
import thAuth from '../locales/th/auth.json'
import thErrors from '../locales/th/errors.json'

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    errors: enErrors,
  },
  th: {
    common: thCommon,
    auth: thAuth,
    errors: thErrors,
  },
} as const

export type AppLanguage = keyof typeof resources
