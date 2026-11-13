export type ThreadMessage = {
  id: string;
  authorId: string;
  vendorUserId: string | null;
};

export function messagesToMarkRead(messages: ThreadMessage[], viewerId: string, alreadyRead: ReadonlySet<string>): string[] {
  return messages.filter((message) => message.authorId !== viewerId && !alreadyRead.has(message.id)).map((message) => message.id);
}

export function unreadMessageCount(messages: ThreadMessage[], viewerId: string, alreadyRead: ReadonlySet<string>): number {
  return messagesToMarkRead(messages, viewerId, alreadyRead).length;
}

export function threadHasUnread(
  messages: ThreadMessage[],
  vendorUserId: string,
  viewerId: string,
  alreadyRead: ReadonlySet<string>,
): boolean {
  return messages.some(
    (message) => message.vendorUserId === vendorUserId && message.authorId !== viewerId && !alreadyRead.has(message.id),
  );
}
