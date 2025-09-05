import { initBackground } from '@/background/init';

export default defineBackground(() => {
  initBackground();
  console.log('Background initialized', { id: browser.runtime.id });
});
