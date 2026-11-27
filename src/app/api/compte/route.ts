import { NextResponse } from "next/server";
import { deleteSignedInAccount } from "@/server/delete-account";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const confirm = body && typeof body === "object" && "confirm" in body ? String(body.confirm ?? "") : "";
  const result = await deleteSignedInAccount(confirm);
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ ok: true });
}
