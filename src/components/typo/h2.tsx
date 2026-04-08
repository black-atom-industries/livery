import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./h2.module.css";

export const h2Variants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "accent",
    },
});

type Props =
    & Omit<React.ComponentProps<"h2">, "color">
    & VariantProps<typeof h2Variants>;

export function H2({ children, className, color, ...props }: Props) {
    return (
        <h2 data-component="Typo-H2" className={cx(h2Variants({ color }), className)} {...props}>
            {children}
        </h2>
    );
}
