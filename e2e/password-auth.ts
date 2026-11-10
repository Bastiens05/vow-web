import type { Page } from "@playwright/test";

export async function revealPasswordSignup(page: Page, role?: "Prestataire" | "Couple") {
  const choice =
    role === "Couple"
      ? page.getByRole("button", { name: "Nous sommes les mariés" })
      : role === "Prestataire"
        ? page.getByRole("button", { name: "Je suis prestataire" })
        : null;
  if (choice && (await choice.isVisible().catch(() => false))) await choice.click();
  const password = page.getByRole("button", { name: "Continuer avec un mot de passe" });
  if (await password.isVisible().catch(() => false)) await password.click();
}

export async function revealPasswordLogin(page: Page) {
  const password = page.getByRole("button", { name: "Continuer avec un mot de passe" });
  if (await password.isVisible().catch(() => false)) await password.click();
}
