import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./h1.module.css";

export const h1Variants = cva({
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
    & Omit<React.ComponentProps<"h1">, "color">
    & VariantProps<typeof h1Variants>;

export function H1({ children, className, color, font, ...props }: Props) {
    return (
        <h1
            data-component="Typo-H1"
            className={cx(h1Variants({ color, font }), className)}
            {...props}
        >
            {children}
        </h1>
    );
}
