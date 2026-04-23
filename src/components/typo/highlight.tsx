import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./highlight.module.css";

export const highlightVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "accent",
        font: "body",
    },
});

type Props =
    & Omit<React.ComponentProps<"span">, "color">
    & VariantProps<typeof highlightVariants>;

export function Highlight({ children, className, color, font, ...props }: Props) {
    return (
        <span
            data-component="Typo-Highlight"
            className={cx(highlightVariants({ color, font }), className)}
            {...props}
        >
            {children}
        </span>
    );
}
