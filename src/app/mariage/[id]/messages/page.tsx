import type { Metadata } from "next";
import { MessageThread } from "@/components/wedding/message-thread";
import { Card } from "@/components/ui/card";
import { getWeddingSpace, listMessages } from "@/server/data";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const messages = await listMessages(id, space.session.userId);
  return (
    <Card>
      <h2 className="mb-4 font-serif text-3xl">Conversation</h2>
      <MessageThread weddingId={id} messages={messages} />
    </Card>
  );
}
