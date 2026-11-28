import { Landing } from "@/components/marketing/landing";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { redirectSignedInHome } from "@/server/signed-in-home";

export default async function HomePage() {
  await redirectSignedInHome();
  return (
    <>
      <Landing />
      <Pricing />
      <SiteFooter />
    </>
  );
}
