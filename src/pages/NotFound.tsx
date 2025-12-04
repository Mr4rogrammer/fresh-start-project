import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-subtle">
      <div className="text-center space-y-8 p-8 glass-strong rounded-3xl max-w-md mx-4 animate-scale-in shadow-elegant-xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-danger mb-4 shadow-lg">
          <h1 className="text-5xl font-bold text-primary-foreground">404</h1>
        </div>
        <div className="space-y-4">
          <p className="text-3xl font-bold gradient-text">Oops! Page not found</p>
          <p className="text-muted-foreground text-lg">The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <a href="/" className="inline-block">
          <Button variant="gradient" size="lg" className="gap-2">
            Return to Home
          </Button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
