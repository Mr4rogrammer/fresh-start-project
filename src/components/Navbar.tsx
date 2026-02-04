import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  BarChart3, 
  LogOut, 
  Moon, 
  Sun, 
  Menu, 
  Home, 
  ChevronDown, 
  List, 
  FileText, 
  Link as LinkIcon, 
  CheckSquare,
  Sparkles
} from "lucide-react";
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
import { cn } from "@/lib/utils";

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

  const NavButton = ({ to, icon: Icon, label, isActive }: { to: string; icon: any; label: string; isActive: boolean }) => (
    <Link to={to}>
      <Button
        variant={isActive ? "default" : "ghost"}
        size="sm"
        className={cn(
          "gap-2 h-9 px-4 font-medium",
          isActive && "shadow-md"
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden lg:inline">{label}</span>
      </Button>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 glass-premium">
      {/* Top accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/home" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-lg opacity-40 group-hover:opacity-70 transition-all duration-300 group-hover:scale-110" />
                <div className="relative bg-gradient-primary p-2.5 rounded-xl shadow-lg group-hover:shadow-glow-primary transition-all duration-300">
                  <Sparkles className="h-5 w-5 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
                </div>
              </div>
              <span className="text-xl font-bold gradient-text-static hidden sm:block group-hover:opacity-80 transition-opacity">
                Tradeify
              </span>
            </Link>

            {/* Challenge Navigation - Desktop */}
            {shouldShowChallengeNav && (
              <div className="hidden md:flex items-center gap-1">
                {/* Challenge Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="gap-2 h-9 px-3 max-w-[180px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <span className="truncate">{selectedChallenge.name}</span>
                      <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 glass-strong">
                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                      Switch Challenge
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {challenges.filter(c => c.status !== "Achive").map((challenge) => (
                      <DropdownMenuItem
                        key={challenge.id}
                        onClick={() => setSelectedChallenge(challenge)}
                        className={cn(
                          "cursor-pointer",
                          challenge.id === selectedChallenge.id && "bg-primary/10 text-primary"
                        )}
                      >
                        {challenge.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => navigate("/home")} 
                      className="cursor-pointer text-primary font-medium"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      All Challenges
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="h-4 w-px bg-border/50 mx-2" />

                {/* Main Navigation */}
                <div className="flex items-center gap-1">
                  <NavButton 
                    to="/dashboard" 
                    icon={BarChart3} 
                    label="Dashboard" 
                    isActive={location.pathname === "/dashboard"} 
                  />
                  <NavButton 
                    to="/calendar" 
                    icon={Calendar} 
                    label="Calendar" 
                    isActive={location.pathname === "/calendar"} 
                  />
                  <NavButton 
                    to="/trades" 
                    icon={List} 
                    label="Trades" 
                    isActive={location.pathname === "/trades"} 
                  />
                  
                  {/* Tools Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2 h-9 px-3">
                        <Menu className="h-4 w-4" />
                        <span className="hidden lg:inline">Tools</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 glass-strong">
                      <DropdownMenuItem onClick={() => navigate("/notes")} className="cursor-pointer gap-2">
                        <FileText className="h-4 w-4" />
                        Notes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/checklists")} className="cursor-pointer gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Checklists
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/links")} className="cursor-pointer gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Links
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {user && (
              <Link 
                to="/profile" 
                className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                <img
                  src={user.photoURL || "https://via.placeholder.com/40"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all"
                />
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors max-w-[120px] truncate">
                  {user.displayName}
                </span>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {user && shouldShowChallengeNav && (
          <div className="md:hidden flex gap-1.5 pb-3 overflow-x-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 flex-shrink-0">
                  <span className="truncate max-w-[100px]">{selectedChallenge.name}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 glass-strong">
                {challenges.filter(c => c.status !== "Achive").map((challenge) => (
                  <DropdownMenuItem
                    key={challenge.id}
                    onClick={() => setSelectedChallenge(challenge)}
                    className="cursor-pointer"
                  >
                    {challenge.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/home")} className="cursor-pointer text-primary">
                  All Challenges
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/dashboard">
              <Button
                variant={location.pathname === "/dashboard" ? "default" : "ghost"}
                size="icon-sm"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/calendar">
              <Button
                variant={location.pathname === "/calendar" ? "default" : "ghost"}
                size="icon-sm"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/trades">
              <Button
                variant={location.pathname === "/trades" ? "default" : "ghost"}
                size="icon-sm"
              >
                <List className="h-4 w-4" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 glass-strong">
                <DropdownMenuItem onClick={() => navigate("/notes")} className="cursor-pointer gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/checklists")} className="cursor-pointer gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Checklists
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/links")} className="cursor-pointer gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Links
                </DropdownMenuItem>
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
