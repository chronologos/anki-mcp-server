/**
 * Preview Server for Anki card previews
 * Serves generated HTML on localhost and opens browser automatically
 */

import { exec } from "node:child_process";
import * as http from "node:http";
import * as net from "node:net";

/**
 * Server configuration
 */
interface ServerConfig {
	port?: number;
	timeout?: number; // in milliseconds
}

/**
 * Server result
 */
export interface ServerResult {
	url: string;
	port: number;
	message: string;
}

/**
 * Check if a port is available
 */
function isPortAvailable(port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const server = net.createServer();

		server.once("error", () => {
			resolve(false);
		});

		server.once("listening", () => {
			server.close();
			resolve(true);
		});

		server.listen(port);
	});
}

/**
 * Find an available port in the given range
 */
async function findAvailablePort(startPort = 3000, maxAttempts = 100): Promise<number> {
	for (let i = 0; i < maxAttempts; i++) {
		const port = startPort + i;
		if (await isPortAvailable(port)) {
			return port;
		}
	}
	throw new Error(`No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

/**
 * Open URL in default browser
 */
function openBrowser(url: string): void {
	const platform = process.platform;

	let command: string;
	if (platform === "darwin") {
		command = `open "${url}"`;
	} else if (platform === "win32") {
		command = `start "" "${url}"`;
	} else {
		// Linux and others
		command = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}"`;
	}

	exec(command, (error) => {
		if (error) {
			console.error(`[Preview Server] Failed to open browser: ${error.message}`);
			console.error(`[Preview Server] Please manually open: ${url}`);
		} else {
			console.error(`[Preview Server] Opened browser at ${url}`);
		}
	});
}

/**
 * Create and start preview server
 */
export async function startPreviewServer(
	html: string,
	config: ServerConfig = {}
): Promise<ServerResult> {
	const timeout = config.timeout || 5 * 60 * 1000; // 5 minutes default
	let port = config.port;

	// Find available port if not specified or if specified port is taken
	if (!port || !(await isPortAvailable(port))) {
		port = await findAvailablePort(port || 3000);
	}

	return new Promise((resolve, reject) => {
		interface ServerWithTimer extends http.Server {
			closeTimer?: NodeJS.Timeout;
		}

		const server = http.createServer((req, res) => {
			// Enable CORS
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type");

			// Handle OPTIONS preflight
			if (req.method === "OPTIONS") {
				res.writeHead(200);
				res.end();
				return;
			}

			// Serve HTML for all paths
			res.writeHead(200, {
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "no-cache, no-store, must-revalidate",
			});
			res.end(html);

			console.error(`[Preview Server] Served preview to ${req.socket.remoteAddress}`);
		}) as ServerWithTimer;

		// Error handling
		server.on("error", (error) => {
			console.error(`[Preview Server] Server error: ${error.message}`);
			reject(error);
		});

		// Start listening
		server.listen(port, "127.0.0.1", () => {
			const url = `http://localhost:${port}`;
			console.error(`[Preview Server] Server started at ${url}`);
			console.error(
				`[Preview Server] Server will automatically close after ${
					timeout / 1000
				} seconds of inactivity`
			);

			// Auto-close timer
			const closeTimer = setTimeout(() => {
				console.error("[Preview Server] Closing server due to inactivity timeout");
				server.close();
			}, timeout);

			// Keep reference to timer for cleanup
			server.closeTimer = closeTimer;

			// Open browser
			openBrowser(url);

			// At this point, port is guaranteed to be defined
			const finalPort = port as number;

			resolve({
				url,
				port: finalPort,
				message: "Preview server running. Browser should open automatically.",
			});
		});

		// Cleanup on server close
		server.on("close", () => {
			console.error("[Preview Server] Server closed");
			const timer = server.closeTimer;
			if (timer) {
				clearTimeout(timer);
			}
		});
	});
}

/**
 * Quick preview function - simplified interface
 */
export async function previewInBrowser(html: string, port?: number): Promise<ServerResult> {
	try {
		return await startPreviewServer(html, { port });
	} catch (error) {
		throw new Error(
			`Failed to start preview server: ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
