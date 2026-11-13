export function enterSendsMessage(
  event: { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number; repeat?: boolean },
  options: { touchKeyboard: boolean },
): boolean {
  if (options.touchKeyboard) return false;
  if (event.repeat) return false;
  if (event.isComposing || event.keyCode === 229) return false;
  return event.key === "Enter" && !event.shiftKey;
}

export function hasTouchKeyboard(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
