import { cva, type VariantProps } from "cva";
import styles from "./button.module.css";

export const buttonVariants = cva({
    base: styles.root,
    variants: {
        intent: {
            primary: styles.intentPrimary,
            secondary: styles.intentSecondary,
            ghost: styles.intentGhost,
        },
    },
    defaultVariants: {
        intent: "secondary",
    },
});

type Props = VariantProps<typeof buttonVariants> & {
    /** Single-key hotkey shown inside the brackets, tinted positive (e.g. "r"). */
    hotkey?: string;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
};

/**
 * Actuator-style button — bracket notation `[ LABEL ]`, the visual signature
 * for interactive elements. Mono uppercase, 0 radius, no shadows.
 *
 * Intents: `primary` (filled contrast, bold), `secondary` (1px strong
 * border, default), `ghost` (text only, subtle fg).
 *
 * Spec: docs/design-system/reference/components/actions/Button.jsx
 */
export function Button({ intent, hotkey, children, onClick, disabled, className }: Props) {
    return (
        <button
            data-component="button"
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={buttonVariants({ intent, className })}
        >
            [ {hotkey && <span className={styles.hotkey}>{hotkey}&nbsp;</span>}
            {children} ]
        </button>
    );
}
