import { assertEquals } from "@std/assert";
import { expandAppPaths, mergeConfig } from "./config.ts";
import { Config } from "../types/config.ts";

// --- mergeConfig ---

Deno.test("mergeConfig uses override system_appearance", () => {
    const base: Config = { system_appearance: true, apps: {} };
    const result = mergeConfig(base, { system_appearance: false });

    assertEquals(result.system_appearance, false);
});

Deno.test("mergeConfig falls back to base system_appearance", () => {
    const base: Config = { system_appearance: true, apps: {} };
    const result = mergeConfig(base, {});

    assertEquals(result.system_appearance, true);
});

Deno.test("mergeConfig merges apps from both sides", () => {
    const base: Config = {
        system_appearance: true,
        apps: { nvim: { enabled: true, config_path: "/base/nvim" } },
    };
    const result = mergeConfig(base, {
        apps: { ghostty: { enabled: true, config_path: "/override/ghostty" } },
    });

    assertEquals(result.apps.nvim?.config_path, "/base/nvim");
    assertEquals(result.apps.ghostty?.config_path, "/override/ghostty");
});

Deno.test("mergeConfig override apps win over base apps", () => {
    const base: Config = {
        system_appearance: true,
        apps: { nvim: { enabled: true, config_path: "/old/path" } },
    };
    const result = mergeConfig(base, {
        apps: { nvim: { enabled: true, config_path: "/new/path" } },
    });

    assertEquals(result.apps.nvim?.config_path, "/new/path");
});

Deno.test("mergeConfig does not mutate base", () => {
    const base: Config = { system_appearance: true, apps: {} };
    mergeConfig(base, { system_appearance: false });

    assertEquals(base.system_appearance, true);
});

// --- expandAppPaths ---

Deno.test("expandAppPaths expands tilde in config_path", () => {
    const config: Config = {
        system_appearance: true,
        apps: {
            nvim: { enabled: true, config_path: "~/.config/nvim/lua/config.lua" },
        },
    };

    const result = expandAppPaths(config);
    const home = Deno.env.get("HOME") ?? "";

    assertEquals(result.apps.nvim?.config_path, `${home}/.config/nvim/lua/config.lua`);
});

Deno.test("expandAppPaths expands tilde in themes_path", () => {
    const config: Config = {
        system_appearance: true,
        apps: {
            tmux: {
                enabled: true,
                config_path: "~/.config/tmux/themes.conf",
                themes_path: "~/repos/black-atom-industries/tmux/themes",
            },
        },
    };

    const result = expandAppPaths(config);
    const home = Deno.env.get("HOME") ?? "";

    assertEquals(result.apps.tmux?.config_path, `${home}/.config/tmux/themes.conf`);
    assertEquals(result.apps.tmux?.themes_path, `${home}/repos/black-atom-industries/tmux/themes`);
});

Deno.test("expandAppPaths leaves absolute paths unchanged", () => {
    const config: Config = {
        system_appearance: false,
        apps: {
            ghostty: { enabled: true, config_path: "/etc/ghostty/config" },
        },
    };

    const result = expandAppPaths(config);

    assertEquals(result.apps.ghostty?.config_path, "/etc/ghostty/config");
});

Deno.test("expandAppPaths skips undefined apps", () => {
    const config: Config = {
        system_appearance: true,
        apps: {},
    };

    const result = expandAppPaths(config);

    assertEquals(result.apps, {});
});

Deno.test("expandAppPaths preserves system_appearance", () => {
    const config: Config = {
        system_appearance: false,
        apps: {
            nvim: { enabled: true, config_path: "~/.config/nvim/lua/config.lua" },
        },
    };

    const result = expandAppPaths(config);

    assertEquals(result.system_appearance, false);
});
