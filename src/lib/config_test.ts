import { assertEquals } from "@std/assert";
import { expandToolPaths, mergeConfig } from "./config.ts";
import { Config } from "../types/config.ts";

// --- mergeConfig ---

Deno.test("mergeConfig uses override system_appearance", () => {
    const base: Config = { system_appearance: true, tools: {} };
    const result = mergeConfig(base, { system_appearance: false });

    assertEquals(result.system_appearance, false);
});

Deno.test("mergeConfig falls back to base system_appearance", () => {
    const base: Config = { system_appearance: true, tools: {} };
    const result = mergeConfig(base, {});

    assertEquals(result.system_appearance, true);
});

Deno.test("mergeConfig merges tools from both sides", () => {
    const base: Config = {
        system_appearance: true,
        tools: { nvim: { enabled: true, config_path: "/base/nvim" } },
    };
    const result = mergeConfig(base, {
        tools: { ghostty: { enabled: true, config_path: "/override/ghostty" } },
    });

    assertEquals(result.tools.nvim?.config_path, "/base/nvim");
    assertEquals(result.tools.ghostty?.config_path, "/override/ghostty");
});

Deno.test("mergeConfig override tools win over base tools", () => {
    const base: Config = {
        system_appearance: true,
        tools: { nvim: { enabled: true, config_path: "/old/path" } },
    };
    const result = mergeConfig(base, {
        tools: { nvim: { enabled: true, config_path: "/new/path" } },
    });

    assertEquals(result.tools.nvim?.config_path, "/new/path");
});

Deno.test("mergeConfig does not mutate base", () => {
    const base: Config = { system_appearance: true, tools: {} };
    mergeConfig(base, { system_appearance: false });

    assertEquals(base.system_appearance, true);
});

// --- expandToolPaths ---

Deno.test("expandToolPaths expands tilde in config_path", () => {
    const config: Config = {
        system_appearance: true,
        tools: {
            nvim: { enabled: true, config_path: "~/.config/nvim/lua/config.lua" },
        },
    };

    const result = expandToolPaths(config);
    const home = Deno.env.get("HOME") ?? "";

    assertEquals(result.tools.nvim?.config_path, `${home}/.config/nvim/lua/config.lua`);
});

Deno.test("expandToolPaths expands tilde in themes_path", () => {
    const config: Config = {
        system_appearance: true,
        tools: {
            tmux: {
                enabled: true,
                config_path: "~/.config/tmux/themes.conf",
                themes_path: "~/repos/black-atom-industries/tmux/themes",
            },
        },
    };

    const result = expandToolPaths(config);
    const home = Deno.env.get("HOME") ?? "";

    assertEquals(result.tools.tmux?.config_path, `${home}/.config/tmux/themes.conf`);
    assertEquals(result.tools.tmux?.themes_path, `${home}/repos/black-atom-industries/tmux/themes`);
});

Deno.test("expandToolPaths leaves absolute paths unchanged", () => {
    const config: Config = {
        system_appearance: false,
        tools: {
            ghostty: { enabled: true, config_path: "/etc/ghostty/config" },
        },
    };

    const result = expandToolPaths(config);

    assertEquals(result.tools.ghostty?.config_path, "/etc/ghostty/config");
});

Deno.test("expandToolPaths skips undefined tools", () => {
    const config: Config = {
        system_appearance: true,
        tools: {},
    };

    const result = expandToolPaths(config);

    assertEquals(result.tools, {});
});

Deno.test("expandToolPaths preserves system_appearance", () => {
    const config: Config = {
        system_appearance: false,
        tools: {
            nvim: { enabled: true, config_path: "~/.config/nvim/lua/config.lua" },
        },
    };

    const result = expandToolPaths(config);

    assertEquals(result.system_appearance, false);
});

