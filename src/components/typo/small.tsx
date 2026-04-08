import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./small.module.css";

export const smallVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "subtle",
    },
});

type Props =
    & Omit<React.ComponentProps<"small">, "color">
    & VariantProps<typeof smallVariants>;

export function Small({ children, className, color, ...props }: Props) {
    return (
        <small
            data-component="Typo-Small"
            className={cx(smallVariants({ color }), className)}
            {...props}
        >
            {children}
        </small>
    );
}
