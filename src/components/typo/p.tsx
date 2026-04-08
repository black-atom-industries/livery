import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./p.module.css";

export const pVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "default",
    },
});

type Props =
    & Omit<React.ComponentProps<"p">, "color">
    & VariantProps<typeof pVariants>;

export function P({ children, className, color, ...props }: Props) {
    return (
        <p data-component="Typo-P" className={cx(pVariants({ color }), className)} {...props}>
            {children}
        </p>
    );
}
