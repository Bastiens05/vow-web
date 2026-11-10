import { mkdir } from "node:fs/promises";
import { chromium, type APIRequestContext, type Page } from "@playwright/test";

const out = "/opt/cursor/artifacts/vow";
const baseURL = "http://127.0.0.1:3000";

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
}

async function readCode(request: APIRequestContext, email: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const list = await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    if (list.ok()) {
      const body = (await list.json()) as { messages?: Array<{ ID: string }> };
      const id = body.messages?.[0]?.ID;
      if (id) {
        const message = await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`);
        const payload = (await message.json()) as { Text?: string };
        const code = payload.Text?.match(/\b(\d{6})\b/)?.[1];
        if (code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("code introuvable");
}

async function main() {
  await mkdir(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL });
  const page = await context.newPage();

  await page.goto("/inscription");
  await page.getByRole("heading", { name: "Bienvenue" }).waitFor();
  await shot(page, "auth-choix");

  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await page.getByRole("heading", { name: "Votre e-mail" }).waitFor();
  await shot(page, "auth-email");

  const email = `capture.${Date.now().toString(36)}@vow.test`;
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le code" }).click();
  await page.getByLabel("Code à 6 chiffres").waitFor();
  await shot(page, "auth-code");

  const code = await readCode(page.request, email);
  await page.getByLabel("Code à 6 chiffres").fill(code);
  await page.getByRole("heading", { name: "Votre métier" }).waitFor();
  await shot(page, "auth-metier");

  await page.goto("/inscription?email=lea%40vow.test&role=couple&next=%2Finvitation%2Fabc");
  await page.getByLabel("E-mail").waitFor();
  await shot(page, "auth-invitation");

  await page.getByRole("button", { name: "Continuer avec un mot de passe" }).click();
  await page.getByLabel(/^Mot de passe/).waitFor();
  await shot(page, "auth-mot-de-passe");

  await page.goto("/connexion");
  await page.getByRole("heading", { name: "Votre e-mail" }).waitFor();
  await shot(page, "auth-connexion");

  const dark = await browser.newContext({
    viewport: { width: 390, height: 844 },
    baseURL,
    colorScheme: "dark",
  });
  const night = await dark.newPage();
  await night.goto("/inscription");
  await night.getByRole("heading", { name: "Bienvenue" }).waitFor();
  await shot(night, "auth-sombre");
  await dark.close();
  await browser.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
