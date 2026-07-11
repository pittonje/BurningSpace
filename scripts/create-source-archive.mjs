import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FORBIDDEN_ENV_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
  ".env.test.local",
]);

function fail(message) {
  console.error(`Source archive failed: ${message}`);
  process.exit(1);
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd,
    encoding: options.encoding ?? "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  if (result.error) {
    fail("Git could not be executed.");
  }
  if (result.status !== 0) {
    fail(`Git command failed: git ${args[0]}.`);
  }
  return result.stdout;
}

function parseArguments(argv) {
  const options = { dryRun: false, allowDirty: false, outputDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--allow-dirty") {
      options.allowDirty = true;
    } else if (argument === "--output-dir") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        fail("--output-dir requires a path.");
      }
      options.outputDir = value;
      index += 1;
    } else {
      fail(`Unknown option: ${argument}`);
    }
  }
  return options;
}

function isForbiddenTrackedPath(path) {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  if (normalized === ".claude/settings.local.json") {
    return true;
  }
  return FORBIDDEN_ENV_NAMES.has(basename(normalized));
}

function utcTimestamp(date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(/[-:]/g, "");
}

function repositoryNameFromRemote(remoteUrl, fallback) {
  const match = remoteUrl.trim().match(/([^/:]+?)(?:\.git)?$/);
  return (match?.[1] || fallback).replaceAll(/[^A-Za-z0-9._-]/g, "-");
}

async function sha256(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectPromise);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

const options = parseArguments(process.argv.slice(2));
const scriptDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)));
const repositoryRoot = runGit(["rev-parse", "--show-toplevel"], {
  cwd: scriptDirectory,
}).trim();
const sourceCommit = runGit(["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
}).trim();
const shortCommit = runGit(["rev-parse", "--short=12", "HEAD"], {
  cwd: repositoryRoot,
}).trim();
const status = runGit(["status", "--porcelain", "--untracked-files=normal"], {
  cwd: repositoryRoot,
});

if (status.trim() && !options.allowDirty) {
  fail(
    "working tree is dirty. Commit intended changes, or use --allow-dirty to archive committed HEAD only; uncommitted changes are never included.",
  );
}
if (status.trim() && options.allowDirty) {
  console.warn(
    "Warning: working tree is dirty; the archive contains committed HEAD only and excludes all working-tree changes.",
  );
}

const trackedOutput = runGit(["ls-tree", "-r", "--name-only", "-z", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "buffer",
});
const trackedFiles = trackedOutput
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const forbiddenPaths = trackedFiles.filter(isForbiddenTrackedPath);
if (forbiddenPaths.length > 0) {
  fail(
    `committed HEAD contains ${forbiddenPaths.length} forbidden local-secret path(s); path names are intentionally not printed.`,
  );
}

const remoteUrl = runGit(["remote", "get-url", "origin"], {
  cwd: repositoryRoot,
}).trim();
const repositoryName = repositoryNameFromRemote(remoteUrl, basename(repositoryRoot));
const outputDirectoryArgument = options.outputDir ?? "artifacts/archives";
const outputDirectory = isAbsolute(outputDirectoryArgument)
  ? resolve(outputDirectoryArgument)
  : resolve(repositoryRoot, outputDirectoryArgument);
const filename = `${repositoryName}-source-${shortCommit}-${utcTimestamp(new Date())}.zip`;
const archivePath = join(outputDirectory, filename);
const checksumPath = `${archivePath}.sha256`;

console.log(`Source commit: ${sourceCommit}`);
console.log(`Output path: ${archivePath}`);
console.log(`Tracked-file safety check: passed (${trackedFiles.length} files)`);

if (options.dryRun) {
  console.log("Dry run: no archive or checksum was created.");
  process.exit(0);
}

await mkdir(outputDirectory, { recursive: true });
if (existsSync(archivePath) || existsSync(checksumPath)) {
  fail("the intended archive or checksum path already exists.");
}
runGit(
  ["archive", "--format=zip", `--output=${archivePath}`, sourceCommit],
  { cwd: repositoryRoot },
);

const checksum = await sha256(archivePath);
await writeFile(checksumPath, `${checksum}  ${filename}\n`, {
  encoding: "utf8",
  flag: "wx",
});
const archiveStats = await stat(archivePath);

console.log(`Archive size: ${archiveStats.size} bytes`);
console.log(`Checksum path: ${checksumPath}`);
