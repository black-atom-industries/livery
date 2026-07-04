import { assertEquals } from "@std/assert";
import { getFailedUpdaters, getProgressState, mergeUpdateResults } from "./progress.ts";
import type { UpdateResult } from "./updaters.ts";

Deno.test("getProgressState returns zero progress for empty results", () => {
    const state = getProgressState([]);
    assertEquals(state, {
        completedCount: 0,
        total: 0,
        value: null,
        currentLabel: null,
        status: "idle",
        totalDurationMs: null,
    });
});

Deno.test("getProgressState calculates progress for mixed statuses", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "running", duration_ms: null },
        { app: "ghostty", status: "pending", duration_ms: null },
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
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "done", duration_ms: null },
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
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "error", message: "failed", duration_ms: null },
        { app: "ghostty", status: "done", duration_ms: null },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 3);
    assertEquals(state.total, 3);
    assertEquals(state.value, 100);
    assertEquals(state.status, "error");
});

Deno.test("getProgressState counts skipped as completed", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "skipped", duration_ms: null },
        { app: "ghostty", status: "running", duration_ms: null },
    ];
    const state = getProgressState(results);
    assertEquals(state.completedCount, 2);
    assertEquals(state.total, 3);
});

Deno.test("getFailedUpdaters returns empty array when nothing errored", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "done", duration_ms: null },
    ];
    assertEquals(getFailedUpdaters(results), []);
});

Deno.test("getFailedUpdaters returns app names with error status", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done", duration_ms: null },
        { app: "tmux", status: "error", message: "failed", duration_ms: null },
        { app: "ghostty", status: "error", message: "failed", duration_ms: null },
        { app: "obsidian", status: "skipped", duration_ms: null },
    ];
    assertEquals(getFailedUpdaters(results), ["tmux", "ghostty"]);
});

Deno.test("getFailedUpdaters returns empty array for empty results", () => {
    assertEquals(getFailedUpdaters([]), []);
});

Deno.test("mergeUpdateResults overlays updates onto matching app entries", () => {
    const results: UpdateResult[] = [
        { app: "nvim", status: "done", duration_ms: 10 },
        { app: "tmux", status: "error", message: "failed", duration_ms: null },
        { app: "ghostty", status: "done", duration_ms: 5 },
    ];
    const updates: UpdateResult[] = [
        { app: "tmux", status: "done", duration_ms: 8 },
    ];
    const merged = mergeUpdateResults(results, updates);
    assertEquals(merged, [
        { app: "nvim", status: "done", duration_ms: 10 },
        { app: "tmux", status: "done", duration_ms: 8 },
        { app: "ghostty", status: "done", duration_ms: 5 },
    ]);
});

Deno.test("mergeUpdateResults preserves original order and leaves unmatched entries untouched", () => {
    const results: UpdateResult[] = [
        { app: "a", status: "done", duration_ms: null },
        { app: "b", status: "done", duration_ms: null },
    ];
    const merged = mergeUpdateResults(results, []);
    assertEquals(merged, results);
});
