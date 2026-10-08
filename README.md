# fal CPG Studio

An interactive demo for consumer packaged goods brands (food, beverage, home and personal care). It takes one pack sketch to a global campaign: design directions, variants, shelf tests, localized packs, audience imagery and social video. Six more use cases sit alongside it. It's built on the same pattern as fal Retail Studio.

All brands in the demo are fictional:

- **SOLA** sparkling water
- **BRINDLE OATS** cereal
- **CLEARLOOM** detergent

## What a visitor sees

- **It works right away from real samples.** Every sample was generated on fal, and no account is needed.
- **A fal key makes it live.** With "Add fal key", every step becomes a production fal API call billed to the visitor's account. The key is stored only in their browser.
- **"Run the full pipeline"** chains the six steps, passing each step's pick into the next. It ends on a campaign board with asset count, time, fal cost and the traditional cost, plus "Download all as zip".
- **Write your own options** (live mode): Variants take a name plus a color picker; Localize takes a market plus a language. Audiences, video motions, messages, usage scenes, scripts and headlines also accept free text.
- **"More use cases"** opens its own page with six use case tiles; clicking one highlights it in the selector under the hero, and each starts from your latest Variants or Audiences pick. Most of them pick up the Variants or Audiences pick from the pipeline.
- **Every step includes:**
  - a model picker with three curated models (two for UGC);
  - a "Compare models" toggle;
  - a "Today vs with fal" strip;
  - an editable prompt template;
  - an API view showing the exact `@fal-ai/client` call.
- **A business case calculator** covers SKUs, markets, and images and videos per SKU per market. Its sources are cited in the page.

## Product awareness

Every step reads a **product profile**: its category (drinks, food, home care or personal care), the product noun (for example "laundry detergent bottle") and the brand. The profile travels with each pick down the chain. It drives two things:

- **The options each step offers.** For example, a detergent gets laundry-aisle shelf tests, laundry-room settings in each market, busy-parent and pet-owner audiences, and "pour and load" video. A drinks can gets coolers, cafes and "cheers".
- **The wording of every prompt.** Templates use {product}, {word} (flavor or scent) and {usage} instead of hard-coded nouns. Every scene prompt also carries three guardrails:
  - show the product only where it's really used or sold;
  - keep it at realistic size;
  - no real logos, store chains or brand names.

**The "Product type" dropdown** sets the profile. It appears on every step except 3D.

- **Auto detect (vision model)** is the default.
  - In live mode it sends the Concept sketch or any upload to `openrouter/router/vision` running Gemini 2.5 Flash. That costs about $0.0005 per image, and results are cached per image.
  - Carried picks already know their profile.
  - Sample mode uses pre-detected profiles.
- **Manual picks** (Drinks, Food, Home care, Personal care) override the category for every step.

**Each sketch has its own sample chain.** Picking the cereal box or the detergent in Concept switches every downstream step, and the More use cases gallery, to that product's samples:

| Chain | Path through the pipeline |
|---|---|
| Drinks can | Pink Grapefruit, then Mexico, then Celebration |
| Cereal box | Strawberry, then Japan, then Family breakfast |
| Detergent | Lavender, then Brazil, then Busy parents |

Model compare samples exist for the drinks can chain.

## Campaign pipeline

| # | Step | Feeds from | Models (default first) |
|---|------|-----------|------------------------|
| 1 | Concept: sketch to finished pack, 4 design directions | Sketch (3 presets or upload) | Nano Banana 2.1 Edit, Seedream 5 Pro Edit, FLUX.2 [klein] 9B Edit |
| 2 | Variants: flavors or scents at exact hex values | Concept | same |
| 3 | Shelf test: category aisle, cooler or club pallet, endcap, marketplace main image, shopper's hand | Variants | same |
| 4 | Localize: 8 markets, translated pack copy where the product is used locally | Variants | same |
| 5 | Audiences: lifestyle scenes cast for the market picked in step 4 | Localize | same |
| 6 | Social video: three category-specific motions (4, 6 or 8 s) | Audiences | H3 Max, H3 Max Turbo, Kling 3.0 Pro, Veo 3.1 Fast |

## More use cases

| Use case | Feeds from | Models |
|----------|-----------|--------|
| Personalized packs (names and messages) | Variants | image trio |
| UGC creator ads with speech | Creator stills | Veo 3.1 Fast, Kling 3.0 Pro (both with native audio) |
| Usage scenes (recipes, routines, before and after) | Variants | image trio |
| 3D and AR (GLB, shown in model-viewer) | Variants | Hunyuan 3D 3.1 Pro, Trellis 2, Tripo H3.1 |
| Out-of-home mock-ups with a headline | Audiences | image trio |
| A/B ad variants (headlines x formats) | Audiences | image trio |

**Measured generation times on fal.** These come from request history.

- Nano Banana 2.1: about 11 to 14 s per image.
- Seedream 5 Pro: 39 to 139 s.
- FLUX.2 [klein]: about 2 s.
- H3 Max and H3 Max Turbo: about 6 s for a 6 s clip.
- Veo 3.1 Fast: about 60 to 66 s.
- Kling 3.0 Pro: about 121 to 126 s.
- 3D: 162 to 253 s.

## How it works

- **One static `index.html`.** There's no build step, server or backend.
- **fal calls go straight from the browser.** The page sends `POST https://queue.fal.run/{endpoint}` with `Authorization: Key <visitor key>`. It polls `status_url` every 1.5 s, showing the queue position, then fetches `response_url`.
  - Requests time out after 10 minutes and can be cancelled (PUT `cancel_url`).
  - Each card shows its request ID.
  - If the queue position goes above 25, the page offers to switch to the fallback model.
- **Each model family has its own input adapter:**
  - Nano Banana: `image_urls` and `aspect_ratio`.
  - Seedream and FLUX.2: `image_size` as `{width, height}`.
  - H3: `duration` as a number, plus `prompt_expansion_mode`.
  - Kling: `start_image_url`, with `duration` as a string.
  - Veo: `duration` as `"6s"`.
  - Hunyuan: `input_image_url`.
  - Trellis and Tripo: `image_url`.
- **Outputs are read from** `images[0]`, `video`, `model_glb` or `model_mesh`. Vision output is parsed from the first JSON object in `output`, because the model wraps it in a code fence.
- **Inside claude.ai** (claudeusercontent.com) the page stays in sample mode and disables compare, because outside calls are blocked there.

## How it was built

1. **Workflow research.** I mapped CPG creative workflows and pulled the "Today" benchmarks from public pricing pages:
   - ManyPixels and Contra for pack design and SKU adaptations;
   - AIM for EU artwork changes;
   - aytm for shelf tests;
   - Wonderful Machine for food and drink photography;
   - Advids for short video;
   - Influee for UGC;
   - FrameSixty for 3D;
   - AdQuick for out-of-home.

   All of these are shown as estimates, not quotes.
2. **Model choice.** I checked candidate models with the fal MCP (`get_model_schema`, `get_pricing`) and quality-tested them with `submit_jobs` and `inspect_images`.
3. **Samples.** Every sample was generated on fal and inspected. Any sample with a real brand logo in the background was regenerated or dropped; the store cooler, endcap, Gen Z rooftop and desk scenes were affected. Options without a clean sample are tagged "Live". Prompts for scenes now say that other products carry no logos or brand names.
4. **Testing.** A jsdom harness (`src/test.js`) runs sample mode, the full pipeline, compare samples for every step, the gallery, live runs on every model with mocked fetch and input-shape checks, the zip download and sandbox mode.

## Notes and limitations

- **On-pack text.** Generated copy is for headline and flavor text. Legal and nutrition panels still go through normal artwork. Arabic, Japanese and Korean samples were checked; other languages should be spot-checked before a prospect sees them.
- **Seedance 2.0** rejected an AI-generated presenter photo under its likeness policy, so UGC uses Veo and Kling.
- **Hunyuan 3D pricing** is usage-based and shown that way. The 3D files are 30 to 45 MB, and small text on 3D textures softens.
- **FLUX.2 [klein]** is the fastest model by far. In the compare samples it drops or garbles some text (see Localize), which is a useful talking point for why Nano Banana is the default.
- **Personal care** has no sample chain. A live check on a shampoo pack (detected as personal care) produced a bathroom-vanity localization, a morning-routine scene and a pour-into-hand video.
- **Sample media** is served from fal's CDN. If a URL ever expires, regenerate it and update `src/_data.js`.

## Update and deploy

```
python3 src/assemble.py src/fal-logo.svg   # writes index.html (pure ASCII)
node src/test.js                          # needs: npm i jsdom@24
```

Upload `index.html`, `README.md` and `vercel.json` to the repo. On Vercel, import it with framework "Other" and no build command. Check Deployment Protection so prospects can open it. Before showing a prospect, do one live run per step on the hosted copy.
