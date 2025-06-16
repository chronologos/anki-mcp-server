#!/usr/bin/env node
/**
 * Main entry point for the Anki MCP Server
 */
import { AnkiMcpServer } from "./ankiMcpServer.js";

/**
 * Parse command line arguments
 */
function parseArgs(): { ankiConnectKey?: string } {
	const args = process.argv.slice(2);
	let ankiConnectKey: string | undefined;

	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--anki-connect-key" && i + 1 < args.length) {
			ankiConnectKey = args[i + 1];
			// Clean and trim the API key
			ankiConnectKey = ankiConnectKey.trim();
			// Remove surrounding quotes if present (for JSON config compatibility)
			if (ankiConnectKey.startsWith('"') && ankiConnectKey.endsWith('"')) {
				ankiConnectKey = ankiConnectKey.slice(1, -1).trim();
			}
			if (ankiConnectKey.startsWith("'") && ankiConnectKey.endsWith("'")) {
				ankiConnectKey = ankiConnectKey.slice(1, -1).trim();
			}
			i++; // Skip the next argument since it's the value
		}
	}

	// Debug logging (to stderr so it doesn't interfere with MCP communication)
	if (ankiConnectKey) {
		console.error(`[DEBUG] API key configured`);
	}

	return { ankiConnectKey };
}

/**
 * Main function
 */
async function main() {
	try {
		const { ankiConnectKey } = parseArgs();
		const server = new AnkiMcpServer({ ankiConnectKey });
		await server.run();
	} catch (error) {
		console.error("Failed to start Anki MCP Server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch(console.error);
