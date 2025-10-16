# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an MCP (Model Context Protocol) server that enables LLMs to interact with Anki flashcard software through AnkiConnect. The server provides tools for creating, searching, updating, and managing Anki notes and decks.

## Development Commands

### Build & Development

```bash
# Install dependencies
npm install

# Build the server
npm run build

# Development mode with auto-rebuild
npm run watch

# Run the MCP Inspector for debugging
npm run inspector

# Build and package as .mcpb extension
npm run mcpb

# Validate server.json against MCP schema
npm run validate-mcp
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Format code with Biome
npm run format

# Lint code
npm run lint

# Check and auto-fix issues
npm run check
```

## Architecture

### Core Components

- **`src/index.ts`**: Entry point that parses CLI arguments (`--port` flag) and initializes AnkiMcpServer
- **`src/ankiMcpServer.ts`**: Main server class that handles MCP protocol communication, request routing, and connection checks
- **`src/mcpTools.ts`**: Implements all MCP tool handlers for Anki operations (create/update/delete notes, manage decks)
- **`src/mcpResource.ts`**: Handles MCP resource endpoints with caching for note type schemas (5-minute TTL)
- **`src/utils.ts`**: AnkiClient class - anti-corruption layer that wraps `yanki-connect` with retry logic, error normalization, and MCP error conversion

### MCP Architecture Pattern

The server follows a layered architecture:

1. **Entry Layer** (`index.ts`): CLI argument parsing and server initialization
2. **Protocol Layer** (`ankiMcpServer.ts`): MCP protocol handling, request routing, and connection validation
3. **Handler Layer** (`mcpTools.ts`, `mcpResource.ts`): Business logic for tools and resources
4. **Anti-Corruption Layer** (`utils.ts`): Abstracts `yanki-connect` library with:
   - Retry logic with exponential backoff
   - Error normalization (connection, timeout, API errors)
   - Type safety and validation

### MCP Tools Available

The server implements the following tools:
- `list_decks` - List all available Anki decks
- `create_deck` - Create a new Anki deck
- `create_note` - Create a new note (Basic or Cloze)
- `batch_create_notes` - Create multiple notes at once (recommended: 10-20 notes per batch, max: 50)
- `search_notes` - Search for notes using Anki query syntax (returns first 50 results)
- `get_note_info` - Get detailed information about a note
- `update_note` - Update an existing note
- `delete_note` - Delete a note
- `list_note_types` - List all available note types
- `create_note_type` - Create a new note type
- `get_note_type_info` - Get detailed structure of a note type
- `gui_selected_notes` - Get selected notes from Anki browser (returns note IDs and full note details)
- `gui_current_card` - Get current card being reviewed in Anki GUI

### MCP Resources Available

The server provides the following resources:
- `anki://decks/all` - Complete list of available decks
- `anki://note-types/all` - List of all available note types
- `anki://note-types/all-with-schemas` - Detailed structure information for all note types (cached)
- `anki://note-types/{modelName}` - Detailed structure information for a specific note type (cached)

### Build Configuration

- **TypeScript**: ES2020 target with Node18 as minimum
- **Bundler**: tsup with ESM output only, minified
- **Code Formatter**: Biome (configured via lint-staged pre-commit hook)
- **Testing**: Jest with ts-jest preset
- **Version Management**: `prebuild` script auto-generates `src/_version.ts` from `package.json`

### Dependencies

- **Core**: `@modelcontextprotocol/sdk`, `axios`, `yanki-connect`
- **Development**: TypeScript, tsup, Jest, Biome, Husky

## Important Notes

### Runtime Requirements
- The server requires Anki and AnkiConnect addon to be running
- Default AnkiConnect port is 8765, configurable via `--port` flag
- The server communicates via stdio with the MCP client

### Version Management
- Version is managed in `package.json`
- `prebuild` script automatically injects version into `src/_version.ts` before build
- Pre-commit hooks run Biome formatting via lint-staged

### Error Handling
- The `AnkiClient` class normalizes errors from `yanki-connect` into three types:
  - `AnkiConnectionError`: Anki not running or unreachable
  - `AnkiTimeoutError`: Connection timeout
  - `AnkiApiError`: Anki API errors (e.g., collection unavailable)
- All errors are converted to MCP `ErrorCode.InternalError` with descriptive messages

### CI/CD
- Automated publishing to NPM and MCP Registry on releases
- Multi-version Node.js testing (18.x, 20.x, 22.x)
- Schema validation for `server.json` before publishing
- Beta release support via GitHub Actions