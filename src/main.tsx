import { Box, render, Text } from "ink";

function App() {
    return (
        <Box flexDirection="column" padding={1}>
            <Text bold color="cyan">
                Livery
            </Text>
            <Text dimColor>Deno + Ink working!</Text>
        </Box>
    );
}

render(<App />);
