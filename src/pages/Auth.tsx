import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-float opacity-60" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] float-delayed opacity-50" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-glow/15 rounded-full blur-[80px] animate-pulse-glow opacity-40" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-md w-full space-y-8 animate-fade-in relative z-10">
        <div className="text-center">
          {/* Logo with enhanced glow */}
          <div className="relative inline-block mb-8 animate-scale-in">
            <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-2xl opacity-50 animate-pulse-glow scale-110" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Calendar className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 gradient-text animate-fade-in">
            Tradeify
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Professional Trading Journal
          </p>
        </div>

        <div 
          className="glass-glow rounded-3xl p-8 sm:p-10 space-y-8 animate-scale-in" 
          style={{ animationDelay: "0.2s" }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div className="space-y-3 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold gradient-text-static">Welcome Back</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Sign in to start tracking your trades
            </p>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            variant="gradient"
            className="w-full gap-3 h-14 sm:h-16 text-base sm:text-lg group relative overflow-hidden"
            size="lg"
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            
            <svg className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
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
            <span className="relative z-10">Continue with Google</span>
          </Button>

          <div className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
              <p className="px-2">Your data is securely stored and private</p>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <p className="opacity-70">By continuing, you agree to track your trading journey</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
