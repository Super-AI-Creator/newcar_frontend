/**
 * Deletes `.next` with retries (helps on Windows when files were locked by a crashed/stopped dev server).
 * Stop `next dev` first if removal still fails.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", ".next");

try {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
  console.log("Removed .next");
} catch (err) {
  console.error(
    "Could not remove .next completely. Close/stop `next dev` (Ctrl+C), close editors locking .next, then run: npm run clean"
  );
  console.error(err.message);
  process.exit(1);
}
