# Accessibility checklist (Phase 0 + Phase 1)

Manual verification with **Orca** and **keyboard only**. Run on a clean profile before marking a phase done.

## Phase 0 — App shell

- [ ] Launch app; Orca announces window title "Linux Academy"
- [ ] Welcome screen: Tab reaches "Get started"; Enter activates
- [ ] After welcome: sidebar ListBox announces track name and description on selection
- [ ] Track progress bar announces percent or "complete" (not color/checkmark alone)
- [ ] Main menu button (icon-only) announces "Main Menu"
- [ ] Sidebar toggle (narrow window) announces "Show sidebar"
- [ ] Home / track overview / module overview: primary CTA is focusable and labeled
- [ ] Reset module / reset all: result announced via toast text
- [ ] Curriculum load failure: AlertDialog text is readable by Orca
- [ ] High-contrast mode: welcome, sidebar, contrast beat remain readable

## Phase 1 — Terminal beats (Track 1)

- [ ] Terminal step: Orca announces instruction label and practice folder path
- [ ] Practice terminal widget announces "Practice terminal"
- [ ] "Need a hint?" / "Show me more" reachable by Tab; hints read when revealed
- [ ] Hint badge triggers "A hint is available" description (not dot alone)
- [ ] Reset step and Skip validation buttons have clear names and descriptions
- [ ] Validation success announced via toast ("That's it.")
- [ ] Real-system step (`sandbox: false`): banner text announced when revealed

## Regression — Journey mounting

- [ ] First launch (welcome not seen): no `gtk_box_append` parent assertion
- [ ] Transition welcome → main moves JourneyStack without duplicate parent

## Focus order reference

Welcome → Get started → (main) sidebar track → content CTA → lesson footer Continue.
