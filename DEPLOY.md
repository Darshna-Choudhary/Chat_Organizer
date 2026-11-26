# Publishing a private copy (the vault)

This guide takes a WhatsApp export and turns it into a link that opens with a secret phrase. The person opening it uploads nothing: they open the link, type the phrase, and everything appears.

**How it works.** On your computer, `pack-vault` encrypts the chat, every photo, video and voice note, and even their file names. You publish the app together with those scrambled files. The host cannot read them. The phrase never leaves the browser: it is turned into a key on the device, and the files are unlocked there.

**What you need**
- Node.js 20 or newer, and this repository set up (`cd frontend && npm install`).
- Your export (a `.zip` made with "Include media", or a folder).
- A free Cloudflare account (for hosting).

Do all of this on your own computer. Keep your export, the vault folder and your config file **outside** the git repository (for example in a folder next to it).

---

## 1. Choose the secret phrase

This matters more than anything else. Anyone who finds the link can download the scrambled files and try guesses as fast as they like, so the phrase is the only lock.

- Use **5 or more words**, or a whole sentence, that nobody could guess from your social media.
- Do not use a date, a name or a nickname.
- Capital letters and extra spaces are ignored, so it is easy to type on a phone.
- The packer refuses phrases under 20 characters, under 4 words, or that look like a date.

Write it down somewhere safe. **If it is lost, the vault cannot be opened.** There is no reset.

## 2. Write a small config file

Copy `vault.config.example.json` to a folder outside the repo, for example `../vault.config.json`, and edit it.

| Field | What it does |
| --- | --- |
| `lockTitle` | Heading on the lock screen (public) |
| `hint` | A clue shown under it (public, so do not make it give the phrase away) |
| `lockTheme` | Theme id for the lock screen (public), e.g. `moonlit`, `golden-hour`, `candlelight` |
| `me` | The name, exactly as in the chat, of the person who will open it. Their messages appear on the right |
| `title` | Name shown at the top of the chat |
| `openAt` | `start`, `last`, or a month like `2024-11` |
| `appearance` | The starting look (theme, wallpaper, font size). The viewer can change it later |
| `welcome` | The opening message (private and encrypted): title, message, button text, `showOnce` |

Everything except `lockTitle`, `hint` and `lockTheme` is encrypted inside the vault.

## 3. Pack the vault

```bash
cd frontend
npm run pack-vault -- --source "/path/to/WhatsApp Chat.zip" --out ../vault-out --config ../vault.config.json
```

- Type the phrase twice (the letters stay hidden).
- It encrypts everything, then opens the result to prove the phrase works, and prints a summary. **Check these lines:**
  - the **message count** and **date range** look right,
  - **"N of M used in the chat were found"**: any media it could not find is listed by name,
  - **"the vault opened ... decrypted correctly"**.
- An 800 MB export took a few seconds in testing.
- To pack again, add `--force`. It will only replace a folder that already holds a vault.

Useful options: `--chunk-mb N` (piece size, 1-20, default 8), `--allow-weak` (skip the phrase check, not recommended).

## 4. Build the app and add the vault

```bash
npm run build
npm run assemble -- --vault ../vault-out
```

`assemble` copies the vault into `dist/vault` and checks the host's limits (Cloudflare Pages: 25 MiB per file, and 20,000 files per site with Wrangler; drag and drop allows only 1,000 files). If a limit would be exceeded it tells you what to change.

## 5. Try it on your own computer first

```bash
npm run preview
```

Open the address it prints, check the lock screen, the wrong-phrase message, and that the chat, photos and voice notes open. To try it on your phone over your home Wi-Fi: `npm run preview -- --host`, then open the "Network" address it shows.

## 6. Publish on Cloudflare Pages

```bash
npx wrangler login
npx wrangler pages project create
```

- When asked for the **project name**, choose something unguessable (for example four random words plus a number). The site will be at `<project-name>.pages.dev`, so the name is part of the privacy.
- When asked for the **production branch**, type `main`.

Then deploy:

```bash
npx wrangler pages deploy dist --branch main
```

**Always pass `--branch main`** (or whatever production branch you chose). Wrangler otherwise takes the branch from your git checkout, and anything not on the production branch becomes a *preview* with a different address.

If Wrangler complains about uncommitted changes, add `--commit-dirty=true`. The first upload of a large vault takes a few minutes.

Do **not** connect the repository to Cloudflare through Git integration, and never commit `vault-out` or the config file. A repository can be public, and anything committed stays in its history.

## 7. Test it like he will

1. On your phone, **on mobile data** (not your Wi-Fi), open the address.
2. Check the lock screen looks right, a wrong phrase is refused, and the right one opens it.
3. Scroll, open a photo, play a voice note, tap a video, open the welcome screen.
4. Use "Add to Home Screen" for an app-like icon.
5. Test on the same kind of device and browser he will use (iPhone Safari, Android Chrome, a laptop).

## 8. Giving it to him

- Send the **link** and the **phrase** separately, through different channels or at different times. The link alone is useless, and the phrase alone is too.
- The first unlock on each device takes a moment. "Keep this device unlocked" (ticked by default) lets him open it without typing next time.
- If he uses a shared computer, tell him to choose "Lock this device" from the settings menu afterwards.

## Changing or taking it down

- **To update** (more messages, a new welcome note, a new phrase): pack again into a fresh folder with `--force` or a new name, run `npm run build` and `npm run assemble`, and deploy again. Anyone who used the old phrase will be asked for the new one.
- **To take it down:** delete the project in the Cloudflare dashboard (Workers & Pages). The files are removed from the host.

## Troubleshooting

- **A blank page:** open the browser's developer console and look for the first red message; send it to whoever helps you. Check that `dist/vault/vault.json` exists.
- **"That isn't it":** the phrase is wrong (capitals and spaces are fine). A vault packed again with a different phrase will not open with the old one.
- **Photos missing:** the packer's summary lists files named in the chat that were not in the export. Re-export with media.
- **A video does not play:** videos are unpacked fully before playing, so large ones take a moment. Browsers cannot play every format (some iPhone and older phone formats).
- **"Could not reach the files":** a network problem. Try again.

## What the host can and cannot see

- **Cannot see:** the chat, the photos, the voice notes, the names of any file, who is in the chat, or your welcome message.
- **Can see:** that a site exists, the number and approximate size of the files, the public lock-screen title/hint/theme, and when people visit.
- **The remaining risk is the phrase.** Anyone who gets the link can try to guess it. A long, unusual phrase makes that impractical; a short or personal one does not.
