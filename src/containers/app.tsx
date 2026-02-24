import { getGroupedThemes } from "../lib/themes.ts";
import { ThemePicker } from "./theme-picker.tsx";

const groups = getGroupedThemes();
const themes = groups.flatMap((g) => g.themes);

export function App() {
    return <ThemePicker groups={groups} themes={themes} version="0.0.2" />;
}
