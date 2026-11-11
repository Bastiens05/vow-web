export function configuredAuthProviders(): { google: boolean; apple: boolean } {
  return {
    google: process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true",
    apple: process.env.NEXT_PUBLIC_AUTH_APPLE === "true",
  };
}

export function otpCodeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_OTP_CODE === "true";
}
