#!/usr/bin/env node

/**
 * Script to publish a scoped version of the package to npm
 * Usage: npm run publish:scoped [patch|minor|major]
 * Default: patch
 *
 * This script uses version.local.json to track versioning independently
 * from the main package.json version.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const SCOPED_NAME = "@iantay/anki-mcp-server";
const PACKAGE_JSON_PATH = "./package.json";
const VERSION_FILE_PATH = "./version.local.json";

// Get version bump type from command line args (default: patch)
const versionBump = process.argv[2] || "patch";
if (!["patch", "minor", "major"].includes(versionBump)) {
	console.error("❌ Invalid version bump type. Use: patch, minor, or major");
	process.exit(1);
}

// Read version from version.local.json
const versionData = JSON.parse(readFileSync(VERSION_FILE_PATH, "utf8"));
const currentVersion = versionData.version;

// Read the original package.json
const originalContent = readFileSync(PACKAGE_JSON_PATH, "utf8");
const pkg = JSON.parse(originalContent);

// Bump version
function bumpVersion(version, type) {
	const [major, minor, patch] = version.split(".").map(Number);
	switch (type) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
	}
}

const newVersion = bumpVersion(currentVersion, versionBump);

console.log(
	`📦 Publishing ${SCOPED_NAME}@${newVersion} (${versionBump} bump from ${currentVersion})...`,
);

try {
	// Update package.json with scoped name and new version
	pkg.name = SCOPED_NAME;
	pkg.version = newVersion;
	// Note: bin name stays as 'anki-mcp-server' - npm will auto-correct scoped bin names

	// Write modified package.json
	writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + "\n");
	console.log("✅ Updated package.json with scoped name and new version");

	// Build the project
	console.log("🔨 Building project...");
	execSync("npm run build", { stdio: "inherit" });

	// Publish to npm
	console.log("🚀 Publishing to npm...");
	execSync("npm publish --access public", { stdio: "inherit" });

	console.log(`✅ Successfully published ${SCOPED_NAME}@${newVersion}`);

	// Update version.local.json with the new version
	versionData.version = newVersion;
	writeFileSync(
		VERSION_FILE_PATH,
		JSON.stringify(versionData, null, 2) + "\n",
	);
	console.log(`✅ Updated ${VERSION_FILE_PATH} to version ${newVersion}`);

	// Restore original package.json
	writeFileSync(PACKAGE_JSON_PATH, originalContent);
	console.log("✅ Restored original package.json");
} catch (error) {
	console.error("❌ Error during publish:", error.message);
	// Restore original package.json on error
	console.log("🔄 Restoring original package.json...");
	writeFileSync(PACKAGE_JSON_PATH, originalContent);
	console.log("✅ Restored original package.json");
	process.exit(1);
}
