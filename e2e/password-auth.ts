import type { Page } from "@playwright/test";

export async function revealPasswordSignup(page: Page, role?: "Prestataire" | "Couple", trade = "Photographe") {
  const choice =
    role === "Couple"
      ? page.getByRole("button", { name: "Nous sommes les mariés" })
      : role === "Prestataire"
        ? page.getByRole("button", { name: "Je suis prestataire" })
        : null;
  if (choice && (await choice.isVisible().catch(() => false))) await choice.click();
  if (role === "Prestataire") {
    const tradeButton = page.getByRole("button", { name: trade, exact: true });
    if (await tradeButton.isVisible().catch(() => false)) {
      await tradeButton.click();
    }
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
  await saveVendorStudio(page, business);
}

export async function finishVendorWelcome(page: Page, business: string) {
  await saveVendorStudio(page, business);
  await page.goto("/espace");
}

async function saveVendorStudio(page: Page, business: string) {
  if (page.url().includes("/bienvenue")) {
    const activity = page.getByLabel("Nom de l'activité");
    const logo = page.getByRole("heading", { name: "Votre logo" });
    await Promise.race([activity.waitFor({ timeout: 15000 }), logo.waitFor({ timeout: 15000 })]).catch(() => undefined);
    if (await activity.isVisible().catch(() => false)) {
      const trade = page.getByRole("button", { name: "Photographe" });
      if (await trade.isVisible().catch(() => false)) await trade.click();
      await activity.fill(business);
      const city = page.getByLabel("Ville").first();
      if ((await city.inputValue()) === "") await city.fill("Bordeaux");
      await page.getByRole("button", { name: "Continuer" }).click();
    }
    if (await page.getByRole("heading", { name: "Votre logo" }).isVisible().catch(() => false)) {
      await page.getByRole("link", { name: "Continuer" }).click();
    }
    await page.waitForURL((url) => url.pathname.startsWith("/espace"), { timeout: 15000 });
  }
  await page.goto("/espace/profil");
  const commercial = page.getByRole("textbox", { name: "Nom commercial" });
  await commercial.waitFor({ timeout: 15000 });
  if ((await commercial.inputValue()) !== business) {
    await commercial.fill(business);
    const city = page.getByRole("combobox", { name: "Ville" }).first();
    if ((await city.inputValue()) === "") await city.fill("Bordeaux");
    const pitch = page.getByLabel("Présentation");
    if ((await pitch.inputValue()) === "") {
      await pitch.fill("Reportage de mariage, de la préparation jusqu'à la dernière danse.");
    }
    await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
    await page.getByText("Vitrine enregistrée.").waitFor({ timeout: 15000 });
  }
}

export async function revealPasswordLogin(page: Page) {
  await page.getByLabel("Mot de passe").waitFor();
}
