# Project Instructions

## Product goal

Turn this repository into a fully client-side WhatsApp chat reader with themes, media support, and nostalgic features for one personal chat spanning about 1.5 years and tens of thousands of messages. This is a personal gift: reliability, data integrity, and privacy take priority over adding features quickly.

## Branches and commits

- Work only on `feature/reader-v2`. Never switch to, edit, or commit on `main`.
- Never push any branch or commit.
- Make exactly one focused commit per implementation phase. Before committing, inspect the staged diff and stage only that phase's intended files.
- Do not rewrite or discard unrelated pre-existing worktree changes.

## Privacy and public-repository safety

- This repository is public. Nevercopilot commit real chat exports, message content, personal identifiers, or real media, including through fixtures, snapshots, screenshots, logs, or generated output.
- Keep `.gitignore` protections for `*.txt`, `*.zip`, media folders, and `storage/`. Fake, clearly synthetic test fixtures may live under `/samples`; do not put real personal data there.
- Use only fake chats from `/samples` in tests, demos, and automated checks. Never use an actual personal export as test input.
- Read a user's selected export locally in the browser. Never upload, transmit, persist remotely, or log chat contents or media.

## Architecture and offline operation

- The product must be a browser-only React + Vite application. Do not add or depend on a backend, Flask endpoint, upload service, or mock server for reader behavior.
- It must work offline after the app assets are available locally. Do not add CDNs, remote fonts/assets, analytics, telemetry, APIs, or any other network calls. Keep parsing and media handling on-device.
- Treat `/backend` as legacy/reference code for now. Do not delete it unless the user explicitly says to.
- Keep large-chat performance in mind: the target is tens of thousands of messages. Prefer incremental rendering, virtualization, and bounded work over rendering or repeatedly processing the entire chat on every interaction.
- Preserve robust parsing of WhatsApp export variants, multiline messages, timestamps, system events, and media placeholders. Prefer correctness and graceful handling of malformed input over silently losing messages.

## Phase workflow

- Work in small, reviewable phases with one commit per phase.
- At the end of every phase, run the frontend lint, tests, and production build. If the project does not yet have a test command, add appropriate tests using only synthetic `/samples` data as part of the relevant implementation phase, and state clearly what was or was not run.
- Report the exact manual steps a person can use to try the completed phase, using a fake sample chat where applicable.
- Before each phase's commit, verify the current branch is `feature/reader-v2`, inspect `git status` and the staged diff, and confirm no private chat or media is staged.
