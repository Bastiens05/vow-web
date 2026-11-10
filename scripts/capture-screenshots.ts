import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";
import { demo, demoPassword } from "./demo";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = "/opt/cursor/artifacts/vow";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  console.log(name);
}

async function login(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(email);
  await page.getByLabel("Mot de passe").first().fill(demoPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      baseURL,
    });
    const page = await context.newPage();
    const prefix = viewport.name;

    await page.goto("/connexion");
    await page.getByRole("heading", { name: "Connexion" }).waitFor();
    await shot(page, `${prefix}-connexion`);

    await page.goto("/inscription");
    await page.getByRole("heading", { name: "Inscription" }).waitFor();
    await shot(page, `${prefix}-inscription`);

    await login(page, demo.vendorEmail);
    await shot(page, `${prefix}-tableau-prestataire`);

    await page.goto("/espace/profil");
    await page.getByRole("heading", { name: "Votre page publique" }).waitFor();
    await shot(page, `${prefix}-vitrine-edition`);

    await page.goto(`/p/${demo.slug}`);
    await page.getByRole("heading", { name: "Atelier Lumière" }).waitFor();
    await page.locator("img").first().waitFor();
    await shot(page, `${prefix}-vitrine-publique`);

    await page.goto("/espace/mariages/nouveau");
    await page.getByRole("heading", { name: "Créer un mariage" }).waitFor();
    await shot(page, `${prefix}-creation-mariage`);

    await page.goto(`/mariage/${demo.weddingId}/inviter`);
    await page.getByRole("heading", { name: "Inviter" }).waitFor();
    await shot(page, `${prefix}-invitation`);

    await context.clearCookies();
    await login(page, demo.coupleEmail);
    await shot(page, `${prefix}-tableau-couple`);

    await page.goto(`/mariage/${demo.weddingId}/messages`);
    await page.getByText("Bienvenue dans votre espace").waitFor();
    await shot(page, `${prefix}-messages`);

    await page.goto(`/mariage/${demo.weddingId}/documents`);
    await page.getByText("deroule-lea-hugo.txt").waitFor();
    await shot(page, `${prefix}-documents`);

    await page.goto(`/mariage/${demo.weddingId}/deroulement`);
    await page.getByRole("heading", { name: "Cérémonie" }).waitFor();
    await shot(page, `${prefix}-deroule`);

    await context.close();
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
