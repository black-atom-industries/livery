import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./h4.module.css";

export const h4Variants = cva({
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
    & Omit<React.ComponentProps<"h4">, "color">
    & VariantProps<typeof h4Variants>;

export function H4({ children, className, color, font, ...props }: Props) {
    return (
        <h4
            data-component="Typo-H4"
            className={cx(h4Variants({ color, font }), className)}
            {...props}
        >
            {children}
        </h4>
    );
}
