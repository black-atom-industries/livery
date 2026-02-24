import type { Key } from "@black-atom/core";
import { Box, Text, useApp } from "ink";
import { useState } from "react";
import type { AppPhase } from "../types/app.ts";
import { StatusLine } from "./status-line.tsx";
import { ThemePicker } from "./theme-picker.tsx";

export function App() {
    const { exit } = useApp();
    const [phase, _setPhase] = useState<AppPhase>({ phase: "picking" });

    const handleSelect = (themeKey: Key) => {
        console.log(`Selected: ${themeKey}`);
        exit();
    };

    return (
        <Box flexDirection="column" padding={1}>
            <Text bold color="cyan">Livery</Text>
            <StatusLine currentTheme={null} appearance={null} />
            <Box marginTop={1}>
                {phase.phase === "picking" && <ThemePicker onSelect={handleSelect} />}
            </Box>
        </Box>
    );
}
