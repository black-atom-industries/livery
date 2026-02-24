import { Box, Text } from "ink";

interface StatusLineProps {
    currentTheme: string | null;
    appearance: "light" | "dark" | null;
}

export function StatusLine({ currentTheme, appearance }: StatusLineProps) {
    if (!currentTheme) {
        return (
            <Box>
                <Text dimColor>Current: unknown</Text>
            </Box>
        );
    }

    const suffix = appearance ? ` (${appearance})` : "";
    return (
        <Box>
            <Text dimColor>Current: {currentTheme}{suffix}</Text>
        </Box>
    );
}
