import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldCheck, QrCode, Key, ArrowLeft, Palette, RotateCcw, Download, Smartphone, CheckCircle2, CloudUpload, Loader2, HardDrive, Send, Bot, Scale } from "lucide-react";
import { toast } from "sonner";
import { ref, set, get, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { generateTotpSecret, verifyTotpToken, generateQrCodeUrl } from "@/lib/totp";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";
import { applyThemeColor } from "@/components/ThemeProvider";
import { backupToGoogleDrive, listBackups } from "@/lib/backup";
import { loadTelegramConfig, saveTelegramConfig, testTelegramConnection, TelegramConfig } from "@/lib/telegram";
import { useTradingRules, DEFAULT_RULES, TradingRules } from "@/hooks/useTradingRules";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const { user, loading, getAccessToken } = useAuth();
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

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Backup
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // Telegram
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgLoaded, setTgLoaded] = useState(false);

  // Trading Rules
  const { rules, saveRules, loaded: rulesLoaded } = useTradingRules();
  const [rulesForm, setRulesForm] = useState<TradingRules>(DEFAULT_RULES);
  const [rulesSaving, setRulesSaving] = useState(false);

  useEffect(() => {
    if (rulesLoaded) setRulesForm(rules);
  }, [rulesLoaded, rules]);

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
      loadTelegramConfig(user.uid).then((cfg) => {
        if (cfg) {
          setTgBotToken(cfg.botToken);
          setTgChatId(cfg.chatId);
          setTgEnabled(cfg.enabled);
        }
        setTgLoaded(true);
      });
    }
    loadThemeColors();
  }, [user]);

  // PWA install prompt listener
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Load last backup info
  useEffect(() => {
    const saved = localStorage.getItem("last_backup_time");
    if (saved) setLastBackup(saved);
  }, []);

  const handleBackup = async () => {
    if (!user) return;
    setIsBackingUp(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Please sign in again to authorize Google Drive access");
        return;
      }
      const { fileName } = await backupToGoogleDrive(token, user.uid);
      const now = new Date().toISOString();
      setLastBackup(now);
      localStorage.setItem("last_backup_time", now);
      toast.success(`Backup saved: ${fileName}`);
    } catch (error: any) {
      console.error("Backup failed:", error);
      toast.error(error.message || "Backup failed");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      toast.success("Tradeify installed successfully!");
    }
    setInstallPrompt(null);
  };

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

  // ─── Telegram handlers ───────────────────────────────────────────
  const handleTgSave = async () => {
    if (!user) return;
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      toast.error("Please fill in both Bot Token and Chat ID");
      return;
    }
    setTgSaving(true);
    try {
      await saveTelegramConfig(user.uid, {
        botToken: tgBotToken.trim(),
        chatId: tgChatId.trim(),
        enabled: tgEnabled,
      });
      toast.success("Telegram settings saved!");
    } catch {
      toast.error("Failed to save Telegram settings");
    } finally {
      setTgSaving(false);
    }
  };

  const handleTgToggle = async () => {
    if (!user) return;
    const newEnabled = !tgEnabled;
    setTgEnabled(newEnabled);
    try {
      await saveTelegramConfig(user.uid, {
        botToken: tgBotToken.trim(),
        chatId: tgChatId.trim(),
        enabled: newEnabled,
      });
      toast.success(newEnabled ? "Telegram notifications enabled" : "Telegram notifications disabled");
    } catch {
      setTgEnabled(!newEnabled);
      toast.error("Failed to update");
    }
  };

  const handleTgTest = async () => {
    if (!tgBotToken.trim() || !tgChatId.trim()) {
      toast.error("Please enter Bot Token and Chat ID first");
      return;
    }
    setTgTesting(true);
    try {
      const ok = await testTelegramConnection(tgBotToken.trim(), tgChatId.trim());
      if (ok) {
        toast.success("Test message sent! Check your Telegram.");
      } else {
        toast.error("Failed to send. Check your token and chat ID.");
      }
    } catch {
      toast.error("Connection failed");
    } finally {
      setTgTesting(false);
    }
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
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-fade-in">
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 animate-slide-down">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 w-fit"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Profile Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your account, security and appearance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* User Info Card with 2-Step Verification */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl">Account Information</CardTitle>
              <CardDescription>Your account details and security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border/50">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full ring-4 ring-primary/30 overflow-hidden bg-primary/10 flex items-center justify-center">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {user.displayName?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background"></div>
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

          {/* Data Backup Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Trading Rules
              </CardTitle>
              <CardDescription>Set discipline rules — get warned when you break them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Rules Enabled</Label>
                <Switch
                  checked={rulesForm.enabled}
                  onCheckedChange={(checked) => setRulesForm(prev => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Max Trades Per Day</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rulesForm.maxTradesPerDay}
                    onChange={(e) => setRulesForm(prev => ({ ...prev, maxTradesPerDay: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="0 = unlimited"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">0 = no limit</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max Daily Loss ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={rulesForm.maxLossPerDay}
                    onChange={(e) => setRulesForm(prev => ({ ...prev, maxLossPerDay: parseFloat(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="0 = unlimited"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">0 = no limit</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stop After Consecutive Losses</Label>
                  <Input
                    type="number"
                    min={0}
                    value={rulesForm.stopAfterConsecutiveLosses}
                    onChange={(e) => setRulesForm(prev => ({ ...prev, stopAfterConsecutiveLosses: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    placeholder="0 = disabled"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">0 = disabled</p>
                </div>
              </div>

              <Button
                onClick={async () => {
                  setRulesSaving(true);
                  try {
                    await saveRules(rulesForm);
                    toast.success("Trading rules saved");
                  } catch {
                    toast.error("Failed to save rules");
                  } finally {
                    setRulesSaving(false);
                  }
                }}
                disabled={rulesSaving}
                className="w-full gap-2"
              >
                {rulesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Rules
              </Button>
            </CardContent>
          </Card>

          {/* Data Backup Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Data Backup
              </CardTitle>
              <CardDescription>Backup all your data to Google Drive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  Export all your challenges, trades, journals, notes, links, checklists, and settings as a JSON file to your Google Drive.
                </p>
              </div>
              {lastBackup && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-profit" />
                  Last backup: {new Date(lastBackup).toLocaleString()}
                </div>
              )}
              <Button
                onClick={handleBackup}
                disabled={isBackingUp}
                variant="gradient"
                className="w-full gap-2"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Backing up...
                  </>
                ) : (
                  <>
                    <CloudUpload className="h-4 w-4" />
                    Backup to Google Drive
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Telegram Notifications Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Send className="h-5 w-5 text-[#229ED9]" />
                Telegram Notifications
              </CardTitle>
              <CardDescription>Get kill zone alerts and goal notifications on Telegram</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-2">
                <p className="text-xs text-muted-foreground">1. Open Telegram → search <b>@BotFather</b> → send <code>/newbot</code> → copy the token</p>
                <p className="text-xs text-muted-foreground">2. Search <b>@userinfobot</b> → it replies with your Chat ID</p>
                <p className="text-xs text-muted-foreground">3. <b>Start a chat with your bot</b> (send /start)</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tg-token" className="text-sm">Bot Token</Label>
                  <Input
                    id="tg-token"
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={tgBotToken}
                    onChange={(e) => setTgBotToken(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tg-chatid" className="text-sm">Chat ID</Label>
                  <Input
                    id="tg-chatid"
                    placeholder="1234567890"
                    value={tgChatId}
                    onChange={(e) => setTgChatId(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 border border-border/50">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Notifications {tgEnabled ? "enabled" : "disabled"}</span>
                </div>
                <button
                  onClick={handleTgToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    tgEnabled ? "bg-profit" : "bg-muted-foreground/30"
                  }`}
                  disabled={!tgBotToken.trim() || !tgChatId.trim()}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tgEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTgSave}
                  disabled={tgSaving || !tgBotToken.trim() || !tgChatId.trim()}
                  variant="gradient"
                  className="flex-1 gap-2"
                  size="sm"
                >
                  {tgSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Save
                </Button>
                <Button
                  onClick={handleTgTest}
                  disabled={tgTesting || !tgBotToken.trim() || !tgChatId.trim()}
                  variant="outline"
                  className="flex-1 gap-2"
                  size="sm"
                >
                  {tgTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Install App Card */}
          <Card className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg transition-shadow animate-fade-in">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Install App
              </CardTitle>
              <CardDescription>Install Tradeify on your device for quick access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isInstalled ? (
                <div className="bg-profit/15 dark:bg-profit/20 rounded-xl p-4 border-2 border-profit/40">
                  <div className="flex items-center gap-2 text-profit dark:text-profit-light mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <p className="font-semibold text-sm">App is installed</p>
                  </div>
                  <p className="text-xs text-profit/80 dark:text-profit-light/80">
                    Tradeify is installed on your device. You can access it from your home screen.
                  </p>
                </div>
              ) : installPrompt ? (
                <div className="space-y-3">
                  <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                        <Download className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ready to install</p>
                        <p className="text-xs text-muted-foreground">Get quick access from your home screen with offline support</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleInstallApp} variant="gradient" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Install Tradeify
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                    <p className="text-sm text-muted-foreground mb-3">
                      Install Tradeify as an app on your device:
                    </p>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-primary">Chrome/Edge:</span>
                        <span>Click the install icon in the address bar</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-primary">Safari (iOS):</span>
                        <span>Tap Share → "Add to Home Screen"</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-primary">Android:</span>
                        <span>Tap menu → "Add to Home screen"</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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