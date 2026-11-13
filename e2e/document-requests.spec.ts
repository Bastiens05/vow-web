import { expect, test, type Browser, type Page } from "@playwright/test";
import { finishVendorWelcome, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("le couple voit et envoie les documents demandés par son prestataire", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `dossier.${stamp}@vow.test`;
  const coupleEmail = `maries.dossier.${stamp}@vow.test`;
  const business = `Studio ${stamp}`;
  const standard = `Liste standard ${stamp}`;
  const oneOff = `Planning de la soirée ${stamp}`;

  await signUpVendor(page, vendorEmail);
  await finishVendorWelcome(page, business);
  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Inès");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Paul");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-09-12");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = page.url().split("/mariage/")[1]?.split("/")[0] ?? "";
  await page.getByLabel("E-mail du couple").fill(coupleEmail);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  const inviteCode = page.locator("code", { hasText: "/invitation/" }).first();
  await inviteCode.waitFor();
  const coupleLink = (await inviteCode.innerText()).trim();

  const couple = await freshPage(browser);
  await couple.goto(new URL(coupleLink).pathname);
  await couple.getByRole("link", { name: "Créer un compte" }).click();
  await signUpCouple(couple, coupleEmail);
  await couple.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couple.getByRole("heading", { name: "Inès & Paul" })).toBeVisible();

  await page.goto("/reglages");
  const standardForm = page.locator("form").filter({ hasText: "Échéance" });
  await standardForm.getByLabel("Intitulé").fill(standard);
  await standardForm.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("Document ajouté à votre liste.")).toBeVisible();

  await page.goto(`/mariage/${weddingId}/bulles`);
  const once = page.locator("form").filter({ hasText: "Demande pour ce mariage seulement" });
  await once.getByLabel("Intitulé").fill(oneOff);
  await once.getByRole("button", { name: "Ajouter cette demande" }).click();
  await expect(page.getByText(oneOff)).toBeVisible();

  await couple.goto(`/mariage/${weddingId}/documents`);
  await expect(couple.getByRole("heading", { name: new RegExp(business) })).toBeVisible();
  await expect(couple.getByText(standard, { exact: true })).toBeVisible();
  await expect(couple.getByText(oneOff, { exact: true })).toBeVisible();
  const asked = couple.locator("li").filter({ hasText: oneOff });
  await asked.locator("input[type=file]").setInputFiles({
    name: "planning.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.1\n%%EOF"),
  });
  await expect(asked.getByText("Envoyé")).toBeVisible();

  await page.goto(`/mariage/${weddingId}/bulles`);
  await expect(page.locator("li").filter({ hasText: oneOff }).getByText("Envoyé")).toBeVisible();
  await expect(page.getByText(standard, { exact: true })).toBeVisible();
  await couple.close();
});

async function signUpVendor(page: Page, email: string) {
  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await revealPasswordSignup(page, "Prestataire");
  await page.getByLabel("Nom complet").fill("Camille Nouvelle");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"));
}

async function signUpCouple(page: Page, email: string) {
  await revealPasswordSignup(page, "Couple");
  await page.getByLabel("Nom complet").fill("Léa Martin");
  if (await page.getByLabel("E-mail").isEditable()) await page.getByLabel("E-mail").fill(email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL("**/invitation/**");
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}
