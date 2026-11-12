import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClientDocumentSettings } from "@/components/account/client-document-settings";
import { DocumentRequestList } from "@/components/wedding/document-requests";
import { Card } from "@/components/ui/card";
import { documentSuggestions } from "@/lib/domain/client-documents";

export const metadata: Metadata = { title: "Aperçu des documents demandés" };

export default function DocumentPreviewPage() {
  if (process.env.SCREENSHOT_PREVIEWS !== "true") notFound();
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 bg-ivory px-5 py-8 text-ink">
      <div id="apercu-reglages">
      <Card>
        <ClientDocumentSettings
          templates={[
            {
              id: "piece",
              title: "Pièce d'identité des mariés",
              note: "Un scan lisible, recto verso.",
              required: true,
              offsetDays: -30,
            },
          ]}
          suggestions={documentSuggestions("photographer")}
        />
      </Card>
      </div>
      <div id="apercu-couple">
      <Card>
        <DocumentRequestList
          weddingId="00000000-0000-0000-0000-000000000001"
          userId="00000000-0000-0000-0000-000000000002"
          vendorName="Studio Camille · Photographe"
          mode="couple"
          requests={[
            {
              id: "a",
              title: "Pièce d'identité des mariés",
              note: "Un scan lisible, recto verso.",
              required: true,
              dueOn: "2027-05-20",
              status: "needed",
              fileName: null,
              correctionNote: "",
            },
            {
              id: "b",
              title: "Plan d'accès au lieu",
              note: "",
              required: true,
              dueOn: "2027-06-05",
              status: "sent",
              fileName: "acces.pdf",
              correctionNote: "",
            },
          ]}
        />
      </Card>
      </div>
      <div id="apercu-prestataire">
      <Card>
        <DocumentRequestList
          weddingId="00000000-0000-0000-0000-000000000001"
          userId="00000000-0000-0000-0000-000000000003"
          vendorName="Studio Camille · Photographe"
          mode="vendor"
          requests={[
            {
              id: "b",
              title: "Plan d'accès au lieu",
              note: "Adresse et parking.",
              required: true,
              dueOn: "2027-06-05",
              status: "sent",
              fileName: "acces.pdf",
              correctionNote: "",
            },
          ]}
        />
      </Card>
      </div>
      <div id="apercu-vide">
      <Card>
        <DocumentRequestList
          weddingId="00000000-0000-0000-0000-000000000001"
          userId="00000000-0000-0000-0000-000000000002"
          vendorName="Atelier Lina · Fleuriste"
          mode="couple"
          requests={[]}
        />
      </Card>
      </div>
    </div>
  );
}
