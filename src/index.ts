#!/usr/bin/env node
/**
 * Main entry point for the Anki MCP Server
 */
import { AnkiMcpServer } from "./ankiMcpServer.js";

/**
 * Parse command line arguments
 */
function parseArgs(): { ankiConnectKey?: string; flashcardInstructionsPath?: string } {
  const args = process.argv.slice(2);
  let ankiConnectKey: string | undefined;
  let flashcardInstructionsPath: string | undefined;

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
    } else if (args[i] === "--flashcard-instructions-path" && i + 1 < args.length) {
      flashcardInstructionsPath = args[i + 1];
      // Clean and trim the path
      flashcardInstructionsPath = flashcardInstructionsPath.trim();
      // Remove surrounding quotes if present
      if (flashcardInstructionsPath.startsWith('"') && flashcardInstructionsPath.endsWith('"')) {
        flashcardInstructionsPath = flashcardInstructionsPath.slice(1, -1).trim();
      }
      if (flashcardInstructionsPath.startsWith("'") && flashcardInstructionsPath.endsWith("'")) {
        flashcardInstructionsPath = flashcardInstructionsPath.slice(1, -1).trim();
      }
      i++; // Skip the next argument since it's the value
    }
  }

  // Debug logging (to stderr so it doesn't interfere with MCP communication)
  if (ankiConnectKey) {
    console.error(`[DEBUG] API key configured`);
  }
  if (flashcardInstructionsPath) {
    console.error(`[DEBUG] Flashcard instructions path: ${flashcardInstructionsPath}`);
  }

  return { ankiConnectKey, flashcardInstructionsPath };
}

/**
 * Main function
 */
async function main() {
  try {
    const { ankiConnectKey, flashcardInstructionsPath } = parseArgs();

    // Set CLI argument as highest priority by setting it as an environment variable
    if (flashcardInstructionsPath) {
      process.env.ANKI_FLASHCARD_INSTRUCTIONS_PATH_CLI = flashcardInstructionsPath;
    }

    const server = new AnkiMcpServer({ ankiConnectKey });
    await server.run();
  } catch (error) {
    console.error("Failed to start Anki MCP Server:", error);
    process.exit(1);
  }
}

// Start the server
main().catch(console.error);
