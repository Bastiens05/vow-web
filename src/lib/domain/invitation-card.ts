export function invitationHidesContact(row: {
  invitee_name: string;
  invitee_trade: string;
  invite_source?: string | null;
}): boolean {
  if (row.invite_source === "search") return true;
  if (row.invite_source === "manual") return false;
  return row.invitee_name.trim().length > 0 && row.invitee_trade.trim().length > 0;
}
