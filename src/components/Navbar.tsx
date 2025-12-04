import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, BarChart3, LogOut, Moon, Sun, Menu, Home, ChevronDown, List, FileText, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { useChallenge } from "@/contexts/ChallengeContext";
import { useData } from "@/contexts/DataContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useTotpVerification } from "@/hooks/useTotpVerification";
import { TotpVerificationModal } from "@/components/TotpVerificationModal";

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { selectedChallenge, setSelectedChallenge } = useChallenge();
  const { challenges } = useData();
  
  const {
    isVerificationRequired,
    requireVerification,
    handleVerificationSuccess,
    cancelVerification,
  } = useTotpVerification();
  
  const isHomePage = location.pathname === "/home";
  const isProfilePage = location.pathname === "/profile";
  const shouldShowChallengeNav = !isHomePage && !isProfilePage && selectedChallenge;

  const handleSignOut = async () => {
    const performSignOut = async () => {
      const { error } = await signOut();
      if (error) {
        toast.error("Failed to sign out");
      } else {
        navigate("/");
        toast.success("Signed out successfully");
      }
    };

    requireVerification(performSignOut);
  };

  return (
    <nav className="border-b border-border/30 glass-premium sticky top-0 z-50 shadow-premium">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-8">
            <Link to="/home" className="hover:scale-105 transition-transform duration-300">
              <h1 className="text-3xl font-bold gradient-text cursor-pointer">
                Tradeify
              </h1>
            </Link>

            {/* Only show navigation when not on home or profile page */}
            {shouldShowChallengeNav && (
              <>
                {/* Challenge Switcher - Desktop */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 hidden md:flex border-2 h-11 px-5 hover:border-primary/50 transition-all">
                      <span className="font-semibold">{selectedChallenge.name}</span>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass-strong border-2 min-w-[240px]">
                    {challenges.map((challenge) => (
                      <DropdownMenuItem
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="cursor-pointer py-3 px-4 text-base"
                      >
                        {challenge.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/home")} className="cursor-pointer py-3 px-4 text-base font-semibold text-primary">
                      View All Challenges
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="hidden md:flex gap-2">
                  <Link to="/dashboard">
                    <Button
                      variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                      className="gap-2 transition-all hover:scale-105 h-11 px-4"
                    >
                      <BarChart3 className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>

                  <Link to="/calendar">
                    <Button
                      variant={location.pathname === "/calendar" ? "default" : "ghost"}
                      className="gap-2 transition-all hover:scale-105 h-11 px-4"
                    >
                      <Calendar className="h-4 w-4" />
                      Calendar
                    </Button>
                  </Link>

                  <Link to="/trades">
                    <Button
                      variant={location.pathname === "/trades" ? "default" : "ghost"}
                      className="gap-2 transition-all hover:scale-105 h-11 px-4"
                    >
                      <List className="h-4 w-4" />
                      Trade List
                    </Button>
                  </Link>

                  {/* Additional Tools - Available in challenge pages */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 transition-all hover:scale-105 h-11 px-4">
                        <Menu className="h-4 w-4" />
                        Additional Tools
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="glass-strong border-2 w-56">
                      <DropdownMenuItem onClick={() => navigate("/notes")} className="cursor-pointer py-3">
                        Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/links")} className="cursor-pointer py-3">
                        Links
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <Link to="/profile" className="hidden md:flex items-center gap-3 mr-2 cursor-pointer hover:opacity-90 transition-all group">
                <img
                  src={user.photoURL || "https://via.placeholder.com/40"}
                  alt="Profile"
                  className="w-10 h-10 rounded-full ring-2 ring-primary/30 transition-all group-hover:ring-primary/60 group-hover:scale-105"
                />
                <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                  {user.displayName}
                </span>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="transition-all hover:scale-110 h-11 w-11"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="transition-all hover:scale-110 hover:text-destructive h-11 w-11"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && (
          <div className="md:hidden flex gap-2 pb-4">
            {shouldShowChallengeNav && (
              <>
                {/* Challenge Switcher - Mobile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-between border-2 h-11">
                      <span className="truncate text-sm font-semibold">{selectedChallenge.name}</span>
                      <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="glass-strong border-2 w-56">
                    {challenges.map((challenge) => (
                      <DropdownMenuItem
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className="cursor-pointer py-3"
                      >
                        {challenge.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/home")} className="cursor-pointer py-3 font-semibold text-primary">
                      View All Challenges
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link to="/calendar" className="flex-1">
                  <Button
                    variant={location.pathname === "/calendar" ? "default" : "ghost"}
                    className="w-full gap-2 h-11"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/dashboard" className="flex-1">
                  <Button
                    variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                    className="w-full gap-2 h-11"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/trades" className="flex-1">
                  <Button
                    variant={location.pathname === "/trades" ? "default" : "ghost"}
                    className="w-full gap-2 h-11"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}

            {/* Always show Notes and Links on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex-1 h-11">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong border-2 w-56">
                <DropdownMenuLabel className="text-base">Tools</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/notes")} className="cursor-pointer py-3">
                  <FileText className="h-4 w-4 mr-2" />
                  Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/links")} className="cursor-pointer py-3">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Links
                </DropdownMenuItem>
                {!shouldShowChallengeNav && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/home")} className="cursor-pointer py-3">
                      <Home className="h-4 w-4 mr-2" />
                      Challenges
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <TotpVerificationModal
        open={isVerificationRequired}
        onClose={cancelVerification}
        onVerify={handleVerificationSuccess}
        title="Verify to Sign Out"
        description="Enter your 6-digit code to confirm signing out"
      />
    </nav>
  );
};
