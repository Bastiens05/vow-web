import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";
import { demo, demoPassword } from "./demo";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = "/opt/cursor/artifacts/vow";

async function quiet(page: Page) {
  await page.addStyleTag({ content: "[role=status]{display:none !important}" });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    baseURL,
  });
  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(demo.vendorEmail);
  await page.getByLabel("Mot de passe").first().fill(demoPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");
  await page.getByText("Encaissé cette année").waitFor();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-tableau-chiffres.png` });
  await page.getByText("Avis à publier").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/mobile-avis-a-publier.png` });

  await page.goto(`/mariage/${demo.weddingId}/devis`);
  await page.getByRole("heading", { name: "Devis et factures" }).waitFor();
  await page.getByText("Paiement en ligne fermé.").waitFor();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-devis.png` });
  await page.evaluate(() => window.scrollTo(0, 620));
  await page.screenshot({ path: `${outDir}/mobile-facture.png` });
  await page.getByText("Paiement en ligne fermé.").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${outDir}/mobile-acompte.png` });

  await page.context().clearCookies();
  await page.goto(`/p/${demo.slug}`);
  await page.getByRole("heading", { name: "Avis" }).waitFor();
  await page.getByRole("heading", { name: "Avis" }).scrollIntoViewIfNeeded();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-avis-public.png` });

  await browser.close();
}
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
