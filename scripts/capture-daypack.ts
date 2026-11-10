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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, baseURL });

  await page.goto("/connexion");
  await page.getByLabel("E-mail").first().fill(demo.vendorEmail);
  await page.getByLabel("Mot de passe").first().fill(demoPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL("**/espace**");

  await page.goto(`/mariage/${demo.weddingId}/questions`);
  await page.getByText("Où se passent les préparatifs ?").waitFor();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-questions.png` });

  await page.goto(`/mariage/${demo.weddingId}/carte`);
  await page.getByRole("link", { name: "Itinéraire" }).waitFor();
  await quiet(page);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const link = [...document.querySelectorAll("a")].find((anchor) => anchor.textContent?.includes("Itinéraire"));
    link?.scrollIntoView({ block: "center", behavior: "auto" });
  });
  await page.screenshot({ path: `${outDir}/mobile-carte.png` });

  await page.goto(`/mariage/${demo.weddingId}/equipe`);
  await page.getByRole("heading", { name: "Atelier Lumière" }).waitFor();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-equipe.png` });

  await page.goto(`/mariage/${demo.weddingId}/galerie`);
  await page.getByText("finales.png").waitFor();
  await quiet(page);
  await page.screenshot({ path: `${outDir}/mobile-galerie.png` });

  await page.goto(`/mariage/${demo.weddingId}/jour`);
  await page.getByRole("heading", { name: "Cérémonie" }).waitFor();
  await page.waitForFunction((id) => window.localStorage.getItem(`vow-jour-${id}`) !== null, demo.weddingId);
  await page.context().setOffline(true);
  await page.reload();
  await page.getByText("Hors ligne").waitFor();
  await page.screenshot({ path: `${outDir}/mobile-jour-hors-ligne.png` });

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
