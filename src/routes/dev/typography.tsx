import { createFileRoute } from "@tanstack/react-router";
import { Typo, typoColors } from "@/components/typo/index.ts";

export const Route = createFileRoute("/dev/typography")({
    component: Component,
});

const sampleText = "The quick brown fox jumps over the lazy dog";

function Component() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            <section>
                <SectionLabel>Headings</SectionLabel>
                <Typo.H1>{sampleText}</Typo.H1>
                <Typo.H2>{sampleText}</Typo.H2>
                <Typo.H3>{sampleText}</Typo.H3>
                <Typo.H4>{sampleText}</Typo.H4>
            </section>

            <section>
                <SectionLabel>Body</SectionLabel>
                <Typo.Lead>{sampleText}</Typo.Lead>
                <Typo.P>{sampleText}</Typo.P>
                <Typo.Small>{sampleText}</Typo.Small>
            </section>

            <section>
                <SectionLabel>Inline</SectionLabel>
                <Typo.P>
                    Regular text with <Typo.Highlight>highlighted text</Typo.Highlight> and{" "}
                    <Typo.InlineCode>inline code</Typo.InlineCode> in context.
                </Typo.P>
            </section>

            <section>
                <SectionLabel>Blockquote</SectionLabel>
                <Typo.Blockquote>{sampleText}</Typo.Blockquote>
            </section>

            <section>
                <SectionLabel>Lists</SectionLabel>
                <div style={{ display: "flex", gap: 48 }}>
                    <div>
                        <Typo.H4>Unordered</Typo.H4>
                        <Typo.UnorderedList>
                            <li>First item</li>
                            <li>Second item</li>
                            <li>Third item</li>
                        </Typo.UnorderedList>
                    </div>
                    <div>
                        <Typo.H4>Ordered</Typo.H4>
                        <Typo.OrderedList>
                            <li>First item</li>
                            <li>Second item</li>
                            <li>Third item</li>
                        </Typo.OrderedList>
                    </div>
                </div>
            </section>

            <section>
                <SectionLabel>Color Variants</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {typoColors.map((color) => (
                        <Typo.P key={color} color={color} style={{ margin: 0 }}>
                            <Typo.Small color={color}>[{color}]</Typo.Small> {sampleText}
                        </Typo.P>
                    ))}
                </div>
            </section>
        </div>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 16,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "var(--fg-subtle)",
                marginBottom: 24,
                borderBottom: "3px solid var(--fg-subtle)",
            }}
        >
            {children}
        </div>
    );
}
