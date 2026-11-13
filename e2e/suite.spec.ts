import { expect, test, type Browser, type Page } from "@playwright/test";
import { revealPasswordSignup, finishVendorWelcome } from "./password-auth";

const password = "VowTest2026!";

test("le budget et l'équipe restent isolés", async ({ page, browser }) => {
  const stamp = Date.now().toString(36);
  const ownerEmail = `titulaire.${stamp}@vow.test`;
  const otherEmail = `exterieur.${stamp}@vow.test`;
  const teamEmail = `equipe.${stamp}@vow.test`;
  const coupleEmail = `maries.${stamp}@vow.test`;

  await signUpVendor(page, ownerEmail);
  await finishOnboarding(page, `Studio ${stamp}`);
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
  const coupleLink = await page.locator("code").first().innerText();

  const couple = await freshPage(browser);
  await couple.goto(new URL(coupleLink.trim()).pathname + new URL(coupleLink.trim()).search);
  await couple.getByRole("link", { name: "Créer un compte" }).click();
  await signUpCouple(couple, coupleEmail);
  await couple.getByRole("button", { name: "Rejoindre le mariage" }).click();
  await expect(couple.getByRole("heading", { name: "Inès & Paul" })).toBeVisible();
  await couple.goto(`/mariage/${weddingId}/budget`);
  await couple.getByLabel("Budget global").fill("12000");
  await couple.getByLabel("Budget global").blur();
  await expect(couple.getByText(/12[\s\u202f]000/)).toBeVisible();

  const other = await freshPage(browser);
  await signUpVendor(other, otherEmail);
  await finishOnboarding(other, `Maison ${stamp}`);
  await other.goto(`/mariage/${weddingId}/budget`);
  await expect(other).toHaveURL(/\/mariages$/);
  await expect(other.getByText("Inès & Paul")).toHaveCount(0);
  await expect(other.getByText(/12[\s\u202f]000,00/)).toHaveCount(0);

  await page.goto("/reglages");
  const teamForm = page.locator("form").filter({ has: page.getByRole("button", { name: "Inviter dans l'équipe" }) });
  await teamForm.getByLabel("E-mail du membre").fill(teamEmail);
  await teamForm.getByRole("button", { name: "Inviter dans l'équipe" }).click();
  const teamStatus = await teamForm.getByRole("status").innerText();
  const teamUrl = teamStatus.match(/https?:\/\/\S+/)?.[0] ?? "";
  expect(teamUrl).toContain("/equipe/");

  const teammate = await freshPage(browser);
  await signUpVendor(teammate, teamEmail);
  await finishOnboarding(teammate, `Second ${stamp}`);
  await teammate.goto(new URL(teamUrl).pathname);
  await teammate.getByRole("button", { name: "Rejoindre" }).click();
  await expect(teammate.getByRole("heading", { name: "Mariages" })).toBeVisible();
  await expect(teammate.getByText("Inès & Paul")).toBeVisible();
  await expect(teammate.getByText(/12[\s\u202f]000,00/)).toHaveCount(0);
  await teammate.goto(`/mariage/${weddingId}/budget`);
  await expect(teammate.getByText("Le budget reste chez les mariés.")).toBeVisible();
  await expect(teammate.getByText(/12[\s\u202f]000,00/)).toHaveCount(0);

  await couple.close();
  await other.close();
  await teammate.close();
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

async function finishOnboarding(page: Page, business: string) {
  await finishVendorWelcome(page, business);
}

async function freshPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}
