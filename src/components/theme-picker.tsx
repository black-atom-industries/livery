import type { Key } from "@black-atom/core";
import { Select } from "@inkjs/ui";
import { buildPickerOptions } from "../lib/themes.ts";

const options = buildPickerOptions();

interface ThemePickerProps {
    onSelect: (themeKey: Key) => void;
}

export function ThemePicker({ onSelect }: ThemePickerProps) {
    return (
        <Select
            options={options}
            visibleOptionCount={15}
            onChange={(value) => onSelect(value as Key)}
        />
    );
}
