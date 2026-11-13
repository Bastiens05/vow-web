import { expect, test, type Browser, type Page } from "@playwright/test";
import { passVendorWelcome, revealPasswordSignup } from "./password-auth";

const password = "VowTest2026!";

test("prestataire, invitation, messages, déroulé et document", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const vendorEmail = `vendor.${stamp}@vow.test`;
  const coupleEmail = `couple.${stamp}@vow.test`;
  const business = `Studio ${stamp}`;

  await signUp(page, {
    name: "Camille Test",
    email: vendorEmail,
    role: "Prestataire",
  });
  await passVendorWelcome(page, business);
  await expect(page.getByRole("heading", { name: "Votre page publique" })).toBeVisible();

  await page.getByLabel("Nom commercial").fill(business);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByLabel("Zone").fill("Vignoble");
  await page
    .getByLabel("Présentation")
    .fill("Reportage de mariage en lumière naturelle, du matin jusqu'au bout de la nuit, autour de Bordeaux.");
  await page.getByLabel("Publier la vitrine").check();
  await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
  await expect(page.getByText("Vitrine publiée.")).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Léa");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hugo");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-06-19");
  await page.getByLabel("Lieu", { exact: true }).fill("Château");
  await page.getByLabel("Ville du lieu").fill("Léognan");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await expect(page.locator('img[src*="venue-golden"]')).toBeVisible();

  await page.goto("/espace/mariages/nouveau");
  await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Secret");
  await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
  await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hidden");
  await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
  await page.getByLabel("Date du mariage").fill("2027-08-01");
  await page.getByRole("button", { name: "Créer le mariage" }).click();
  await expect(page.getByRole("heading", { name: "Secret & Hidden" })).toBeVisible();
  await page.goto("/espace");
  await expect(page.getByText("Léa & Hugo")).toBeVisible();
  await expect(page.getByText("Secret & Hidden")).toBeVisible();
  await page.getByRole("link", { name: "Ouvrir l'espace" }).first().click();
  await page.getByRole("link", { name: "Invitations" }).click();

  await page.getByLabel("E-mail du couple").fill(coupleEmail);
  await page.getByRole("button", { name: "Envoyer l'invitation" }).click();
  const linkText = await page.locator("code").first().innerText();
  const inviteUrl = new URL(linkText.trim());

  const couplePage = await freshPage(browser);
  await couplePage.goto(inviteUrl.pathname + inviteUrl.search);
  await couplePage.getByRole("link", { name: "Créer un compte" }).click();
  await couplePage.waitForURL("**/inscription**");
  await signUp(couplePage, { name: "Léa Martin", email: coupleEmail, role: "Couple", emailLocked: true });
  await couplePage.waitForURL("**/invitation/**");
  await couplePage.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couplePage.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();

  await couplePage.goto("/espace");
  await expect(couplePage.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await expect(couplePage.getByText("Secret & Hidden")).toHaveCount(0);

  await page.goto("/espace");
  await page.getByRole("link", { name: "Ouvrir l'espace" }).first().click();
  await expect(page.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await page.getByRole("navigation", { name: "Espace prestataire" }).getByRole("link", { name: "Messages" }).click();
  await page.getByLabel("Message").fill("Bonjour Léa, bienvenue dans l'espace.");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByText("Bonjour Léa, bienvenue dans l'espace.")).toBeVisible();

  await couplePage.getByRole("link", { name: "Ouvrir l'espace" }).click();
  await expect(couplePage.getByRole("heading", { name: "Léa & Hugo" })).toBeVisible();
  await couplePage.getByRole("navigation", { name: "Espace mariés" }).getByRole("link", { name: "Messages" }).click();
  await expect(couplePage.getByText("Bonjour Léa, bienvenue dans l'espace.")).toBeVisible({ timeout: 20_000 });
  await couplePage.getByLabel("Message").fill("Merci, on est bien arrivés.");
  await couplePage.getByRole("button", { name: "Envoyer" }).click();
  await expect(couplePage.getByText("Merci, on est bien arrivés.")).toBeVisible();
  await expect(page.getByText("Merci, on est bien arrivés.")).toBeVisible({ timeout: 20_000 });

  await couplePage.getByRole("link", { name: "Jour J", exact: true }).click();
  await couplePage.getByLabel("Étape").fill("Cérémonie");
  await couplePage.getByLabel("Heure").fill("16:00");
  await couplePage.getByLabel("Lieu", { exact: true }).fill("Jardin");
  await couplePage.getByRole("button", { name: "Ajouter l'étape" }).click();
  await expect(couplePage.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  await page.getByRole("link", { name: "Jour J", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Cérémonie" })).toBeVisible();
  await expect(page.getByLabel("Étape")).toHaveCount(0);

  await page.getByRole("link", { name: "Documents" }).click();
  const fileName = `note-${stamp}.txt`;
  await page.getByLabel("Ajouter un fichier").setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from("Planning du jour, version courte."),
  });
  await expect(page.getByText(fileName)).toBeVisible();

  await couplePage.getByRole("link", { name: "Documents" }).click();
  await expect(couplePage.getByText(fileName)).toBeVisible();
  await couplePage.close();
});

async function signUp(
  page: Page,
  input: { name: string; email: string; role: "Prestataire" | "Couple"; emailLocked?: boolean },
) {
  if (!page.url().includes("/inscription")) {
    await page.goto("/inscription");
  }
  await revealPasswordSignup(page, input.role);
  await page.getByLabel("Nom complet").fill(input.name);
  if (!input.emailLocked) await page.getByLabel("E-mail").fill(input.email);
  await page.getByLabel(/^Mot de passe/).fill(password);
  await page.getByRole("radio", { name: input.role }).check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/inscription"), { timeout: 20_000 });
  } catch (error) {
    const alert = page.getByRole("alert");
    const detail = (await alert.count()) > 0 ? await alert.first().innerText() : "aucun message";
    throw new Error(`Inscription bloquée (${detail})`, { cause: error });
  }
}

async function freshPage(browser: Browser) {
  const context = await browser.newContext();
  return context.newPage();
}
