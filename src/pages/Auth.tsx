import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TrendingUp, Shield, BarChart3 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/home");
    }
  }, [user, loading, navigate]);

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Google Sign-In Error:", error);
      toast.error(`Authentication failed: ${error}`);
    } else {
      toast.success("Welcome back!");
      navigate("/home");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full bg-primary/20 blur-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background - softer, calmer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] animate-glow" style={{ animationDelay: "1.5s" }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-primary shadow-glow-primary animate-scale-in">
            <TrendingUp className="h-10 w-10 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold gradient-text">
              Tradeify
            </h1>
            <p className="text-muted-foreground text-lg">
              Your mindful trading companion
            </p>
          </div>
        </div>

        {/* Sign in card */}
        <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-8 border border-border/50 shadow-xl space-y-6 animate-scale-in" style={{ animationDelay: "0.1s" }}>
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold text-foreground">Welcome</h2>
            <p className="text-muted-foreground">
              Sign in to continue your trading journey
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full gap-3 h-12 text-base font-medium hover:bg-muted/50 border-2"
            size="lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-card text-muted-foreground">Secure & Private</span>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Track Progress</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/30">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Data Protected</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Focus on the process, not just the profits
        </p>
      </div>
    </div>
  );
};

export default Auth;
