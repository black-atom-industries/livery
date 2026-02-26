import { Store } from "@tanstack/store";
import type { ThemeDefinition } from "@black-atom/core";
import type { UpdateResult } from "../types/updaters.ts";

export interface AppState {
    phase: "picking" | "applying" | "done";
    selectedTheme: ThemeDefinition | null;
    updaterResults: UpdateResult[];
}

export const appStore = new Store<AppState>({
    phase: "picking",
    selectedTheme: null,
    updaterResults: [],
});
