import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./inline-code.module.css";

export const inlineCodeVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "default",
        font: "mono",
    },
});

type Props =
    & Omit<React.ComponentProps<"code">, "color">
    & VariantProps<typeof inlineCodeVariants>;

export function InlineCode({ children, className, color, font, ...props }: Props) {
    return (
        <code
            data-component="Typo-InlineCode"
            className={cx(inlineCodeVariants({ color, font }), className)}
            {...props}
        >
            {children}
        </code>
    );
}
