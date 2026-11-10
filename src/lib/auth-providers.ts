export function configuredAuthProviders(): { google: boolean; apple: boolean } {
  return {
    google: process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true",
    apple: process.env.NEXT_PUBLIC_AUTH_APPLE === "true",
  };
}
