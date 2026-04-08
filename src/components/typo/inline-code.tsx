import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./inline-code.module.css";

export const inlineCodeVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "main",
    },
});

type Props =
    & Omit<React.ComponentProps<"code">, "color">
    & VariantProps<typeof inlineCodeVariants>;

export function InlineCode({ children, className, color, ...props }: Props) {
    return (
        <code
            data-component="Typo-InlineCode"
            className={cx(inlineCodeVariants({ color }), className)}
            {...props}
        >
            {children}
        </code>
    );
}
