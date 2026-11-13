export function enterSendsMessage(
  event: { key: string; shiftKey: boolean; isComposing: boolean; keyCode?: number; repeat?: boolean },
  options: { touchKeyboard: boolean },
): boolean {
  if (options.touchKeyboard) return false;
  if (event.repeat) return false;
  if (event.isComposing || event.keyCode === 229) return false;
  return event.key === "Enter" && !event.shiftKey;
}

/** One send at a time. A second Enter in the same moment is ignored. */
export function acceptMessageSubmit(input: { body: string; pending: boolean; locked: boolean }): boolean {
  if (input.pending || input.locked) return false;
  return input.body.trim().length > 0;
}

export function hasTouchKeyboard(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
