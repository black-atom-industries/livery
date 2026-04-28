import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./p.module.css";

export const pVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "default",
        font: "body",
    },
});

type Props =
    & Omit<React.ComponentProps<"p">, "color">
    & VariantProps<typeof pVariants>;

export function P({ children, className, color, font, ...props }: Props) {
    return (
        <p data-component="Typo-P" className={cx(pVariants({ color, font }), className)} {...props}>
            {children}
        </p>
    );
}
