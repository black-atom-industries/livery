import { cva, cx, type VariantProps } from "cva";

import { colorVariants } from "./colors.ts";
import styles from "./lead.module.css";

export const leadVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
    },
    defaultVariants: {
        color: "subtle",
    },
});

type Props =
    & Omit<React.ComponentProps<"p">, "color">
    & VariantProps<typeof leadVariants>;

export function Lead({ children, className, color, ...props }: Props) {
    return (
        <p data-component="Typo-Lead" className={cx(leadVariants({ color }), className)} {...props}>
            {children}
        </p>
    );
}
