import { useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import type { Config } from "../types/config.ts";
import type { ToolConfig, ToolName } from "../types/tools.ts";

const TOPIC = "config" as const;
const queryKey = (keys: string[] = []) => [TOPIC, ...keys] as const;

export const useConfig = () => {
    const query = useQuery({
        queryKey: queryKey(),
        queryFn: () => invoke<Config>("get_config"),
        staleTime: Infinity, // Config only changes via our own save mutation
    });

    const enabledTools = useMemo(
        () =>
            (Object.entries(query.data?.tools ?? {}) as [ToolName, ToolConfig][])
                .filter(([_, cfg]) => cfg.enabled)
                .map(([name]) => name),
        [query.data],
    );

    // mutationKey ["config", "save"] — MutationCache auto-invalidates all ["config", ...] queries
    const save = useMutation({
        mutationKey: queryKey(["save"]),
        mutationFn: (config: Config) => invoke("save_config", { config }),
    });

    return {
        query,
        enabledTools,
        save,
    };
};
