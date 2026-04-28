import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./list.module.css";

export const listVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "default",
        font: "body",
    },
});

type UlProps =
    & Omit<React.ComponentProps<"ul">, "color">
    & VariantProps<typeof listVariants>;

export function UnorderedList({ children, className, color, font, ...props }: UlProps) {
    return (
        <ul
            data-component="Typo-UnorderedList"
            className={cx(listVariants({ color, font }), styles.unordered, className)}
            {...props}
        >
            {children}
        </ul>
    );
}

type OlProps =
    & Omit<React.ComponentProps<"ol">, "color">
    & VariantProps<typeof listVariants>;

export function OrderedList({ children, className, color, font, ...props }: OlProps) {
    return (
        <ol
            data-component="Typo-OrderedList"
            className={cx(listVariants({ color, font }), styles.ordered, className)}
            {...props}
        >
            {children}
        </ol>
    );
}
