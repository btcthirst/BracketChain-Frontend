import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-[150ms] disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1",
    {
        variants: {
            variant: {
                // Зелена брендова кнопка — Join, Start, Create, Connect
                primary:
                    "bg-accent text-[#06070b] font-bold hover:bg-accent-hover shadow-[0_0_18px_rgba(34,212,126,0.28)] hover:shadow-[0_0_28px_rgba(34,212,126,0.48)] disabled:bg-white/[0.06] disabled:text-white/25 disabled:shadow-none",
                // Прозора з рамкою — Cancel (в модалці), Share, Back
                outline:
                    "border border-white/[0.12] bg-transparent text-white/55 hover:border-white/[0.22] hover:text-white disabled:opacity-40",
                // Небезпечна дія — Cancel Tournament & Refund
                destructive:
                    "bg-red/[0.08] border border-red/25 text-red hover:bg-red/[0.15] disabled:opacity-40",
                // Попередження — Start Early, Continue Init
                warning:
                    "bg-amber/[0.12] border border-amber/30 text-amber hover:bg-amber/[0.20] disabled:opacity-40",
                // Без фону — Back, іконка-кнопка, текстові дії
                ghost:
                    "bg-transparent text-white/40 hover:bg-white/[0.05] hover:text-white/70 disabled:opacity-40",
                link: "text-accent underline-offset-4 hover:underline",
            },
            size: {
                default: "h-9 px-5 rounded-[8px] text-sm font-semibold",
                sm:      "h-7 px-3 rounded-[6px] text-xs gap-1.5",
                lg:      "h-12 px-6 rounded-[10px] text-sm",
                icon:    "size-8 rounded-[8px]",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    },
);

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean;
    }) {
    const Comp = asChild ? Slot : "button";
    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
