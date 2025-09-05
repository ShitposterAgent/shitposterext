import browser from 'wxt/browser';

export type CommandHandler = (
  data: unknown,
  sender?: browser.Runtime.MessageSender,
) => Promise<unknown> | unknown;

const commands = new Map<string, CommandHandler>();

export function addPublicCommand(name: string, handler: CommandHandler) {
  commands.set(name, handler);
}

interface Message {
  cmd: string;
  data?: unknown;
}

export function initBackground() {
  // Register a minimal handler so content bootstrap can proceed
  if (!commands.has('GetInjected')) {
    addPublicCommand('GetInjected', ({ url }: { url: string }) => {
      return { url, scripts: [], injectInto: 'content' };
    });
  }

  browser.runtime.onMessage.addListener((msg: Message, sender) => {
    const { cmd, data } = msg || {};
    const handler = commands.get(cmd);
    if (!handler) return; // no-op to allow other listeners
    return handler(data, sender);
  });
}
