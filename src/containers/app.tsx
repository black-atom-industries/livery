import { themeBundle as themeMap } from "@black-atom/core";
import denoConfig from "../../deno.json" with { type: "json" };
import { ThemePicker } from "./theme-picker.tsx";

export function App() {
    return <ThemePicker themeMap={themeMap} version={denoConfig.version} />;
}
