---
name: ui-ux-pro-max
description: Design intelligence library. Use when picking UI styles, color palettes, font pairings, landing-page structures, chart types, or applying UX heuristics. Provides a CSV-backed BM25 search CLI to look up curated design recommendations.
---

# UI/UX Pro Max

Bundled design intelligence with searchable databases of UI styles, color palettes, font pairings, chart types, and UX guidelines. Use this skill whenever the user asks for design recommendations, style direction, palette suggestions, typography pairings, landing page structure, or UX best practices — instead of inventing from scratch, query this library first.

## When to use

- Picking a visual style or aesthetic for a page/component
- Recommending or selecting a color palette
- Choosing font pairings
- Structuring a landing page or hero section
- Selecting a chart type for data viz
- Applying UX best practices and anti-patterns
- Generating design directions (combine results with `design--create_directions`)

## Search CLI

The skill bundles a Python search engine. Copy the script then run it:

```bash
# one-time per session
code--copy knowledge://skill/ui-ux-pro-max/scripts/search.py /tmp/uupm-search.py
code--copy knowledge://skill/ui-ux-pro-max/scripts/core.py /tmp/core.py

# query — point DATA_DIR at the bundled csv folder
DATA_DIR=$(dirname $(realpath .agents/skills/ui-ux-pro-max/data)) \
  python3 /tmp/uupm-search.py "<query>" --domain <domain> -n 5
```

If `DATA_DIR` is not honored by the script, run from inside the skill directory:
`cd .agents/skills/ui-ux-pro-max && python3 scripts/search.py "<query>" --domain <domain>`

### Domains
- `product` — product-type recommendations (SaaS, e-commerce, portfolio)
- `style` — UI styles (glassmorphism, brutalism, minimalism) with AI prompts + CSS keywords
- `typography` — font pairings with Google Fonts imports
- `color` — color palettes by product type
- `landing` — page structure and CTA strategy
- `chart` — chart types and library recommendations
- `ux` — best practices and anti-patterns

Omit `--domain` to auto-detect.

## Workflow

1. Identify the design question (style, palette, typography, layout, UX rule).
2. Query the relevant domain with 1–2 keywords.
3. Use the top result(s) as the canonical recommendation. Cite the style/palette name in your reasoning.
4. When generating design directions via `design--create_directions`, pre-load palette + typography choices from the search results so directions stay grounded.

## Bundled assets
- `data/*.csv` — canonical databases (products, styles, colors, typography, landing, charts, ux, icons, app-interface, design, google-fonts)
- `data/stacks/*.csv` — stack-specific guidelines (react, nextjs, shadcn, tailwind, etc.)
- `scripts/search.py` — CLI entry point
- `scripts/core.py` — BM25 + regex hybrid search engine
- `scripts/design_system.py` — design system generator

Source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT)
