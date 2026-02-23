import { join } from "@std/path";

export function expandTilde(path: string): string {
    if (path.startsWith("~/")) {
        const home = Deno.env.get("HOME") ?? "";
        return join(home, path.slice(2));
    }
    return path;
}
