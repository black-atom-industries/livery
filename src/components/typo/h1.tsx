import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./h1.module.css";

export const h1Variants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "default",
    },
});

type Props =
    & Omit<React.ComponentProps<"h1">, "color">
    & VariantProps<typeof h1Variants>;

export function H1({ children, className, color, ...props }: Props) {
    return (
        <h1 data-component="Typo-H1" className={cx(h1Variants({ color }), className)} {...props}>
            {children}
        </h1>
    );
}
