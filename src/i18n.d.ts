import 'react-i18next';
import type en from './locales/en.json';

// Type augmentation so that `t('...')` calls are checked against the real
// translation keys at compile time. The shape is derived from en.json (the
// canonical base locale); all other locales must keep key parity with it.
//
// Run `pnpm typecheck` (tsc --noEmit) to catch missing/unknown keys. When new
// keys are added to en.json this file automatically picks them up — no manual
// sync needed beyond keeping the JSON valid.
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
