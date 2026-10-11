import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve("mediainfo.js/package.json"));
const destination = fileURLToPath(new URL("../public/media-info/", import.meta.url));
await mkdir(destination, { recursive: true });
await copyFile(require.resolve("mediainfo.js/MediaInfoModule.wasm"), join(destination, "MediaInfoModule.wasm"));
await copyFile(join(packageDirectory, "dist/umd/index.min.js"), join(destination, "mediainfo.js"));
await copyFile(join(packageDirectory, "LICENSE.txt"), join(destination, "LICENSE.txt"));
