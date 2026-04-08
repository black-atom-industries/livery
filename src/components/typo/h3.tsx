import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./h3.module.css";

export const h3Variants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "main",
    },
});

type Props =
    & Omit<React.ComponentProps<"h3">, "color">
    & VariantProps<typeof h3Variants>;

export function H3({ children, className, color, ...props }: Props) {
    return (
        <h3 data-component="Typo-H3" className={cx(h3Variants({ color }), className)} {...props}>
            {children}
        </h3>
    );
}
