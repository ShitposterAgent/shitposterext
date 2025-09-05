import { bootstrapContent } from '@/injected/content/index';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    bootstrapContent();
  },
});
