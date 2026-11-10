import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, type Page } from "@playwright/test";
import { demo, demoPassword } from "./demo";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outDir = "/opt/cursor/artifacts/vow";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function expectNo(page: Page, text: string) {
  if ((await page.getByText(text).count()) > 0) {
    throw new Error(`Texte inattendu visible : ${text}`);
  }
}

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
    execFileSync("npm", ["run", "seed"], { stdio: "inherit" });

    await page.goto("/connexion");
    await page.getByRole("heading", { name: "Connexion" }).waitFor();
    await shot(page, `${prefix}-connexion`);

    await page.goto("/inscription");
    await page.getByRole("heading", { name: "Inscription" }).waitFor();
    await shot(page, `${prefix}-inscription`);

    await login(page, demo.vendorEmail);
    await page.getByRole("status").waitFor();
    await shot(page, `${prefix}-toast`);
    await shot(page, `${prefix}-tableau-prestataire`);
    if (prefix === "desktop") {
      await page.screenshot({ path: `${outDir}/desktop-accueil.png` });
      console.log("desktop-accueil");
    }
    if (prefix === "mobile") {
      await page.screenshot({ path: `${outDir}/mobile-accueil.png` });
      await page.goto(`/mariage/${demo.weddingId}`);
      await page.getByText("Changer de mariage").click();
      await page.getByRole("link", { name: "Inès & Paul" }).waitFor();
      await page.screenshot({ path: `${outDir}/mobile-switcher.png` });
      await page.goto("/reglages");
      await page.getByRole("heading", { name: "Réglages" }).waitFor();
      await page.getByRole("button", { name: "Se déconnecter" }).waitFor();
      await page.screenshot({ path: `${outDir}/mobile-reglages.png` });
      console.log("mobile-accueil mobile-switcher mobile-reglages");
      await page.goto("/espace");
    }

    if (prefix === "mobile") {
      await page.goto("/espace/profil");
      await page.getByLabel("Nom commercial").fill("Bastien Sellier photographe");
      await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
      await page.getByText("Vitrine publiée.").waitFor();
      await page.goto(`/mariage/${demo.weddingId}/jour`);
      await page.getByText("Lecture seule").waitFor();
      await page.locator("header").screenshot({ path: `${outDir}/mobile-header.png` });
      await page.getByRole("navigation", { name: "Espace prestataire" }).screenshot({ path: `${outDir}/mobile-tabbar.png` });
      await page.screenshot({ path: `${outDir}/mobile-jour-prestataire.png` });
      console.log("mobile-header mobile-tabbar mobile-jour-prestataire");
      await page.goto(`/mariage/${demo.weddingId}`);
      await page.getByText("Espace prestataire · Photographe").waitFor();
      await page.screenshot({ path: `${outDir}/mobile-mariage-photographe.png` });
      console.log("mobile-mariage-photographe");
      await page.goto("/espace/profil");
      await page.getByLabel("Nom commercial").fill("Atelier Lumière");
      await page.getByRole("button", { name: "Enregistrer la vitrine" }).click();
      await page.getByText("Vitrine publiée.").waitFor();
    }
    await page.goto("/alertes");
    await page.getByRole("heading", { name: "Alertes" }).waitFor();
    await shot(page, `${prefix}-alertes`);

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

    await page.goto(`/mariage/${demo.weddingId}/jour`);
    await page.getByRole("button", { name: "+30 min" }).first().waitFor();
    await shot(page, `${prefix}-jour`);
    if (prefix === "mobile") {
      await page.screenshot({ path: `${outDir}/mobile-jour-couple.png` });
      console.log("mobile-jour-couple");
    }
    if (prefix === "desktop") {
      await page.screenshot({ path: `${outDir}/desktop-jour-maries.png` });
      console.log("desktop-jour-maries");
    }

    await page.goto(`/mariage/${demo.weddingId}/pratique`);
    await page.getByRole("heading", { name: "Infos pratiques" }).waitFor();
    await shot(page, `${prefix}-pratique`);

    if (prefix === "mobile") {
      await page.goto("/espace");
      await page.route("**/mariage/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        try {
          await route.continue();
        } catch {
          // The delayed navigation can be aborted once the shot is taken.
        }
      });
      const pending = page.getByRole("link", { name: "Ouvrir l'espace" }).first().click();
      await page.getByLabel("Chargement").waitFor();
      await page.screenshot({ path: `${outDir}/mobile-chargement.png` });
      console.log("mobile-chargement");
      await pending;
      await page.unroute("**/mariage/**");
    }

    if (prefix === "mobile") {
      await context.clearCookies();
      await login(page, demo.catererEmail);
      await page.goto(`/mariage/${demo.weddingId}`);
      await page.getByText("Espace prestataire · Traiteur").waitFor();
      await page.getByRole("link", { name: "Invités" }).waitFor();
      await page.screenshot({ path: `${outDir}/mobile-mariage-traiteur.png` });
      console.log("mobile-mariage-traiteur");
      await page.goto(`/mariage/${demo.weddingId}/pratique`);
      await page.getByRole("heading", { name: "Tables et régimes" }).waitFor();
      await page.getByText("Paul Bernard", { exact: true }).waitFor();
      await expectNo(page, "Photos de groupe");
      await page.addStyleTag({
        content: "header, nav, [role=status] { display: none !important; } main { padding-bottom: 1.5rem !important; }",
      });
      await page.locator("main").screenshot({ path: `${outDir}/mobile-fiche-traiteur.png` });
      console.log("mobile-fiche-traiteur");
      await context.clearCookies();
      await login(page, demo.vendorEmail);
      await page.goto(`/mariage/${demo.weddingId}/pratique`);
      await page.getByRole("heading", { name: "Groupes photo" }).waitFor();
      await page.getByText("Famille de Léa").waitFor();
      await expectNo(page, "Sans gluten");
      await page.addStyleTag({
        content: "header, nav, [role=status] { display: none !important; } main { padding-bottom: 1.5rem !important; }",
      });
      await page.locator("main").screenshot({ path: `${outDir}/mobile-fiche-photographe.png` });
      console.log("mobile-fiche-photographe");
      await page.goto("/espace");
      await page.getByRole("button", { name: "Tester l'espace mariés" }).click();
      await page.getByText("Vous testez l'espace mariés.").waitFor();
      await page.screenshot({ path: `${outDir}/mobile-demo-maries.png` });
      console.log("mobile-demo-maries");
    }

    await context.close();
  }

  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
