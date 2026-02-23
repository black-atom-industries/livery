import { assertEquals } from "@std/assert";
import { expandTilde } from "./paths.ts";

Deno.test("expandTilde replaces leading ~/", () => {
    const home = Deno.env.get("HOME") ?? "";
    assertEquals(expandTilde("~/.config/foo"), `${home}/.config/foo`);
});

Deno.test("expandTilde leaves absolute paths unchanged", () => {
    assertEquals(expandTilde("/usr/local/bin"), "/usr/local/bin");
});

Deno.test("expandTilde leaves relative paths unchanged", () => {
    assertEquals(expandTilde("relative/path"), "relative/path");
});

Deno.test("expandTilde does not expand tilde in the middle", () => {
    assertEquals(expandTilde("/some/~/path"), "/some/~/path");
});

Deno.test("expandTilde handles bare tilde without slash", () => {
    assertEquals(expandTilde("~"), "~");
});
