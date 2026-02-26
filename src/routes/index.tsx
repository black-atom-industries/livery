import { createFileRoute } from "@tanstack/react-router";
import { themeMap } from "@black-atom/core";
import { ThemePicker } from "../containers/theme-picker.tsx";

export const Route = createFileRoute("/")({
    component: IndexRoute,
});

function IndexRoute() {
    return <ThemePicker themeMap={themeMap} />;
}
