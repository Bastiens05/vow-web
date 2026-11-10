import { expect, test } from "@playwright/test";

test("le prestataire entre par e-mail, code, métier", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `otp.${stamp}@vow.test`;

  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir le code" }).click();
  await expect(page.getByLabel("Code à 6 chiffres")).toBeVisible();

  const code = await readCode(request, email);
  await page.getByLabel("Code à 6 chiffres").fill(code);
  await page.getByRole("heading", { name: "Votre métier" }).waitFor();
  await page.getByRole("button", { name: "Traiteur" }).click();
  await page.getByLabel("Nom de l'activité").fill(`Table ${stamp}`);
  await page.getByRole("button", { name: "Entrer dans VOW" }).click();
  await page.waitForURL("**/espace**");
  await expect(page.getByText(`Table ${stamp}`).first()).toBeVisible();
});

test("une invitation couple préremplit l'e-mail et n'affiche pas le choix de rôle", async ({ page }) => {
  await page.goto("/inscription?email=lea%40vow.test&role=couple&next=%2Finvitation%2Fabc");
  await expect(page.getByRole("button", { name: "Je suis prestataire" })).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toHaveValue("lea@vow.test");
  await page.getByRole("button", { name: "Continuer avec un mot de passe" }).click();
  await expect(page.getByRole("radio", { name: "Couple" })).toBeChecked();
});

async function readCode(request: import("@playwright/test").APIRequestContext, email: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const list = await request.get("http://127.0.0.1:54324/api/v1/search?query=" + encodeURIComponent(`to:${email}`));
    if (list.ok()) {
      const body = (await list.json()) as { messages?: Array<{ ID: string }> };
      const id = body.messages?.[0]?.ID;
      if (id) {
        const message = await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`);
        const payload = (await message.json()) as { Text?: string; HTML?: string };
        const source = `${payload.Text ?? ""}\n${payload.HTML ?? ""}`;
        const code = source.match(/\b(\d{6})\b/)?.[1];
        if (code) return code;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`code introuvable pour ${email}`);
}
