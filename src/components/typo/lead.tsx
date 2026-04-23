import { cva, cx, type VariantProps } from "cva";

import { colorVariants, fontVariants } from "./variants.ts";
import styles from "./lead.module.css";

export const leadVariants = cva({
    base: styles.root,
    variants: {
        color: colorVariants,
        font: fontVariants,
    },
    defaultVariants: {
        color: "subtle",
        font: "heading",
    },
});

type Props =
    & Omit<React.ComponentProps<"p">, "color">
    & VariantProps<typeof leadVariants>;

export function Lead({ children, className, color, font, ...props }: Props) {
    return (
        <p
            data-component="Typo-Lead"
            className={cx(leadVariants({ color, font }), className)}
            {...props}
        >
            {children}
        </p>
    );
}
