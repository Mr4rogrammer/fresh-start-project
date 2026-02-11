import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-md hover:shadow-glow-primary hover:brightness-110 active:scale-[0.98]",
        destructive: "bg-gradient-danger text-destructive-foreground shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98]",
        outline: "border-2 border-border bg-transparent hover:bg-muted/50 hover:border-primary/50 active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:scale-[0.98]",
        ghost: "hover:bg-muted/60 active:scale-[0.98]",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-accent text-primary-foreground shadow-md hover:shadow-glow-accent hover:brightness-110 active:scale-[0.98]",
        premium: "bg-gradient-primary text-primary-foreground shadow-lg hover:shadow-glow-primary hover:brightness-110 active:scale-[0.98] animate-pulse-glow",
        glass: "glass border-border/50 hover:bg-card/90 hover:border-primary/30 active:scale-[0.98]",
        success: "bg-gradient-success text-primary-foreground shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
        "icon-lg": "h-12 w-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
