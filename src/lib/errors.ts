export function messageFromError(error: { message: string } | null): string {
  const message = error?.message ?? "Une erreur est survenue.";
  if (message.toLowerCase().includes("row-level security") || message.toLowerCase().includes("permission denied")) {
    return "Vous n'avez pas accès à cette action.";
  }
  if (message.includes("duplicate key") && message.includes("slug")) {
    return "Ce lien public est déjà utilisé.";
  }
  if (message === "Invalid login credentials") {
    return "E-mail ou mot de passe incorrect.";
  }
  if (message.toLowerCase().includes("already registered") || message.toLowerCase().includes("already been registered")) {
    return "Un compte existe déjà avec cette adresse.";
  }
  if (message.toLowerCase().includes("password")) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  return message;
}
