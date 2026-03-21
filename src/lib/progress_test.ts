import { assertEquals } from "@std/assert";
import { getProgressState } from "./progress.ts";
import type { UpdateResult } from "./updaters.ts";

Deno.test("getProgressState returns zero progress for empty results", () => {
    const state = getProgressState([]);
    assertEquals(state, {
        completedCount: 0,
        total: 0,
        value: null,
        currentLabel: null,
        status: "idle",
    });
});

Deno.test("getProgressState calculates progress for mixed statuses", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done" },
        { app: "tmux", status: "running" },
        { app: "ghostty", status: "pending" },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 1);
    assertEquals(state.total, 3);
    assertEquals(state.value, Math.round((1 / 3) * 100));
    assertEquals(state.currentLabel, "tmux");
    assertEquals(state.status, "running");
});

Deno.test("getProgressState reports done when all complete", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done" },
        { app: "tmux", status: "done" },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 2);
    assertEquals(state.total, 2);
    assertEquals(state.value, 100);
    assertEquals(state.currentLabel, null);
    assertEquals(state.status, "done");
});

Deno.test("getProgressState reports error when any app errored", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done" },
        { app: "tmux", status: "error", message: "failed" },
        { app: "ghostty", status: "done" },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 3);
    assertEquals(state.total, 3);
    assertEquals(state.value, 100);
    assertEquals(state.status, "error");
});

Deno.test("getProgressState counts skipped as completed", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done" },
        { app: "tmux", status: "skipped" },
        { app: "ghostty", status: "running" },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 2);
    assertEquals(state.total, 3);
});
