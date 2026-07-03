import { cva, type VariantProps } from "cva";
import styles from "./badge.module.css";

export const badgeVariants = cva({
    base: styles.root,
    variants: {},
    defaultVariants: {},
});

type Props = VariantProps<typeof badgeVariants> & {
    children: React.ReactNode;
    className?: string;
};

export function Badge({ children, className }: Props) {
    return (
        <span
            data-component="badge"
            className={badgeVariants({ className })}
        >
            {children}
        </span>
    );
}
