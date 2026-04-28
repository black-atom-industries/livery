import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./h3.module.css";

export const h3Variants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "default",
        font: "heading",
    },
});

type Props =
    & Omit<React.ComponentProps<"h3">, "color">
    & VariantProps<typeof h3Variants>;

export function H3({ children, className, color, font, ...props }: Props) {
    return (
        <h3
            data-component="Typo-H3"
            className={cx(h3Variants({ color, font }), className)}
            {...props}
        >
            {children}
        </h3>
    );
}
