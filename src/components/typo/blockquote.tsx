import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./blockquote.module.css";

export const blockquoteVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "minor",
    },
});

type Props =
    & Omit<React.ComponentProps<"blockquote">, "color">
    & VariantProps<typeof blockquoteVariants>;

export function Blockquote({ children, className, color, ...props }: Props) {
    return (
        <blockquote
            data-component="Typo-Blockquote"
            className={cx(blockquoteVariants({ color }), className)}
            {...props}
        >
            {children}
        </blockquote>
    );
}
