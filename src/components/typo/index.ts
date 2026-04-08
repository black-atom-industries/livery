import { Blockquote, blockquoteVariants } from "./blockquote.tsx";
import { H1, h1Variants } from "./h1.tsx";
import { H2, h2Variants } from "./h2.tsx";
import { H3, h3Variants } from "./h3.tsx";
import { H4, h4Variants } from "./h4.tsx";
import { Highlight, highlightVariants } from "./highlight.tsx";
import { InlineCode, inlineCodeVariants } from "./inline-code.tsx";
import { Lead, leadVariants } from "./lead.tsx";
import { listVariants, OrderedList, UnorderedList } from "./list.tsx";
import { P, pVariants } from "./p.tsx";
import { Small, smallVariants } from "./small.tsx";

export { type TypoColor, typoColors } from "./colors.ts";

export const Typo = {
    Blockquote,
    H1,
    H2,
    H3,
    H4,
    Highlight,
    InlineCode,
    Lead,
    OrderedList,
    P,
    Small,
    UnorderedList,
};

export const typoVariants = {
    blockquote: blockquoteVariants,
    h1: h1Variants,
    h2: h2Variants,
    h3: h3Variants,
    h4: h4Variants,
    highlight: highlightVariants,
    inlineCode: inlineCodeVariants,
    lead: leadVariants,
    list: listVariants,
    p: pVariants,
    small: smallVariants,
};
