import { expect, test, type Browser, type Page } from "@playwright/test";
import { passVendorWelcome, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";
const phone = "06 12 34 56 78";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("questions, carte, annuaire, galerie et jour J hors ligne", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `photo.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;
  const catererEmail = `table.${stamp}@vow.test`;
  const fileName = `final-${stamp}.png`;

  await signUp(page, { name: "Camille Photo", email: vendorEmail, role: "Prestataire" });
  await passVendorWelcome(page, `Studio ${stamp}`);
  await page.getByLabel("Nom commercial").fill(`Studio ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Présentation").fill("Reportage de mariage en lumière naturelle, du matin jusqu'au bout de la nuit.");
  await page.getByRole("textbox", { name: "Téléphone" }).fill(phone);
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine enregistrée.")).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Léa");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hugo");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-06-19");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Inviter" })).toBeVisible();
  const weddingId = page.url().split("/mariage/")[1]?.split("/")[0] ?? "";

  await page.goto(`/mariage/${weddingId}/questions`);
  await page.getByRole("button", { name: "Utiliser le modèle" }).click();
  await expect(page.getByText("Où se passent les préparatifs ?")).toBeVisible();
  await page.getByRole("button", { name: "Envoyer au couple" }).click();
  await expect(page.getByText("Envoyé")).toBeVisible();

  await page.goto(`/mariage/${weddingId}/inviter`);
  await page.getByLabel("E-mail du couple").fill(coupleEmail);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  const coupleLink = await page.locator("code").first().innerText();
  const couplePage = await freshPage(browser);
  await couplePage.goto(new URL(coupleLink.trim()).pathname + new URL(coupleLink.trim()).search);
  await couplePage.getByRole("link", { name: "Créer un compte" }).click();
  await couplePage.waitForURL("**/inscription**");
  await signUp(couplePage, { name: "Léa Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couplePage.waitForURL("**/invitation/**");
  await couplePage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couplePage.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/questions`);
  await couplePage.getByLabel("Où se passent les préparatifs ?").fill("À la maison, côté jardin.");
  await couplePage.getByRole("button", { name: "Enregistrer les réponses" }).click();
  await expect(couplePage.getByText("Réponses enregistrées.")).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/equipe`);
  await expect(couplePage.getByRole("heading", { name: `Studio ${stamp}` })).toBeVisible();
  await expect(couplePage.getByText(phone)).toHaveCount(0);
  await expect(couplePage.getByRole("link", { name: "Écrire" }).first()).toBeVisible();

  await page.goto("/reglages");
  await page.getByRole("checkbox", { name: "Montrer mon téléphone" }).check();
  await page.getByRole("button", { name: "Enregistrer la visibilité" }).click();
  await expect(page.getByText("Visibilité enregistrée.")).toBeVisible();
  await couplePage.reload();
  await expect(couplePage.getByRole("link", { name: phone })).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/carte`);
  await couplePage.getByLabel("Lieu").fill("Cérémonie");
  await couplePage.getByLabel("Adresse").fill("Château de la Louvière, Léognan");
  await couplePage.getByLabel("Heure").fill("16:00");
  await couplePage.getByRole("button", { name: "Ajouter" }).click();
  await expect(couplePage.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", /google\.com\/maps/);
  await expect(couplePage.getByRole("link", { name: "Plans" })).toHaveAttribute("href", /maps\.apple\.com/);

  await page.goto(`/mariage/${weddingId}/galerie`);
  await page.getByLabel("Titre").fill("Photos finales");
  await page.getByLabel("Fichier").setInputFiles({ name: fileName, mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Déposer" }).click();
  const storedName = fileName.replace(/\.png$/, ".jpg");
  await expect(page.getByText(storedName)).toBeVisible();
  const downloadHref = await page.getByRole("link", { name: "Télécharger" }).getAttribute("href");

  await page.goto(`/mariage/${weddingId}/inviter`);
  await page.getByLabel("E-mail du confrère").fill(catererEmail);
  await page.getByRole("button", { name: "Inviter un confrère" }).click();
  const catererLink = await page.locator("code").last().innerText();
  const catererPage = await freshPage(browser);
  await catererPage.goto(new URL(catererLink.trim()).pathname + new URL(catererLink.trim()).search);
  await catererPage.getByRole("link", { name: "Créer un compte" }).click();
  await catererPage.waitForURL("**/inscription**");
  await signUp(catererPage, { name: "Nina Table", email: catererEmail, role: "Prestataire", emailLocked: true });
  await catererPage.waitForURL("**/invitation/**");
  await catererPage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(catererPage.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await catererPage.goto(`/mariage/${weddingId}/galerie`);
  await expect(catererPage.getByText("réservée au couple")).toBeVisible();
  await expect(catererPage.getByText(storedName)).toHaveCount(0);
  if (downloadHref) {
    const denied = await catererPage.request.get(downloadHref);
    expect(denied.status()).toBe(404);
  }

  await couplePage.goto(`/mariage/${weddingId}/jour`);
  await couplePage.getByLabel("Étape").fill("Cérémonie");
  await couplePage.getByLabel("Heure").fill("16:00");
  await couplePage.getByLabel("Lieu", { exact: true }).fill("Jardin");
  await couplePage.getByRole("button", { name: "Ajouter l'étape" }).click();
  await expect(couplePage.getByRole("heading", { name: "Cérémonie" })).toBeVisible();

  await couplePage.goto(`/mariage/${weddingId}/jour`);
  await expect(couplePage.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  await couplePage.waitForFunction(
    (id) => window.localStorage.getItem(`vow-jour-${id}`) !== null,
    weddingId,
  );
  await couplePage.context().setOffline(true);
  await couplePage.reload();
  await expect(couplePage.getByText("Cérémonie")).toBeVisible();
  await expect(couplePage.getByText("Hors ligne")).toBeVisible();
  await couplePage.context().setOffline(false);
  await couplePage.close();
  await catererPage.close();
});

async function signUp(
  page: Page,
  input: { name: string; email: string; role: "Prestataire" | "Couple"; emailLocked?: boolean },
) {
  if (!page.url().includes("/inscription")) await page.goto("/inscription");
  await revealPasswordSignup(page, input.role);
  await page.getByLabel("Nom complet").fill(input.name);
  if (!input.emailLocked) await page.getByLabel("E-mail").fill(input.email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: input.role }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
