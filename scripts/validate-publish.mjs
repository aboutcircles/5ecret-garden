import fs from "node:fs/promises";
import path from "node:path";

function die(message) {
    throw new Error(message);
}

function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function gatherExportTargets(node, out) {
    if (typeof node === "string") {
        out.push(node);
        return;
    }
    if (Array.isArray(node)) {
        for (const item of node) {
            gatherExportTargets(item, out);
        }
        return;
    }
    if (isObject(node)) {
        for (const value of Object.values(node)) {
            gatherExportTargets(value, out);
        }
    }
}

function getTopLevelDir(p) {
    const normalized = p.startsWith("./") ? p.slice(2) : p;
    const firstSlash = normalized.indexOf("/");
    if (firstSlash < 0) {
        return normalized.length > 0 ? normalized : null;
    }
    return normalized.slice(0, firstSlash);
}

function findWorkspaceProtocolDeps(pkgJson) {
    const fields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
    const problems = [];
    for (const field of fields) {
        const deps = pkgJson[field];
        if (!isObject(deps)) {
            continue;
        }
        for (const [depName, range] of Object.entries(deps)) {
            if (typeof range === "string" && range.startsWith("workspace:")) {
                problems.push({ field, depName, range });
            }
        }
    }
    return problems;
}

async function fileExists(absPath) {
    try {
        await fs.stat(absPath);
        return true;
    } catch {
        return false;
    }
}

async function main() {
    const mode = process.argv[2];
    const pkgDirArg = process.argv[3];

    const isModeValid = mode === "pre" || mode === "post";
    if (!isModeValid) {
        die(`Invalid mode "${mode}". Use "pre" or "post".`);
    }
    if (!pkgDirArg) {
        die("Missing package directory argument.");
    }

    const pkgDir = path.resolve(pkgDirArg);
    const pkgJsonPath = path.join(pkgDir, "package.json");

    const raw = await fs.readFile(pkgJsonPath, "utf8");
    const pkgJson = JSON.parse(raw);

    const isPrivate = Boolean(pkgJson.private);
    if (isPrivate) {
        return;
    }

    const name = typeof pkgJson.name === "string" ? pkgJson.name : "";
    const version = typeof pkgJson.version === "string" ? pkgJson.version : "";

    if (!name) {
        die(`${pkgJsonPath}: missing "name"`);
    }
    if (!version) {
        die(`${pkgJsonPath}: missing "version"`);
    }

    const workspaceProtocolDeps = findWorkspaceProtocolDeps(pkgJson);
    if (workspaceProtocolDeps.length > 0) {
        const lines = workspaceProtocolDeps.map((p) => `- ${p.field}.${p.depName}: ${p.range}`).join("\n");
        die(
            `${name}: found unsupported "workspace:" dependency ranges.\n` +
            `Replace these with real semver ranges before publishing:\n${lines}`
        );
    }

    const filesField = Array.isArray(pkgJson.files) ? pkgJson.files.filter((x) => typeof x === "string") : null;

    const entryCandidates = [];
    if (typeof pkgJson.main === "string") {
        entryCandidates.push(pkgJson.main);
    }
    if (typeof pkgJson.module === "string") {
        entryCandidates.push(pkgJson.module);
    }
    if (typeof pkgJson.types === "string") {
        entryCandidates.push(pkgJson.types);
    }

    if (pkgJson.exports !== undefined) {
        gatherExportTargets(pkgJson.exports, entryCandidates);
    }

    const fileTargets = entryCandidates
        .filter((p) => typeof p === "string")
        .filter((p) => p.length > 0)
        .filter((p) => !p.startsWith("node:"))
        .filter((p) => !p.startsWith("http:") && !p.startsWith("https:"));

    if (mode === "pre") {
        if (filesField) {
            const referencedTopDirs = new Set();
            for (const t of fileTargets) {
                if (t.startsWith("./") || t.includes("/")) {
                    const top = getTopLevelDir(t);
                    if (top && top !== "." && top !== "") {
                        referencedTopDirs.add(top);
                    }
                }
            }

            const missing = [];
            for (const top of referencedTopDirs) {
                const isIncluded = filesField.some((f) => f === top || f.startsWith(`${top}/`) || f.startsWith(`${top}\\`) || f.startsWith(`${top}**`) || f.startsWith(`${top}/**`));
                if (!isIncluded) {
                    missing.push(top);
                }
            }

            if (missing.length > 0) {
                die(
                    `${name}: package.json has a "files" whitelist but it does not include directories referenced by entrypoints/exports: ${missing.join(", ")}.\n` +
                    `Either add them to "files" (e.g. "dist") or change your entrypoints/exports to match.`
                );
            }
        }
        return;
    }

    const missingFiles = [];
    for (const t of fileTargets) {
        const rel = t.startsWith("./") ? t.slice(2) : t;
        const abs = path.join(pkgDir, rel);
        const exists = await fileExists(abs);
        if (!exists) {
            missingFiles.push(t);
        }
    }

    if (missingFiles.length > 0) {
        const lines = missingFiles.map((p) => `- ${p}`).join("\n");
        die(`${name}: build output missing files referenced by main/module/types/exports:\n${lines}`);
    }
}

await main();
