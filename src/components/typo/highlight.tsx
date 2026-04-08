import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./highlight.module.css";

export const highlightVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "accentAlt",
    },
});

type Props =
    & Omit<React.ComponentProps<"span">, "color">
    & VariantProps<typeof highlightVariants>;

export function Highlight({ children, className, color, ...props }: Props) {
    return (
        <span
            data-component="Typo-Highlight"
            className={cx(highlightVariants({ color }), className)}
            {...props}
        >
            {children}
        </span>
    );
}
