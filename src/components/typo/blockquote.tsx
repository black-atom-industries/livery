import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./blockquote.module.css";

export const blockquoteVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "subtle",
        font: "body",
    },
});

type Props =
    & Omit<React.ComponentProps<"blockquote">, "color">
    & VariantProps<typeof blockquoteVariants>;

export function Blockquote({ children, className, color, font, ...props }: Props) {
    return (
        <blockquote
            data-component="Typo-Blockquote"
            className={cx(blockquoteVariants({ color, font }), className)}
            {...props}
        >
            {children}
        </blockquote>
    );
}
