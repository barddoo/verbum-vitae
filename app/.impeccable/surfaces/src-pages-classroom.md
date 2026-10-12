---
version: 1
slug: "src-pages-classroom"
primary_target: "src/pages/classroom"
related_targets: []
---

## Scope

Classroom presentation surface — teacher-operated mode displayed on a TV via MacBook/iPad mirror. Audience: 9–11 year old kids. Session: teacher picks verses, two teams compete to recall blanks, teacher awards points.

## Visitor mode

Experience (kids watching on TV) / Operate (teacher controlling).

## Direction contract

THESIS: Bible memorization as the Brazilian school quiz show — team scoreboard, red-tile blank reveals, collective cheering; refuses the single-student flashcard and the adult devotional aesthetic.

OWN-WORLD: Deep navy (#1a2d6e) ground, championship gold (#f5c400) as the dominant accent and structural border, signal red (#e63329) for Team A and unrevealed blanks, correct-answer green (#1a8a50) for revealed tiles, warm white (#f0ece4) for verse text. Luckiest Guy for all display (scoreboard numerals, verse text, team names, celebration). Nunito for UI labels and teacher controls. Round tiles bearing "?" flip via scaleX collapse to reveal answer words. No gradients, no glassmorphism.

STORY: Teacher opens app, selects verses and team names on setup screen, taps "Iniciar Apresentação." Full screen fills with scoreboard header (teams + scores), verse in center with red ? tiles for blanks, teacher controls at the bottom. Teacher taps "✓ Equipe A" or "✓ Equipe B" when a kid answers — tile flips green, score increments. Keyboard shortcuts (Space, 1, 2, R, N) let teacher operate without looking down. At verse complete: celebration overlay with scores. Multiple verses flow in a queue.

FIRST VIEWPORT: Full 16:9 landscape screen. Top 18%: dark navy band — Team A (red) score left, app name center, Team B (gold) score right. Middle 64%: navy ground, verse reference badge in gold pill, verse text in large white Luckiest Guy with red ? tiles inline. Bottom 18%: dark navy band with four teacher-control buttons and keyboard shortcut hints.

FORM: Gincana escolar quiz-show scoreboard. Position 1 on model's ordered list, chosen by user over the assigned direction (cordel). Seed key 7aba03fb.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
