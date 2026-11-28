export function invitationHidesContact(row: {
  invitee_name: string;
  invitee_trade: string;
  conceal_contact?: boolean | null;
}): boolean {
  if (typeof row.conceal_contact === "boolean") return row.conceal_contact;
  return row.invitee_name.trim().length > 0 && row.invitee_trade.trim().length > 0;
}
