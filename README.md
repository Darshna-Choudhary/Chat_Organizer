# Chat Reader

A private, offline-friendly reader for exported WhatsApp chats. It turns the plain `.txt` export into a chat you can actually enjoy reading: message bubbles, photos, videos and voice notes inline, themes, search, a calendar, "on this day", saved messages and stats.

Everything runs **in your browser**. There is no server, no account and no upload. A chat you open stays on your device.

## Features

- **Reads any export:** the `.txt`, a `.zip` made with "Include media", or a folder. Android and iPhone formats, 12h/24h times, and both date orders are detected automatically (with a manual override).
- **Fast on very large chats:** only the messages on screen are drawn, so 100,000+ messages stay smooth.
- **Photos, videos, voice notes, stickers and documents** shown inside the conversation, matched to the files named in the chat. Zips are unpacked one file at a time, so multi-GB exports do not fill memory.
- **Find things:** full-text search, jump to any month or date, and a calendar heatmap of the busiest days.
- **Memories:** "on this day" (same date in other years, same day in other months), saved messages with a star, and chat stats (who writes more, who texts first, busiest days, favorite emojis, streaks).
- **Themes:** romantic and familiar themes, wallpapers drawn as SVG scenes, bundled fonts, custom bubble colors, text size and spacing. A theme that follows the time of day.
- **Optional welcome screen** with your own title and message.
- **Private publishing:** an encrypted "vault" lets you share a finished copy through a link, unlocked with a secret phrase. See [docs/DEPLOY.md](docs/DEPLOY.md).

## Quick start

Requires Node.js 20 or newer.

```bash
cd frontend
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173) and choose your export.

### Exporting a chat from WhatsApp

- **Android:** open the chat, tap the menu, then **More > Export chat**, and choose **Include media** (or without media for a smaller file).
- **iPhone:** open the chat, tap the contact's name, then **Export Chat**, and choose **Attach Media** (or **Without Media**).

WhatsApp limits how many messages an export can contain, and fewer when media is included. Without media, the chat only says "Media omitted" and there is nothing to display. To see your photos you need the export that includes them.

### Using your export

- Choose the `.txt` or the `.zip`, or use **Choose a folder**. A zip or folder that holds the photos brings them along.
- You can also add photos later from the settings menu (the gear icon).
- In Chrome and Edge the app can remember the zip or folder between visits (you may be asked to allow access again). In other browsers you pick it again.
- Press `Ctrl+F` (or `Cmd+F`) to search the whole chat. The browser's own find only sees the messages on screen.

## Scripts

Run these from the `frontend` folder.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app locally |
| `npm run build` | Build the app into `dist/` |
| `npm run preview` | Serve the built app locally |
| `npm test` | Run the test suite |
| `npm run lint` | Check the code |
| `npm run parse-report -- "chat.txt"` | Print counts for a chat file (never prints message text) |
| `npm run pack-vault -- --source ... --out ...` | Encrypt a chat and its media into a vault (see below) |
| `npm run assemble -- --vault ...` | Add a vault to the built site and check hosting limits |

## Sharing it privately: the vault

To give someone a finished copy, pack your export into an encrypted vault and publish it with the app. The host only stores scrambled files, and the person opens the link and types a secret phrase. Nothing is uploaded from their device, and nothing is readable without the phrase.

```bash
npm run pack-vault -- --source "/path/to/export.zip" --out ../vault-out --config ../vault.config.json
npm run build
npm run assemble -- --vault ../vault-out
```

The step-by-step guide, including hosting on Cloudflare Pages, is in [docs/DEPLOY.md](docs/DEPLOY.md). A starting config is in [vault.config.example.json](vault.config.example.json).

**Keep these out of git:** your exports, the vault folder, and your real `vault.config.json`. The repository's `.gitignore` already covers common names, but check `git status` before every commit.

## Privacy and security

- Opening a chat normally keeps it in your browser's storage (IndexedDB) on your device only. "Delete saved chat" in the settings menu removes it.
- In vault mode the chat is not stored on the device. A remembered unlock key can be kept (non-extractable) if "Keep this device unlocked" is ticked; "Lock this device" removes it. Saved messages and reading position stay on the device.
- The vault uses AES-256-GCM with a key derived from your phrase by PBKDF2-SHA-256 (600,000 iterations). Chat text, media and file names are all encrypted, and every piece is tied to its position so pieces cannot be swapped or altered unnoticed.
- The host can still see how many files there are, roughly how big they are, and when someone visits.
- **Anyone who finds the link can try guessing the phrase forever.** Use a long, unusual phrase (5+ words). `pack-vault` refuses obviously weak ones.

## Project layout

```
frontend/
  src/parser/    chat parser (runs in a Web Worker) and its tests
  src/media/     zip/folder reading, file matching, media store
  src/reader/    the reading screen, themes, wallpapers, memories, welcome and unlock screens
  src/vault/     vault encryption and the in-browser reader
  scripts/       parse-report, pack-vault, assemble-site
  public/        icons, manifest, privacy and hosting headers
docs/DEPLOY.md   publishing guide
samples/         small fake chats used by the tests (never real conversations)
```

## Tests

```bash
cd frontend
npm test
```

The suite covers the parser (including edge cases), media matching, zip and folder reading, the encryption (including tamper and swap detection, and that no readable text is left in a vault), the unlock flow, themes (including text-contrast checks) and the reading screen.

## Limitations

- Reply-to links are not part of a WhatsApp text export, so quoted replies cannot be restored.
- Photos in formats a browser cannot display (for example some iPhone HEIC files) appear as a download chip instead of an image.
- Videos from a zip or vault are unpacked before they play, so large ones take a moment and are loaded on tap.
- Names with a colon in them, or system lines that contain ": ", can be misread by the parser.
