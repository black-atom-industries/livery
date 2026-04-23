import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./small.module.css";

export const smallVariants = cva({
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
    & Omit<React.ComponentProps<"small">, "color">
    & VariantProps<typeof smallVariants>;

export function Small({ children, className, color, font, ...props }: Props) {
    return (
        <small
            data-component="Typo-Small"
            className={cx(smallVariants({ color, font }), className)}
            {...props}
        >
            {children}
        </small>
    );
}
