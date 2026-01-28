#!/usr/bin/env node
/**
 * Main entry point for the Anki MCP Server
 */
import { AnkiMcpServer } from "./ankiMcpServer.js";

/**
 * Parse command line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	const portIndex = args.indexOf("--port");
	const port = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : 8765;

	if (Number.isNaN(port) || port < 1 || port > 65535) {
		console.error("Invalid port number. Please provide a valid port between 1-65535");
		process.exit(1);
	}

	const mediaPathIndex = args.indexOf("--media-path");
	const mediaPath =
		mediaPathIndex !== -1 && args[mediaPathIndex + 1] ? args[mediaPathIndex + 1] : undefined;

	return { port, mediaPath };
}

/**
 * Main function
 */
async function main() {
	try {
		const { port, mediaPath } = parseArgs();
		const server = new AnkiMcpServer(port, mediaPath);
		await server.run();
	} catch (error) {
		console.error("Failed to start Anki MCP Server:", error);
		process.exit(1);
	}
}

// Start the server
main().catch(console.error);
