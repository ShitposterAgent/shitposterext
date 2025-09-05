import browser from 'wxt/browser';

export type Cmd = string;

export function sendCmd<T = any>(cmd: Cmd, data?: any): Promise<T> {
  return browser.runtime.sendMessage({ cmd, data });
}

export function sendTabCmd<T = any>(
  tabId: number,
  cmd: Cmd,
  data?: any,
  opts?: { frameId?: number },
): Promise<T> {
  return browser.tabs.sendMessage(tabId, { cmd, data }, opts);
}

export function sendCmdDirectly<T = any>(cmd: Cmd, data?: any): Promise<T> {
  // MV3 service worker has no getBackgroundPage; always route via messaging
  return sendCmd<T>(cmd, data);
}
