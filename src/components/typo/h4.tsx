import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./h4.module.css";

export const h4Variants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "default",
    },
});

type Props =
    & Omit<React.ComponentProps<"h4">, "color">
    & VariantProps<typeof h4Variants>;

export function H4({ children, className, color, ...props }: Props) {
    return (
        <h4 data-component="Typo-H4" className={cx(h4Variants({ color }), className)} {...props}>
            {children}
        </h4>
    );
}
