import browser from 'wxt/browser';

export type Cmd = string;

export function sendCmd<T = unknown>(cmd: Cmd, data?: unknown): Promise<T> {
  return browser.runtime.sendMessage({ cmd, data });
}

export function sendTabCmd<T = unknown>(
  tabId: number,
  cmd: Cmd,
  data?: unknown,
  opts?: { frameId?: number },
): Promise<T> {
  return browser.tabs.sendMessage(tabId, { cmd, data }, opts);
}

export function sendCmdDirectly<T = unknown>(cmd: Cmd, data?: unknown): Promise<T> {
  // MV3 service worker has no getBackgroundPage; always route via messaging
  return sendCmd<T>(cmd, data);
}
