# Cake builder — request for the cut (sliced) frames

**What exists already:** `boards/`, `cakes/`, `cakes-with-shadow/`, `combined/` —
23 files each, 1254 × 1254 PNG with alpha, named by format id
(`round-20x20-h8.png`, `square-30x30-h8.png`, `rectangle-100x80-h8.png`, …).

These are already live on the site. The front view of the builder draws
`boards/<id>` and `cakes-with-shadow/<id>` straight on top of each other with no
repositioning, because every frame in the set shares one camera.

**What's missing:** the sliced view (من الداخل), where the shopper checks the
filling. It has no art, so it falls back to a different renderer — a different
camera and a different look. Side by side the two views read as two different
cakes, which is the problem this request fixes.

---

## What we need

A new folder, **`cakes-cut/`**, same 23 filenames, same 1254 × 1254 frame:

```
cakes-cut/round-15x15-h8.png      cakes-cut/square-15x15-h8.png
cakes-cut/round-20x20-h8.png      cakes-cut/square-20x20-h8.png
cakes-cut/round-25x25-h8.png      cakes-cut/square-25x25-h8.png
cakes-cut/round-30x30-h8.png      cakes-cut/square-30x30-h8.png
cakes-cut/round-40x40-h8.png      cakes-cut/square-40x40-h8.png
cakes-cut/round-50x50-h8.png      cakes-cut/square-50x50-h8.png
cakes-cut/round-15x15-h14.png     cakes-cut/rectangle-30x20-h8.png
cakes-cut/round-20x20-h14.png     cakes-cut/rectangle-40x30-h8.png
cakes-cut/round-25x25-h14.png     cakes-cut/rectangle-60x40-h8.png
cakes-cut/round-30x30-h14.png     cakes-cut/rectangle-80x60-h8.png
cakes-cut/round-40x40-h14.png     cakes-cut/rectangle-100x80-h8.png
cakes-cut/round-50x50-h14.png
```

Each one is the **same cake as `cakes-with-shadow/<id>`, from the identical
camera, with a wedge removed** so the inside is visible. Include the contact
shadow, exactly as that folder already does.

**The camera must not move.** That is the whole point — the shopper switches
between الشكل الخارجي and من الداخل and should see one cake, sliced. If the
camera shifts even slightly the cake will appear to jump between the two views.

---

## The filling

The exposed face is where the flavour shows, and the shopper picks from ten.
Easiest option first:

**Option 1 — one frame per format (23 files).** Cut faces rendered in a plain
sponge, no fruit or jam. The flavour is already shown on that step by a large
photographic cross-section card, so the cut view carries the shape and the
flavour card carries the filling. Simplest, and it ships.

**Option 2 — separate the cut faces (46 files).** Two layers per format:

- `cakes-cut/<id>.png` — the iced exterior with the wedge removed, white,
  no cut faces
- `cut-faces/<id>.png` — only the exposed sponge faces, in neutral grey

With the faces on their own layer we can lay the real filling texture into them
in the browser and the cut view changes with the flavour. Best result.

**Option 3 — every combination (230 files).** Each format rendered with each of
the ten fillings. Exact, but ten times the files and the download, and we do not
recommend it.

---

## Why it must be white

The exterior in `cakes/` is a white master and the site multiplies it by the
customer's chosen fondant colour — that is how the colour step works today.
Render `cakes-cut/` the same way: **plain white, neutral lighting, no colour
cast.** Anything pre-tinted will double up and come out muddy.

---

## Format

- 1254 × 1254, PNG with straight (not premultiplied) alpha
- Transparent background — no backdrop, no board (the board is a separate layer)
- Same lighting rig and same output settings as the existing folders

We convert to WebP on our side; send PNG.

---

## Also useful, if it's cheap from the same scene

- **Decoration layers.** Toppings currently cannot be drawn on this art at all,
  because they need real geometry the flat frames do not carry. A transparent
  overlay per decoration per format, same frame, would fix that the same way:
  draw it over the cake, no maths.
- **Formats beyond the 23.** The catalog now holds 150 — round and square from
  15 to 100 cm, rectangles to 200 × 100, and heights 8, 10, 12, 14 and 16 cm.
  The extra formats currently borrow the nearest of the 23. Not urgent, but the
  10, 12 and 16 cm heights are the most visible gap, since height changes the
  cake's proportions more than footprint does.

---

## Dropping them in

Convert to WebP and copy into `public/cake/v5/cakes-cut/`, keeping the names.
Nothing else needs changing — the code path is already there and is simply
inactive while the folder is missing.
