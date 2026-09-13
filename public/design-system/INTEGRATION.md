# 10 Signals design-system import

Imported from the user-supplied `10Signals.zip` on 11 September 2026.

Open `/design-system/design-system.html` for the reference or
`/design-system/ui_kits/10signals/index.html` for the illustrative UI kit.
The kit is a demo, not the live application's authentication, billing, or report flow.

## Included

- Original tokens and CSS entry point.
- React component sources, TypeScript declaration files, usage notes, and specimen cards.
- Brand, color, spacing, and typography guidelines; original blue-dot PNG.
- Five illustrative screen components and their click-through reference.

## Using the library

The files are kept together in `public/design-system` to preserve their relative
links and make the reference browsable. Component `.jsx` files and sibling `.d.ts`
contracts can be imported into application code. Components using React state or
effects must be consumed inside a client component boundary.

The supplied `styles.css` imports fonts, tokens, and global resets. Do not import
it into the root application layout without a deliberate migration: its global
body, typography, and color rules differ from the currently approved homepage.
For gradual adoption, scope tokens to the consuming surface and reuse component
sources individually. The existing `app/design-system.css` is unchanged.

The documentation loads Google Fonts. Interactive specimen pages also load React,
ReactDOM, and Babel from external CDNs and transpile the supplied JSX in the browser.
They are design references, not production implementation entry points.

The unrelated `_ds/nocturne-*` theme, original standalone homepage prototype,
workspace support scripts, and ZIP's agent instruction file were intentionally
excluded. No skill was installed or workspace policy changed.
