import { expect, test, type Page } from "@playwright/test";
import { passVendorWelcome, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("un devis devient une facture et l'acompte se relance sans Stripe", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `devis.${stamp}@vow.test`;
  await signUp(page, { name: "Camille Devis", email, role: "Prestataire" });
  await passVendorWelcome(page, `Studio ${stamp}`);
  await expect(page.getByRole("heading", { name: "Votre page publique" })).toBeVisible();
  await page.getByLabel("Nom commercial").fill(`Studio ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page
    .getByLabel("Présentation")
    .fill("Reportage de mariage en lumière naturelle, du matin jusqu'au bout de la nuit, autour de Bordeaux.");
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine enregistrée.")).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Premier prénom").fill("Inès");
  await page.getByLabel("Second prénom").fill("Paul");
  await page.getByLabel("Date du mariage").fill("2027-05-02");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = page.url().split("/mariage/")[1]?.split("/")[0] ?? "";
  await page.goto(`/mariage/${weddingId}/devis`);
  await expect(page.getByRole("heading", { name: "Devis et factures" })).toBeVisible();

  const quote = page.locator("form").filter({ has: page.getByRole("button", { name: "Créer le devis" }) });
  await quote.getByLabel("Titre").fill("Journée");
  await quote.getByLabel("Montant (€)").fill("1800");
  await quote.getByRole("button", { name: "Créer le devis" }).click();
  await expect(page.getByText(/D-\d{4}-001/)).toBeVisible();

  await page.getByRole("button", { name: "Créer la facture" }).click();
  await expect(page.getByText("En attente")).toBeVisible();
  await page.getByRole("button", { name: "Marquer payée" }).click();
  await expect(page.getByText("Payée")).toBeVisible();

  const due = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const deposit = page.locator("form").filter({ has: page.getByRole("button", { name: "Noter l'acompte" }) });
  await deposit.getByLabel("Montant (€)").fill("400");
  await deposit.getByLabel("Échéance").fill(due);
  await deposit.getByRole("button", { name: "Noter l'acompte" }).click();
  await expect(page.getByText("À venir")).toBeVisible();
  await expect(page.getByText("Paiement en ligne fermé.")).toBeVisible();

  const cron = await request.get("/api/cron/deposits");
  expect(cron.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByText("Relancé")).toBeVisible();
});

async function signUp(page: Page, input: { name: string; email: string; role: "Prestataire" | "Couple" }) {
  await page.goto("/inscription");
  await revealPasswordSignup(page, input.role);
  await page.getByLabel("Nom complet").fill(input.name);
  await page.getByLabel("E-mail").fill(input.email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: input.role }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
}
