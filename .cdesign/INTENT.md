# cdesign Intent

## Original prompt (supersedes earlier agency brief)
# TK LABS / ERMA — CINEMATIC MOTION HOMEPAGE REDESIGN

Repository:
https://github.com/adaybekovt-boop/Tklabs

This task concerns **TK Labs / Erma**, the AI product already implemented in this repository.

This is NOT a web-development agency website.
This is NOT a studio-services landing page.
Do NOT position TK Labs as a company selling websites, CRM development, client portals, or outsourced software development.

The homepage must present and demonstrate **Erma itself**.

Your task is to completely rethink and rebuild the homepage into an exceptionally high-quality, cinematic, highly motion-driven product experience where the website itself demonstrates how Erma works.

The result should feel closer to a directed interactive product film than a traditional SaaS landing page.

However, it must remain:

- usable
- understandable
- responsive
- performant
- accessible
- technically maintainable
- truthful to the actual Erma product

Do not create random spectacle.

Motion must explain the product.

---

# 0. MANDATORY DESIGN SKILLS

Before changing the homepage, read and use these repositories as mandatory design instructions:

https://github.com/adaybekovt-boop/anti-AI-SlopT

https://github.com/adaybekovt-boop/cdesign-skill

Do not simply read their README files.

Inspect the relevant current files inside them, especially:

anti-AI-SlopT:
- SKILL.md
- slop-pattern references
- anti-pattern references
- good-principles references
- PRODUCT.md / DESIGN.md templates
- all relevant visual QA rules

cdesign-skill:
- SKILL.md
- references/director-roll.md
- references/anti-slop.md
- references/content-system.md
- references/qa-pipeline.md
- references/visual-qa.md
- ScrollFilm / cinematic motion recipes
- relevant motion implementation recipes

Treat these repositories as instructions.

Do NOT scaffold cdesign-starter.

TK Labs is an existing production codebase.

Use cdesign as:
- art direction
- motion direction
- composition methodology
- cinematic sequencing reference
- QA methodology

Use anti-AI-SlopT as:
- design gate
- anti-template system
- uniqueness check
- content/layout discipline

Do not overwrite the application's architecture just because the skill repository uses a different starter.

---

# 1. FIRST UNDERSTAND ERMA

Before designing anything, inspect the current repository thoroughly.

At minimum inspect:

- app/page.tsx
- app/layout.tsx
- app/globals.css
- app/motion.css
- app/navigation-motion.css
- components/site/*
- components/ui/*
- components/site/MotionOrchestrator.tsx
- existing ScrollReveal implementation
- existing navigation
- current footer
- app/playground/*
- app/models/*
- app/ai-chats/*
- app/profile/*
- app/vault/*
- app/docs/*
- app/status/*
- app/patch-notes/*
- relevant lib/*
- package.json
- AGENTS.md
- CLAUDE.md
- README.md
- current performance scripts
- current tests

Inspect the actual Erma application.

Understand:

- what Erma really does
- how a user enters Erma
- existing routes
- authentication flow
- actual model modes
- actual model routing behavior
- actual tools
- document/project functionality
- local/device storage behavior
- conversation branching/versioning if present
- artifacts/workspaces if present
- current product terminology

Do NOT invent capabilities.

If something is not implemented or supported by the repository, do not market it as a feature.

---

# 2. PRODUCT POSITIONING

The homepage exists to explain and demonstrate **Erma**.

The visitor should understand within seconds:

Erma is an AI workspace designed for serious work with models, conversations, projects, tools and documents.

Do not make the homepage a generic:

"Meet your new AI assistant."

Do not position Erma as another ChatGPT clone.

Find the actual differentiation from the implementation.

Potential differentiators already visible in the project include concepts such as:

- Erma Auto
- Lite / Core / Pro routing
- tools
- documents
- projects
- local state/storage
- branches / versions
- visible tool execution
- controlled infrastructure

But verify each one from the current code before using it.

The homepage should demonstrate those ideas through interaction and motion rather than dumping them into feature cards.

---

# 3. REMOVE THE AGENCY CONCEPT COMPLETELY

Do NOT use any of the following concepts:

- "We build websites"
- "We build CRM systems"
- "Digital product studio"
- "Start a project"
- "Book a call"
- "Contact our studio"
- "Have something worth building?"
- agency case studies
- client services
- website-development offers
- sales inquiry forms
- fake client logos
- agency portfolio structure

Do NOT ask the user for a studio email address or booking URL.

The main homepage CTA should take the user into Erma.

Inspect the actual product routing and authentication flow.

Use the correct existing route.

Possible language:

OPEN ERMA
TRY ERMA
START WITH ERMA

Choose the wording based on the actual product state.

If unauthenticated users require login first, integrate the proper existing authentication flow rather than inventing another CTA destination.

---

# 4. DESIGN CONTRACT BEFORE CODE

Follow anti-AI-SlopT.

Before writing the redesigned homepage, create/update:

PRODUCT.md
DESIGN.md

Do this before JSX/CSS implementation.

PRODUCT.md must define:

- what Erma actually is
- target user
- primary user job of the homepage
- what the visitor must understand in the first viewport
- what action the visitor should take
- actual product capabilities
- actual terminology
- domain materials unique to Erma
- explicit anti-references
- what Erma must never visually resemble

DESIGN.md must define:

- palette
- typography roles
- density
- spacing rhythm
- grid logic
- radius system
- motion philosophy
- reduced-motion philosophy
- mobile behavior
- visual hierarchy
- content model
- signature interaction
- cliché refusal
- uniqueness test

Do not proceed until these are meaningful.

---

# 5. UNIQUENESS TEST

Ask:

If the Erma logo/name and accent color disappeared, could this homepage belong to any random AI SaaS product?

If yes:
the design is not good enough.

Rewrite the concept.

The page must visually communicate the behavior of Erma itself.

The product mechanics should influence the composition.

---

# 6. CORE VISUAL IDEA

Use one primary signature:

**THE PAGE ITSELF BEHAVES LIKE ERMA PROCESSING A TASK.**

The entire homepage should feel like one continuous computation / workspace / reasoning flow.

As the visitor scrolls, the system evolves:

INPUT
→ INTERPRETATION
→ ROUTING
→ MODEL
→ TOOLS
→ WORKSPACE
→ RESULT
→ ITERATION
→ ERMA

This must be one connected visual language.

Do not make eight unrelated fancy sections.

Elements should transform into later elements.

Example continuity:

prompt text
→ routing line
→ model nodes
→ reasoning/work surface
→ tool connections
→ document/project structure
→ answer/artifact
→ Erma interface
→ final logo

The visual system should feel causally connected from start to finish.

---

# 7. ART DIRECTION

Aim for:

- cinematic
- technical
- intelligent
- precise
- calm under complexity
- product-first
- authored
- experimental
- dense where information is dense
- quiet where focus is needed

Avoid:

- generic AI SaaS
- neon cyberpunk
- crypto
- gaming HUD
- glowing AI orb
- generic particle universe
- floating 3D sphere
- glassmorphism everywhere
- purple gradients
- rainbow gradients
- excessive blur
- fake futuristic terminals
- sci-fi nonsense
- Anthropic clone
- Linear clone
- OpenAI clone
- Apple clone
- Vercel clone

Do not visually represent AI as a magical glowing ball.

Represent AI as a system.

---

# 8. COLOR DIRECTION

The motion reference establishes a strong direction around:

near-black surfaces
warm white / neutral text
controlled technical gray
TK orange accent

A possible visual anchor is approximately:

near black around #0A0A0B
TK orange around #FF5B1F

But do not blindly hard-code these.

Define proper tokens in DESIGN.md.

Use the orange sparingly.

It should indicate things such as:

- active state
- current route
- selected model
- important transition
- focus
- system activity

Do not make half the page orange.

No purple/pink AI gradient.

---

# 9. TYPOGRAPHY

Typography must carry much of the identity.

Use:

- a strong display role
- a readable interface/body role
- a mono/data role where appropriate

Do not default lazily to Inter/Geist everywhere.

Inspect current typography and make an intentional decision.

The homepage should use typography as motion material.

Letters can:

- mask other scenes
- become containers
- change weight
- change tracking
- split
- reassemble
- become interface geometry

But typography must remain readable.

Do not turn every headline into an effect.

---

# 10. SCROLLFILM MODE

This homepage should behave like a scroll-controlled product film.

Create a proper SHOT LIST before implementation.

At least 6–8 major shots.

Do not start coding the cinematic timeline before documenting it.

Each shot should specify:

- purpose
- what the user learns
- composition
- foreground
- background
- scroll range
- transition into next shot
- mobile downgrade
- reduced-motion alternative

The shots should form one story.

---

# 11. SHOT 00 — SYSTEM INITIALIZATION

Extremely short.

Do NOT create a fake 5-second loader.

Possible direction:

dark surface

small system text:

> erma.init()

or another product-specific initialization cue.

Then a thin TK-orange line/block/system cursor appears.

The initial object becomes part of the next scene.

Do not fade to black and restart the design.

The initialization must flow directly into the hero.

The content should become available almost immediately.

---

# 12. SHOT 01 — HERO

The first viewport should introduce Erma without explaining everything.

Do NOT use the generic centered SaaS pattern:

logo
headline
subheading
two pill buttons
gradient blob

Use an asymmetric composition.

Potential thesis directions:

WORK WITH AI.
WITHOUT WORKING AROUND IT.

or

ONE WORKSPACE.
DIFFERENT LEVELS OF THINKING.

or

FROM QUESTION
TO WORK.

These are examples only.

Study the actual product and write a stronger line if possible.

The hero should contain one dominant system element derived from Erma.

Potential example:

a live prompt input enters the composition.

Someone begins typing a difficult request.

The interface should look like Erma, not a generic fake AI chat.

Primary CTA:

OPEN ERMA

Use the actual route/auth behavior.

---

# 13. SHOT 02 — INPUT BECOMES INTENT

As the user scrolls, take the prompt from the hero.

Do not discard it.

Break it into semantic/functional parts visually.

The system begins interpreting the request.

This can be represented through:

- text segmentation
- controlled annotation
- routing lines
- system state
- complexity assessment
- contextual signals

Do NOT visualize hidden chain-of-thought.

Do NOT fabricate private reasoning text.

The animation can demonstrate visible routing/state without pretending to expose hidden internal reasoning.

For example:

TASK TYPE
COMPLEXITY
TOOLS NEEDED
CONTEXT

Only use terminology that makes sense for the actual Erma implementation.

---

# 14. SHOT 03 — ERMA AUTO / MODEL ROUTING

One of the major scenes should explain the actual Erma Auto concept.

If the current product really routes between:

Lite
Core
Pro

then visualize that.

The original prompt from the hero should flow into a routing system.

The system determines the appropriate mode.

Visually:

Lite
Core
Pro

exist as distinct levels/nodes/states.

Do not make them three equal feature cards.

Use a system diagram / spatial hierarchy.

For example:

a request travels through a thin path.

Lite briefly evaluates.

The path changes.

Core / Pro becomes active depending on task complexity.

The selected model state becomes visually dominant.

Motion communicates:

Erma does not require the user to manually think about model selection every time.

Again: verify actual behavior from code.

Do not overclaim.

---

# 15. SHOT 04 — WORK

Now the selected model begins working.

This is where the page can become visually denser.

Potential elements:

- real Erma message surface
- document context
- project context
- answer drafting
- tool calls
- task state
- version indicators
- relevant workspace UI

Do not show meaningless "AI thinking..." particles.

Use actual product surfaces where possible.

The homepage should feel like the product becoming alive.

---

# 16. SHOT 05 — TOOLS

If tools are an actual Erma capability, build a major motion scene around them.

Show a request requiring external/internal information.

Then show the tool becoming part of the workflow.

Potential visual language:

answer surface
↓
tool activity becomes visible
↓
safe tool route
↓
result returns
↓
response updates

This is a chance to communicate the existing philosophy that tool activity is visible.

If there is an allowlist/read-only architecture, verify the actual implementation before claiming it.

Use real terminology from the product.

Do not show shell access if Erma does not have it.

Do not fabricate arbitrary browsing capability.

---

# 17. SHOT 06 — DOCUMENTS / PROJECTS / CONTEXT

Show how a conversation becomes persistent work.

Instead of three "feature cards":

Projects
Documents
History

make one spatial workspace.

For example:

the current answer shrinks slightly.

A project rail emerges.

A document attaches.

The conversation receives a branch/version.

The user moves between related work without leaving the visual system.

Motion should communicate persistence and structure.

If certain functionality is local/device-only, state it accurately.

---

# 18. SHOT 07 — ITERATION

Demonstrate that serious AI work is iterative.

Possible sequence:

prompt
→ first answer
→ branch
→ refinement
→ alternate version
→ final result

If Erma supports branching/versioning, use the real implementation.

The page can visualize answer versions as spatial layers or timeline states.

Do not make a carousel of screenshots.

Make state A physically transform into state B.

---

# 19. SHOT 08 — PRODUCT REVEAL

At this point, allow the abstraction to resolve into the actual Erma interface.

The visitor has already seen the concepts.

Now reveal the real workspace as one complete system.

The previous visual elements should become pieces of the actual UI.

Example:

routing lines become separators
document nodes become sidebar items
prompt becomes composer
result becomes transcript
system indicators settle into actual interface positions

This transformation should be one of the biggest payoffs of the page.

---

# 20. PRODUCT DEMO OVER FEATURE CARDS

Whenever possible:

SHOW THE PRODUCT.

Do not describe every feature with:

icon
heading
paragraph

Avoid generic 3-up capability cards.

For example, instead of:

[Auto routing]
[Tools]
[Local storage]

show them as one continuous workflow.

The user should understand Erma by watching it behave.

---

# 21. QUIET SCENE

After several dense scenes, deliberately reduce motion.

The page needs silence.

Possible copy:

ASK.
WORK.
REFINE.

or another product-specific sequence.

Use large typography and negative space.

No WebGL.

No particles.

No cards.

No complicated background.

This gives the motion hierarchy room to breathe.

---

# 22. CURRENT RELEASE / PRODUCT PROGRESS

The current homepage exposes release information.

Do not necessarily delete that idea.

But integrate it into the new visual system.

Do not create a huge generic "What's new" SaaS card.

Potential direction:

a version number appears as a system build identifier.

The user can open Patch Notes.

Use real current release information from the existing code.

Do not hard-code fake release values.

---

# 23. TRUST THROUGH PRODUCT REALITY

Do not use fake testimonials.

Do not use fake companies.

Do not use fake logos.

Do not invent:

- number of users
- benchmark improvements
- reliability percentages
- model performance claims
- enterprise clients
- awards

Trust should come from:

- showing the real product
- accurate architecture
- visible functionality
- real release data
- real status links
- documentation
- transparent product behavior

---

# 24. FINAL RESOLUTION

Near the end, all the visual material should simplify.

The system geometry collapses.

Lines / panels / nodes converge.

The product interface becomes abstract geometry.

That geometry resolves into:

ERMA

and/or

TK LABS

depending on the existing branding hierarchy.

Do not make the logo animation unrelated to the page.

Use elements established earlier.

Then final CTA:

OPEN ERMA →

Use the actual product route.

Secondary links may include relevant real destinations such as:

Models
Documentation
Patch Notes
Status

only if they fit the current application.

No "Book a call."

---

# 25. MAXIMUM MOTION — CORRECT INTERPRETATION

The homepage should be extremely motion-rich.

But "maximum motion" does not mean:

every object moving constantly.

It means motion is deeply integrated into:

- navigation
- hierarchy
- state
- transitions
- system explanation
- spatial continuity
- product demonstration

Use selective spectacle.

A major scene can have intense choreography.

When it happens, smaller elements should stay calm.

ONE spectacle per viewport.

---

# 26. MOTION HIERARCHY

Tier 1:
major product/scene transitions

Examples:
- input → intent
- intent → route
- route → model
- model → workspace
- workspace → final Erma UI

Tier 2:
section-level choreography

Examples:
- masks
- path drawing
- UI reorganization
- typography transformation

Tier 3:
interaction feedback

Examples:
- CTA
- nav
- buttons
- model tabs
- links

Tier 4:
ambient motion

Examples:
- subtle grain
- extremely slow grid drift
- tiny system activity

Lower tiers must never compete with higher tiers.

---

# 27. NO GENERIC ANIMATION LANGUAGE

Forbidden as primary design language:

- fade-up every section
- blur-in every heading
- scale card on hover everywhere
- generic Framer Motion spring on every object
- infinite marquee
- bouncing scroll indicator
- pulsing glowing dots
- random floating objects
- mouse-follow glow everywhere
- exaggerated magnetic buttons
- 3D cursor trail
- generic particle background
- animated gradient blob

A few simple fades are fine where invisible choreography is appropriate.

They just cannot become the identity.

---

# 28. CONTINUOUS CAUSALITY

Objects should have memory.

If an orange line appears in scene 1, consider reusing it in later scenes.

If the prompt exists in the hero, keep that same prompt through routing.

If a model node is selected, let it physically become part of the workspace.

If a document enters the task, keep it visually present in the result.

Do not keep creating and destroying unrelated elements.

This is a major requirement.

The motion should tell one story.

---

# 29. TECHNICAL MOTION ARCHITECTURE

Audit the existing motion systems first.

The repository already has:

MotionOrchestrator

and separate ScrollReveal logic.

Do NOT simply add a third overlapping system.

Establish ownership.

Possible architecture:

GLOBAL MOTION
- route transitions
- application-level states

HOMEPAGE MOTION
- cinematic scroll timeline
- scene progress
- pinned sections
- transformation choreography

LOCAL MOTION
- buttons
- tabs
- input feedback
- tiny UI states

Do not let multiple systems control:

transform
opacity
filter

on the same node.

Remove/refactor conflicting homepage reveal behavior where required.

---

# 30. MOTION TECHNOLOGY

The repository already uses Framer Motion.

Use it where appropriate.

For complex scroll-directed cinematic timelines, you MAY add:

GSAP
ScrollTrigger
Lenis

only if they materially improve the architecture.

Do not add them because cdesign uses them.

If introduced:

- integrate one central scroll model
- avoid duplicate RAF loops
- clean up on unmount
- avoid dozens of independent ScrollTriggers
- avoid React state updates every animation frame
- do not fight Framer Motion
- do not break native scrolling
- avoid scroll hijacking
- avoid mobile scroll bugs

Prefer CSS/SVG/Motion for simpler sequences.

---

# 31. DO NOT USE WEBGL WITHOUT A REASON

This product does not need random 3D.

Do not add:

- torus knots
- spheres
- blobs
- abstract 3D chrome
- particle galaxies

If a specific visual sequence genuinely benefits from Canvas/WebGL, justify it.

Potential legitimate uses:

- complex node field
- large technical line system
- performant custom procedural visual

But DOM + SVG will probably be superior for much of this experience.

Use the simplest technology that can produce the required visual result.

---

# 32. PERFORMANCE

The homepage should look expensive.

It should not run expensively.

Target smooth interaction on modern desktop hardware.

Avoid:

- animating layout every frame
- massive blur filters
- huge full-screen backdrop-filter
- permanent will-change
- React setState inside high-frequency scroll loops
- dozens of intersection observers
- canvas at uncontrolled DPR
- multiple heavy scenes mounted simultaneously
- giant unoptimized images
- unnecessary video backgrounds

Prefer:

- transform
- opacity
- clip-path where reasonable
- SVG path animation
- motion values
- requestAnimationFrame only when necessary

Use temporary `will-change`.

Clean up everything.

---

# 33. SCROLL LENGTH

Do not produce a 20,000px demo just because there are many scenes.

The scroll should have rhythm.

Some transitions can happen quickly.

Some major moments deserve more scroll distance.

Avoid dead zones where the user moves the wheel repeatedly while almost nothing changes.

Avoid sections so short that choreography becomes unreadable.

Tune scroll ranges based on perception.

---

# 34. MOBILE IS A SEPARATE EDIT

Do not run the full desktop cinematic timeline unchanged at 390px.

Create a mobile cut.

Preserve:

- identity
- typography
- orange system accent
- prompt → route → work narrative
- Erma product reveal
- final payoff

Reduce:

- pinned duration
- simultaneous elements
- layer count
- parallax
- path complexity
- canvas DPR
- dense side-by-side interfaces

Disable cursor-specific interactions.

Do not reduce the mobile homepage to ordinary stacked cards.

The concept must survive.

Test around:

390×844

No horizontal overflow.

No sticky traps.

No giant text clipped by viewport.

Touch targets at least 44px.

---

# 35. REDUCED MOTION

Implement:

prefers-reduced-motion

seriously.

Do not just change 1s → 0.5s.

Provide a structurally readable version.

For reduced motion:

- remove scrub dependence
- remove large parallax
- avoid rapid typography transformation
- make states appear sequentially/static
- keep content understandable
- preserve visual hierarchy

No functionality may depend exclusively on motion.

---

# 36. NAVIGATION

Preserve existing functional navigation.

Homepage navigation may adapt to scenes.

Possible behavior:

hero:
minimal

during dark cinematic scenes:
quiet, high-contrast

after product reveal:
settles into normal product navigation

But do not make navigation difficult to use.

No custom cursor needed.

No hidden navigation puzzles.

---

# 37. HEADER / FOOTER

Do not treat header/footer as unrelated template pieces.

Integrate them into the composition.

Header can transition with the homepage.

Footer / final CTA should emerge naturally from the final logo resolution.

But keep actual navigation/legal links functional.

---

# 38. RADIUS AND CONTAINERS

The current homepage relies heavily on large rounded containers.

Do not repeat `rounded-[2rem]` everywhere.

Define a radius system.

Use different spatial treatments:

- open viewport compositions
- lines
- clipped panels
- sharp interface geometry
- subtle radius
- full-bleed sections

Do not put everything inside cards.

Do not do card-in-card.

The Erma UI itself can establish geometry.

---

# 39. COPY

Rewrite homepage copy where required.

Copy should be concise and product-specific.

Do not use:

empower
unlock
seamless
next-generation
revolutionary
cutting-edge
supercharge
future of AI
world-class
game-changing
AI that works for you
your intelligent copilot
one platform for everything

Avoid generic AI marketing language.

Prefer language describing what actually happens.

Examples of the desired level of concreteness:

AUTO CHOOSES THE RIGHT MODE.

TOOLS APPEAR WHEN THE TASK NEEDS THEM.

WORK STAYS ORGANIZED.

These are tone examples, not mandatory final copy.

Verify the actual implementation first.

---

# 40. NO HIDDEN-REASONING THEATER

Very important.

Do not fake internal chain-of-thought.

Do not display:

"I should analyze X..."
"Let me reason step by step..."
hidden model reasoning

as a marketing animation.

If showing AI processing, use observable system states such as:

Routing
Using document
Calling tool
Generating
Comparing version
Completed

Do not pretend to expose private reasoning.

---

# 41. USE REAL ERMA UI

Whenever possible, use real visual components or faithful variants based on the existing Erma product.

The homepage should connect visually to what the user sees after clicking OPEN ERMA.

Do not make a cinematic homepage for one fictional UI and then send the user into a completely different application.

The marketing surface and product surface should belong to the same design universe.

---

# 42. DO NOT BREAK THE APP

Do not break:

- authentication
- Google OAuth
- existing backend
- Cloudflare worker
- Vinext setup
- Erma chat
- model pages
- profile
- vault
- documents
- status
- patch notes
- legal routes
- localization
- theme behavior
- PWA
- mobile workspace
- existing data persistence

This is a homepage redesign.

Do not casually refactor unrelated backend systems.

---

# 43. LOCALIZATION

Inspect existing locale behavior.

The current homepage supports Russian/English.

The redesigned homepage must preserve localization.

Do not hard-code English-only content throughout the cinematic components.

Motion layouts must survive both RU and EN text lengths.

Avoid designs that only work because the English word is shorter.

---

# 44. HOME COMPONENT ARCHITECTURE

Do not leave the implementation inside one gigantic page.tsx.

Create a maintainable homepage feature area.

Possible conceptual structure:

components/home/
  ErmaHomeExperience.tsx
  HeroScene.tsx
  IntentScene.tsx
  RoutingScene.tsx
  WorkScene.tsx
  ToolsScene.tsx
  ContextScene.tsx
  IterationScene.tsx
  ProductRevealScene.tsx
  FinalScene.tsx

  motion/
    useSceneProgress.ts
    scene-progress.ts
    home-motion-tokens.ts

This is an example.

Choose architecture based on the actual repository.

Do not create abstraction for abstraction's sake.

---

# 45. STATE OWNERSHIP

Interactive state should remain as local as possible.

Do not build one enormous React component with:

activeScene
activeModel
activeTool
hoveredNode
currentWord
currentSection
currentProject
...

all in one global state machine unless genuinely necessary.

Scroll progress can be shared where needed.

Local interaction belongs in local components.

---

# 46. FIRST STATIC COMPOSITION, THEN MOTION

Before adding heavy motion:

build the key frames as good static compositions.

Critical rule:

If I freeze the homepage at almost any important frame, it should still look designed.

Motion cannot be used to hide weak composition.

Follow:

1. Macro layout
2. Typography
3. Product content
4. Scene keyframes
5. Motion
6. Micro-interactions
7. Ambient layer

Not the reverse.

---

# 47. VISUAL QA

After implementation, inspect actual rendered output.

Check at least:

1920×1080
1440×900
1280×800
tablet/intermediate size
390×844

Check:

- typography
- clipping
- z-index
- line wrapping
- localization
- sticky sections
- scene boundaries
- scroll timing
- dead scroll zones
- accidental overlap
- mobile overflow
- CTA accessibility
- nav contrast
- FPS/jank
- layout shift
- actual product resemblance

Use screenshots if possible.

Do not judge quality purely from source code.

---

# 48. ANTI-SLOP QA

At the end, reopen the current anti-slop rules.

Audit the finished homepage.

Specifically search for:

- centered generic AI hero
- generic glowing AI object
- purple gradient
- bento grid
- three equal feature cards
- Lucide icons as visual identity
- tiny mono eyebrow above every title
- excessive pill UI
- fake terminal
- card-in-card
- giant rounded containers everywhere
- decorative WebGL
- random grain used as personality
- generic scroll reveal
- identical animation on every section
- meaningless parallax
- fake testimonials
- fake stats
- "trusted by" row
- vague AI copy
- copied Anthropic aesthetic
- copied Linear aesthetic

If several are present:

do not polish them.

Rework the composition.

---

# 49. TESTING

After implementation run the relevant existing checks.

At minimum where applicable:

- typecheck
- lint
- unit tests
- integration tests
- production build
- performance budget
- relevant Playwright/e2e coverage

Inspect browser console.

Fix:

- hydration mismatch
- layout shift
- uncleaned timers
- uncleaned listeners
- animation leaks
- ScrollTrigger leaks if used
- duplicate RAF loops
- console errors
- invalid DOM
- accessibility problems

---

# 50. DO NOT STOP AT A PLAN

Do not only analyze.

Do not return mockups and say what could be done.

Implement the redesign.

You have permission to significantly rewrite the public homepage and its directly related visual/motion infrastructure.

You may:

- rewrite app/page.tsx
- create homepage-specific components
- refactor homepage motion architecture
- change homepage styling
- improve homepage header behavior
- create SVG systems
- create procedural visual assets
- rewrite homepage copy
- add a justified motion dependency
- improve responsive choreography
- remove obsolete homepage-only reveal behavior

Do not modify unrelated business logic without a concrete reason.

---

# 51. WORKING ORDER

Use this exact general order:

1. Read AGENTS.md / project instructions.
2. Inspect the existing Erma product.
3. Inspect the current homepage.
4. Inspect existing motion systems.
5. Read anti-AI-SlopT.
6. Read cdesign-skill.
7. Create/update PRODUCT.md.
8. Create/update DESIGN.md.
9. Perform uniqueness test.
10. Create ScrollFilm shot list.
11. Build static scene keyframes.
12. Build macro homepage.
13. Add main scroll choreography.
14. Connect scenes causally.
15. Add real product UI demonstrations.
16. Add local interactions.
17. Build mobile version.
18. Build reduced-motion version.
19. Run visual QA.
20. Run anti-slop QA.
21. Run performance QA.
22. Run tests/build.
23. Fix everything found.
24. Inspect the final result again.

Do not ask me design questions unless an absolutely essential factual input is missing.

Make design decisions yourself.

---

# 52. FINAL QUALITY BAR

The final homepage should make someone think:

"I understand how Erma works because I just watched the product explain itself."

Not:

"This landing page has a lot of animations."

A screen recording of one continuous scroll should be able to work as a TK Labs / Erma motion reel.

But freeze that recording anywhere important and the frame should still have:

- strong composition
- clear hierarchy
- deliberate typography
- product meaning
- recognizable Erma identity

The website itself should be the product demonstration.

Motion is not decoration.

Motion is the explanation.

Build something that could only reasonably belong to Erma.
## Final direction after user review
The original prompt above is retained verbatim as a historical input. Subsequent user corrections take precedence: use the existing application's monochrome light/dark palette, remove the source-scene heading/paragraph and demo footnotes, and prevent early planes from cluttering the scene.

## DESIGN_LOCKS
- Shared application color tokens, canonical SiteLogo and Inter body typography.
- Condensed display type for the scroll film, normal readable product typography within it.
- One task's composer, route, answer, source and revisions assemble into its workspace.
- Section order: film, quiet verbs, versions, repository release, resolution.
- No fabricated activity, hidden reasoning or model/network requests in the example.

## MOTION_LOCKS
- One cached native-scroll controller; reversible transforms; no idle RAF.
- Film from 600x600; verified target includes 659x672.
- Smaller phones use unpinned entrances; reduced-motion/no-JS expose the document.
- Source position follows actual answer geometry. Model/archive wait for foreground clearance.
- Composer returns during final assembly. Draft clears before checklist enters.
- No ambient layer; local button feedback only.

## QA
Final verification and limitations are recorded in docs/HOME_QA.md. Historical QA from the rejected first cut is superseded. Haiku is unavailable, so visual review is performed inline. No subagents were used.
