declare global {
  interface Window {
    $crisp?: Array<[string, ...unknown[]]>;
  }
}

/** Shows and opens the chat. `$crisp` is a command queue, so this works before Crisp loads. */
export function openCrispChat() {
  window.$crisp = window.$crisp ?? [];
  // The bubble may be hidden on this page: show it before opening the chat.
  window.$crisp.push(["do", "chat:show"]);
  window.$crisp.push(["do", "chat:open"]);
}
