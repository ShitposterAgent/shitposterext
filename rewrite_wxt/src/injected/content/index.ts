import { sendCmd } from '@/common/messaging';

export async function bootstrapContent() {
  try {
    const url = location.href;
    await sendCmd('GetInjected', { url });
  } catch (e) {
    // swallow for now
  }
}
