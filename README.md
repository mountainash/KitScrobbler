# Kit Scrobbler

> A macOS Safari (web**kit**) extension for scrobbling music tracks to [Last.fm](https://www.last.fm).

## 💁 About

This extension is narrowly scooped to be the best tool for scrobbling music tracks played in the Safari web browser. It doesn't intended to be fully featured or compiled to other browsers (at this time) - but it aims to fill the hole of a good looking and regularly maintained scrobbler for Safari.

If you are looking for a Chromium or Firefox scrobbler, you might want to check out [Web Scrobbler](https://github.com/web-scrobbler/web-scrobbler) - the source of much inspiration and code for this project 🙇.

## 🔗 URLs

- <http://localhost:3000/>

## 🧑‍💻 Local Development

Run these commands from the repository root:

| Command | Action |
| :------ | :----- |
| `bun install` | Install dependencies |
| `bun run dev` | Start the local dev server at <http://localhost:3000> |
| `bun run build` | Build the "Temporary" extension to `./build/` |

You can also run this project inside a DevContainer in VS Code. After reopening the folder in the container, dependencies are installed automatically and you can run `bun run dev`.

### 📦 Dependency Updates

- `bun update --interactive` to update dependencies interactively
- `bun biome migrate` to update Biome configuration and dependencies

## 📚 Resources

- [Biome](https://biomejs.dev)

## ☑️ TODO

See [GitHub Issues](https://github.com/mountainash/KitScrobbler/issues).
