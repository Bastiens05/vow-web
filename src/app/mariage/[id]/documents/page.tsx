import type { Metadata } from "next";
import { DocumentManager } from "@/components/wedding/document-manager";
import { Card } from "@/components/ui/card";
import { getWeddingSpace, listDocuments } from "@/server/data";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const documents = await listDocuments(id);
  const names = Object.fromEntries(space.members.map((member) => [member.userId, member.fullName]));
  return (
    <Card>
      <h2 className="font-semibold tracking-tight text-3xl">Documents</h2>
      <p className="mt-1 mb-5 text-sm text-muted">Visibles uniquement par les membres de ce mariage.</p>
      <DocumentManager weddingId={id} userId={space.session.userId} documents={documents} names={names} />
    </Card>
  );
}
