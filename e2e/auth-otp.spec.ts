import { expect, test } from "@playwright/test";

test("le prestataire entre par le lien de connexion, puis son activité", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `lien.${stamp}@vow.test`;

  await page.goto("/inscription");
  await page.getByRole("button", { name: "Je suis prestataire" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Recevoir un lien de connexion" }).click();
  await expect(page.getByText("Vérifiez votre boîte mail")).toBeVisible();
  await expect(page.getByLabel("Code à 6 chiffres")).toHaveCount(0);

  const link = await readLink(request, email);
  await page.goto(link);
  await page.getByRole("heading", { name: "Votre activité" }).waitFor();
  await page.getByRole("button", { name: "Traiteur" }).click();
  await page.getByLabel("Nom de l'activité").fill(`Table ${stamp}`);
  await page.getByLabel("Ville").fill("Bordeaux");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("link", { name: "Continuer" }).click();
  await page.waitForURL("**/espace**");
  await expect(page.getByText(`Table ${stamp}`).first()).toBeVisible();
  await expect(page.getByText("Léa & Hugo")).toHaveCount(0);
});

test("une invitation couple préremplit l'e-mail et n'affiche pas le choix de rôle", async ({ page }) => {
  await page.goto("/inscription?email=lea%40vow.test&role=couple&next=%2Finvitation%2Fabc");
  await expect(page.getByRole("button", { name: "Je suis prestataire" })).toHaveCount(0);
  await expect(page.getByLabel("E-mail")).toHaveValue("lea@vow.test");
  await page.getByRole("button", { name: "Continuer avec un mot de passe" }).click();
  await expect(page.getByRole("radio", { name: "Couple" })).toBeChecked();
});

async function readLink(request: import("@playwright/test").APIRequestContext, email: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const list = await request.get("http://127.0.0.1:54324/api/v1/search?query=" + encodeURIComponent(`to:${email}`));
    if (list.ok()) {
      const body = (await list.json()) as { messages?: Array<{ ID: string }> };
      const id = body.messages?.[0]?.ID;
      if (id) {
        const message = await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`);
        const payload = (await message.json()) as { Text?: string; HTML?: string };
        const source = `${payload.HTML ?? ""}\n${payload.Text ?? ""}`.replaceAll("&amp;", "&");
        const link = source.match(/https?:\/\/[^\s"'<]+verify[^\s"'<]*/)?.[0];
        if (link) return link;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`lien introuvable pour ${email}`);
}
