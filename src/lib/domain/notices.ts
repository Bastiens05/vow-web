export type NoticeViewerRole = "vendor" | "couple";

export function joinNoticeVisible(input: {
  body: string;
  authorId: string;
  viewerId: string;
  viewerRole: NoticeViewerRole;
  noticeAt: string | null;
  membershipAt: string | null;
}): boolean {
  if (!input.viewerId || input.authorId === input.viewerId) return false;
  if (input.noticeAt && input.membershipAt && input.noticeAt < input.membershipAt) return false;
  if (input.body === "Le couple a rejoint le mariage.") return input.viewerRole === "vendor";
  return true;
}
