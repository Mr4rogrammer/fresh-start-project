import { TOTP, Secret } from "otpauth";

export const generateTotpSecret = (email: string) => {
  // Generate a random secret
  const secret = new Secret({ size: 20 });
  
  // Create TOTP instance
  const totp = new TOTP({
    issuer: "ProfitMetrics",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  return {
    secret: secret.base32,
    uri: totp.toString(),
  };
};

export const verifyTotpToken = (token: string, secret: string): boolean => {
  try {
    const totp = new TOTP({
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secret),
    });

    // Verify with a window of ±1 period (30 seconds before/after)
    const delta = totp.validate({ token, window: 1 });
    return delta !== null;
  } catch (error) {
    console.error("TOTP verification error:", error);
    return false;
  }
};

export const generateQrCodeUrl = (uri: string): string => {
  // Use QR Server API which is more reliable
  const encodedUri = encodeURIComponent(uri);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUri}`;
};
