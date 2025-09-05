import browser from 'wxt/browser';

export type CommandHandler = (
  data: any,
  sender?: browser.Runtime.MessageSender,
) => Promise<any> | any;

const commands = new Map<string, CommandHandler>();

export function addPublicCommand(name: string, handler: CommandHandler) {
  commands.set(name, handler);
}

export function initBackground() {
  // Register a minimal handler so content bootstrap can proceed
  if (!commands.has('GetInjected')) {
    addPublicCommand('GetInjected', ({ url }) => {
      return { url, scripts: [], injectInto: 'content' };
    });
  }

  browser.runtime.onMessage.addListener((msg: any, sender) => {
    const { cmd, data } = msg || {};
    const handler = commands.get(cmd);
    if (!handler) return; // no-op to allow other listeners
    return handler(data, sender);
  });
}

export function initBackground() {
  browser.runtime.onMessage.addListener((msg: any, sender) => {
    const { cmd, data } = msg || {};
    const handler = commands.get(cmd);
    if (!handler) return; // no-op to allow other listeners
    return handler(data, sender);
  });
}
