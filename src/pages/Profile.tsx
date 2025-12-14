import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldCheck, QrCode, Key, ArrowLeft, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { generateTotpSecret, verifyTotpToken, generateQrCodeUrl } from "@/lib/totp";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { applyThemeColor } from "@/components/ThemeProvider";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [totpUri, setTotpUri] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Theme colors
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [secondaryColor, setSecondaryColor] = useState("#06b6d4");

  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      checkTotpStatus();
    }
    loadThemeColors();
  }, [user]);

  const loadThemeColors = () => {
    const savedPrimary = localStorage.getItem('theme-primary');
    const savedSecondary = localStorage.getItem('theme-secondary');

    if (savedPrimary) setPrimaryColor(savedPrimary);
    if (savedSecondary) setSecondaryColor(savedSecondary);
  };

  const hexToHSL = (hex: string) => {
    hex = hex.replace('#', '');

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  const applyThemeColor = (variable: string, color: string) => {
    const hsl = hexToHSL(color);
    document.documentElement.style.setProperty(`--${variable}`, hsl);

    if (variable === 'primary') {
      const [h, s, l] = hsl.split(' ');
      const glowL = parseInt(l) + 5;
      document.documentElement.style.setProperty(`--primary-glow`, `${h} ${s} ${glowL}%`);
    }
  };

  const handlePrimaryColorChange = (color: string) => {
    setPrimaryColor(color);
    applyThemeColor('primary', color);
    localStorage.setItem('theme-primary', color);
    toast.success('Primary color updated!');
  };

  const handleSecondaryColorChange = (color: string) => {
    setSecondaryColor(color);
    applyThemeColor('accent', color);
    localStorage.setItem('theme-secondary', color);
    toast.success('Secondary color updated!');
  };

  const resetThemeColors = () => {
    const defaultPrimary = '#6366f1';
    const defaultSecondary = '#06b6d4';

    setPrimaryColor(defaultPrimary);
    setSecondaryColor(defaultSecondary);

    applyThemeColor('primary', defaultPrimary);
    applyThemeColor('accent', defaultSecondary);

    localStorage.removeItem('theme-primary');
    localStorage.removeItem('theme-secondary');

    toast.success('Theme colors reset to default!');

    // Reload page to apply default colors
    window.location.reload();
  };

  const checkTotpStatus = async () => {
    if (!user) return;

    try {
      const totpRef = ref(db, `users/${user.uid}/totp`);
      const snapshot = await get(totpRef);
      setTotpEnabled(snapshot.exists());
    } catch (error) {
      console.error("Error checking TOTP status:", error);
    }
  };

  const handleEnrollTotp = async () => {
    if (!user || !user.email) return;

    try {
      setIsEnrolling(true);

      // Generate TOTP secret and URI
      const { secret, uri } = generateTotpSecret(user.email);
      setTotpSecret(secret);
      setTotpUri(uri);

      // Generate QR code URL
      const qrUrl = generateQrCodeUrl(uri);
      setQrCodeUrl(qrUrl);

      toast.success("Scan the QR code with your authenticator app");
    } catch (error: any) {
      console.error("Error enrolling TOTP:", error);
      toast.error("Failed to generate TOTP secret");
      setIsEnrolling(false);
    }
  };

  const handleVerifyAndFinalize = async () => {
    if (!user || !totpSecret || !verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }

    try {
      // Verify the code
      const isValid = verifyTotpToken(verificationCode, totpSecret);

      if (!isValid) {
        toast.error("Invalid verification code. Please try again.");
        return;
      }

      // Save TOTP secret to database
      const totpRef = ref(db, `users/${user.uid}/totp`);
      await set(totpRef, {
        secret: totpSecret,
        enabled: true,
        createdAt: new Date().toISOString(),
      });

      toast.success("2-Step Verification enabled successfully!");
      setTotpEnabled(true);
      setIsEnrolling(false);
      setQrCodeUrl("");
      setTotpSecret("");
      setTotpUri("");
      setVerificationCode("");
    } catch (error: any) {
      console.error("Error verifying TOTP:", error);
      toast.error("Failed to enable 2-Step Verification");
    }
  };

  const handleUnenroll = async () => {
    if (!user) return;

    const performUnenroll = async () => {
      try {
        const totpRef = ref(db, `users/${user.uid}/totp`);
        await remove(totpRef);
        setTotpEnabled(false);
        toast.success("2-Step Verification disabled");
      } catch (error: any) {
        console.error("Error unenrolling TOTP:", error);
        toast.error("Failed to disable 2-Step Verification");
      }
    };

    requireVerification(performUnenroll);
  };

  const cancelEnrollment = () => {
    setIsEnrolling(false);
    setQrCodeUrl("");
    setTotpSecret("");
    setTotpUri("");
    setVerificationCode("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-slide-down">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2 mb-3"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-5xl font-bold gradient-text mb-2">Profile Settings</h1>
            <p className="text-muted-foreground text-lg">Manage your account, security and appearance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Info Card with 2-Step Verification */}
          <Card className="glass hover-lift animate-fade-in border-2">
            <CardHeader>
              <CardTitle className="text-2xl gradient-text">Account Information</CardTitle>
              <CardDescription>Your account details and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border/50">
                <div className="relative">
                  <img
                    src={user.photoURL || "https://via.placeholder.com/80"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full ring-4 ring-primary/30 shadow-glow-primary"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-primary rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <p className="text-xl font-semibold">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* 2-Step Verification Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {totpEnabled ? (
                    <ShieldCheck className="h-5 w-5 text-profit animate-pulse" />
                  ) : (
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  )}
                  <h3 className="text-lg font-semibold">2-Step Verification</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security when performing sensitive actions.
                </p>

                {!totpEnabled && !isEnrolling && (
                  <div className="animate-fade-in">
                    <Button onClick={handleEnrollTotp} variant="gradient" size="sm" className="gap-2">
                      <Key className="h-4 w-4" />
                      Enable 2-Step Verification
                    </Button>
                  </div>
                )}

                {isEnrolling && qrCodeUrl && (
                  <div className="space-y-4">
                    <div className="bg-gradient-subtle rounded-xl p-4 space-y-4 border-2 border-border/50">
                      <div className="flex items-start gap-2">
                        <QrCode className="h-4 w-4 text-primary mt-1" />
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Step 1: Scan QR Code</h4>
                          <p className="text-xs text-muted-foreground">
                            Open your authenticator app and scan this code:
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center bg-white p-3 rounded-lg shadow-inner">
                        {qrCodeUrl ? (
                          <img
                            src={qrCodeUrl}
                            alt="TOTP QR Code"
                            className="w-40 h-40"
                            onError={(e) => {
                              console.error("QR code failed to load");
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-40 h-40 flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Loading...</p>
                          </div>
                        )}
                      </div>
                      {totpSecret && (
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">
                            Can't scan? Enter manually:
                          </p>
                          <code className="text-xs bg-background px-2 py-1 rounded break-all font-mono">
                            {totpSecret}
                          </code>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verification-code" className="text-sm">Step 2: Enter Code</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="h-12 text-center font-mono border-2"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleVerifyAndFinalize}
                        disabled={verificationCode.length !== 6}
                        variant="gradient"
                        size="sm"
                        className="flex-1"
                      >
                        Verify & Enable
                      </Button>
                      <Button
                        variant="outline"
                        onClick={cancelEnrollment}
                        size="sm"
                        className="flex-1 border-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {totpEnabled && (
                  <div className="space-y-3 animate-fade-in">
                    <div className="bg-profit/15 dark:bg-profit/20 rounded-xl p-4 border-2 border-profit/40">
                      <div className="flex items-center gap-2 text-profit dark:text-profit-light mb-1">
                        <ShieldCheck className="h-4 w-4 animate-pulse" />
                        <p className="font-semibold text-sm">2-Step Verification is enabled</p>
                      </div>
                      <p className="text-xs text-profit/80 dark:text-profit-light/80">
                        Your account is protected with authenticator verification.
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleUnenroll}
                      size="sm"
                      className="w-full gap-2"
                    >
                      Disable 2-Step Verification
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Theme Customization Card */}

        </div>

        <TotpVerificationModal
          open={isVerificationRequired}
          onClose={cancelVerification}
          onVerify={handleVerificationSuccess}
          title="Verify to Disable 2-Step Verification"
          description="Enter your 6-digit code to confirm disabling 2-Step Verification"
        />
      </div>
    </div>
  );
};

export default Profile;