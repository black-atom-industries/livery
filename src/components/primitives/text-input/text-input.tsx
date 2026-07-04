import { cva, type VariantProps } from "cva";
import styles from "./text-input.module.css";

export const textInputVariants = cva({
    base: styles.field,
    variants: {
        editing: {
            true: styles.editing,
            false: "",
        },
    },
    defaultVariants: {
        editing: false,
    },
});

type Props = VariantProps<typeof textInputVariants> & {
    /** Uppercase field label, e.g. "CONFIG_PATH". */
    label?: string;
    value?: string;
    placeholder?: string;
    /** Appends "· OPTIONAL" to the label. */
    optional?: boolean;
    /** Editing hint, e.g. "⏎ SAVE · esc REVERT". Shown only while editing. */
    hint?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
    /** Fires on blur — pair with onKeyDownCapture-driven Enter commits for draft-until-commit fields. */
    onBlur?: (value: string) => void;
    /** Native key handler — e.g. commit-on-Enter or blur-on-Escape for draft fields. */
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    inputRef?: React.Ref<HTMLInputElement>;
    className?: string;
};

/**
 * Datasheet text field — uppercase mono label above, recessed 1px-bordered
 * value below. All user input renders in monospace.
 *
 * Editing state: positive border + block caret (native caret hidden via
 * `caret-color: transparent`), optional right-side hint.
 *
 * Spec: docs/design-system/reference/components/forms/TextInput.jsx
 */
export function TextInput(
    {
        label,
        value,
        placeholder,
        optional,
        editing,
        hint,
        disabled,
        onChange,
        onBlur,
        onKeyDown,
        inputRef,
        className,
    }: Props,
) {
    return (
        <div data-component="text-input" className={styles.root}>
            {label
                ? (
                    <span className={styles.label}>
                        {label}
                        {optional ? <span className={styles.optional}>· OPTIONAL</span> : null}
                    </span>
                )
                : null}
            <span className={textInputVariants({ editing, className })}>
                <input
                    ref={inputRef}
                    className={styles.input}
                    type="text"
                    value={value ?? ""}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={onChange ? (e) => onChange(e.target.value) : undefined}
                    onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
                    onKeyDown={onKeyDown}
                    readOnly={!onChange}
                />
                {editing ? <span className={styles.caret} /> : null}
                {editing && hint ? <span className={styles.hint}>{hint}</span> : null}
            </span>
        </div>
    );
}
