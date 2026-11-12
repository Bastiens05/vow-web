import type { Page } from "@playwright/test";

export async function revealPasswordSignup(page: Page, role?: "Prestataire" | "Couple") {
  const choice =
    role === "Couple"
      ? page.getByRole("button", { name: "Nous sommes les mariés" })
      : role === "Prestataire"
        ? page.getByRole("button", { name: "Je suis prestataire" })
        : null;
  if (choice && (await choice.isVisible().catch(() => false))) await choice.click();
  if (role === "Prestataire") {
    const trade = page.getByRole("button", { name: "Photographe" });
    if (await trade.isVisible().catch(() => false)) await trade.click();
    const business = page.getByLabel("Nom de l'activité");
    if (await business.isVisible().catch(() => false) && (await business.inputValue()) === "") {
      await business.fill("Atelier");
    }
    const city = page.getByLabel("Ville").first();
    if (await city.isVisible().catch(() => false) && (await city.inputValue()) === "") {
      await city.fill("Bordeaux");
    }
  }
  if (role === "Couple" && (await page.getByLabel("Prénom", { exact: true }).first().isVisible().catch(() => false))) {
    await page.getByLabel("Prénom", { exact: true }).nth(0).fill("Léa");
    await page.getByLabel("Nom", { exact: true }).nth(0).fill("Martin");
    await page.getByLabel("Prénom", { exact: true }).nth(1).fill("Hugo");
    await page.getByLabel("Nom", { exact: true }).nth(1).fill("Bernard");
    await page.getByLabel("Date du mariage").fill("2027-06-19");
    return;
  }
  await page.getByLabel("Nom complet").waitFor();
}

export async function passVendorWelcome(page: Page, business: string) {
  if (page.url().includes("/bienvenue")) {
    await page.getByLabel("Nom de l'activité").fill(business);
    await page.getByLabel("Ville").fill("Bordeaux");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByRole("link", { name: "Continuer" }).click();
    await page.waitForURL("**/espace**");
  }
  if (!page.url().includes("/espace/profil")) await page.goto("/espace/profil");
}

export async function revealPasswordLogin(page: Page) {
  await page.getByLabel("Mot de passe").waitFor();
}
