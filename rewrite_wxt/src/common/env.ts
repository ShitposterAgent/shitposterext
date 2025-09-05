export const IS_FIREFOX =
  typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
export const CHROME = !IS_FIREFOX;
export const FIREFOX = IS_FIREFOX;
export const extensionOrigin =
  typeof location !== 'undefined'
    ? `${location.protocol}//${location.host}`
    : '';
