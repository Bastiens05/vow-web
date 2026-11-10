import { buttonClass } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className={buttonClass("secondary", "w-full")}>
        Se déconnecter
      </button>
    </form>
  );
}
