export type WeddingSide = {
  id: string;
  createdAt: string;
  hasCouple: boolean;
};

export function chooseKeptWedding(left: WeddingSide, right: WeddingSide) {
  if (left.hasCouple !== right.hasCouple) {
    const keep = left.hasCouple ? left : right;
    const drop = left.hasCouple ? right : left;
    return { keep: keep.id, drop: drop.id };
  }
  const keep = left.createdAt <= right.createdAt ? left : right;
  const drop = keep.id === left.id ? right : left;
  return { keep: keep.id, drop: drop.id };
}

export function messageNotice(sender: string, body: string) {
  const name = sender.trim() || "Quelqu'un";
  const text = body.trim();
  return `${name} : ${text}`.slice(0, 180);
}
