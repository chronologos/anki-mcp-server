# Anki MCP Server - Agent Development Guide

## Project Overview

The Anki MCP Server is a Model Context Protocol (MCP) implementation that enables Large Language Models (LLMs) to interact with Anki flashcard software via the AnkiConnect addon. It acts as a bridge, allowing agents to programmatically create, search, and manage Anki decks and notes.

## Architecture

The server is built with TypeScript and structured into several key components:

1.  **`ankiMcpServer.ts`**: The main server entry point. It initializes the MCP server from `@modelcontextprotocol/sdk`, registers request handlers, and links them to the appropriate handlers. It also performs an initial `checkConnection` to ensure AnkiConnect is available.

2.  **`mcpTools.ts`**: Contains the `McpToolHandler` class, which defines and implements all the tools available to an agent (e.g., `create_note`, `list_decks`). It defines the schema for each tool's inputs and contains the logic to execute the corresponding AnkiConnect action.

3.  **`mcpResource.ts`**: Contains the `McpResourceHandler` class, which defines and implements access to static data resources (e.g., `anki://decks/all`). It handles URI routing and retrieves information from Anki.

4.  **`utils.ts`**: Provides a wrapper class `AnkiClient` for the `yanki-connect` library. This centralizes AnkiConnect API calls and error handling. It's a critical component for interacting with Anki.

## Key Concepts

### AnkiConnect Client (`utils.ts`)

All interactions with the AnkiConnect API are routed through the `AnkiClient` class. This provides a consistent error-handling layer. Before dispatching any request, the server calls `ankiClient.checkConnection()` to provide a clear error message if Anki or AnkiConnect is unavailable.

### Resource Caching (`mcpResource.ts`)

To improve performance and reduce redundant API calls, the `McpResourceHandler` implements a simple in-memory cache for note type schemas. The cache has a 5-minute expiry. When developing new resource handlers, consider if a similar caching strategy is appropriate.

---

## Quick Reference

### Available Tools

-   **`list_decks`**: Lists all available Anki decks.
-   **`create_deck`**: Creates a new Anki deck.
    -   `name`: `string`
-   **`create_note`**: Creates a new note. **Hint**: Call `get_note_type_info` first.
    -   `type`: `string`
    -   `deck`: `string`
    -   `fields`: `object`
    -   `tags?`: `string[]`
-   **`batch_create_notes`**: Creates multiple notes in a single call.
    -   `notes`: `object[]` (array of note objects)
-   **`search_notes`**: Searches for notes using Anki's query syntax.
    -   `query`: `string`
-   **`get_note_info`**: Retrieves detailed information for a specific note ID.
    -   `noteId`: `number`
-   **`update_note`**: Updates the fields or tags of an existing note.
    -   `id`: `number`
    -   `fields?`: `object`
    -   `tags?`: `string[]`
-   **`delete_note`**: Deletes a note by its ID.
    -   `noteId`: `number`
-   **`list_note_types`**: Lists all available note type names.
-   **`get_note_type_info`**: Gets the detailed structure (fields, templates) of a note type.
    -   `modelName`: `string`
-   **`create_note_type`**: Creates a new note type.
    -   `name`: `string`
    -   `fields`: `string[]`
    -   `templates`: `object[]`
    -   `css?`: `string`

### Available Resources

-   **`anki://decks/all`**: Retrieves a JSON object containing a list of all deck names.
-   **`anki://note-types/all`**: Retrieves a JSON object with a list of all note type names.
-   **`anki://note-types/all-with-schemas`**: Retrieves detailed structures for all note types.
-   **`anki://note-types/{modelName}`**: (Template) Retrieves the detailed structure for a specific note type.

---

## Development Guidelines

### Adding New Tools

1.  **Define the tool schema and handler** in `mcpTools.ts`. Follow the existing pattern within the `McpToolHandler` class. Make the tool name descriptive and snake_cased.

    *Example: Adding a tool to add tags to an existing note.*
    ```typescript
    // In getToolSchema()
    {
        name: "add_tags_to_note",
        description: "Add one or more tags to an existing note",
        inputSchema: {
            type: "object",
            properties: {
                noteId: { type: "number", description: "The ID of the note to add tags to" },
                tags: { type: "array", items: { type: "string" }, description: "An array of tags to add" }
            },
            required: ["noteId", "tags"],
        },
    },

    // In executeTool(), add a case for it
    case "add_tags_to_note":
        return this.addTagsToNote(args);
    
    // Implement the private handler method
    private async addTagsToNote(args: { noteId: number; tags: string[] }): Promise</*...*/> {
        if (!args.tags || args.tags.length === 0) {
            throw new McpError(ErrorCode.InvalidParams, "Tags array cannot be empty.");
        }
        await this.ankiClient.addTags(args.noteId, args.tags);
        return { content: [{ type: "text", text: `Tags added successfully to note ${args.noteId}.` }] };
    }
    ```

2.  **Add a corresponding method** to the `AnkiClient` in `utils.ts` if it requires a new AnkiConnect action.

3.  **Add tests** for the new tool in the relevant test file.

### Error Handling

-   Use the `McpError` class for all thrown errors.
-   Choose an appropriate `ErrorCode` from the MCP SDK.
-   Provide clear, user-facing error messages. Check for invalid parameters early.

## Common Patterns

### Creating a Basic Note

```typescript
// 1. First, get the structure of the "Basic" note type.
// Agent calls: get_note_type_info({ modelName: "Basic" })
// This confirms the fields are "Front" and "Back".

// 2. Then, create the note.
const note = {
  type: "Basic",
  deck: "Programming",
  fields: {
    Front: "What is a closure in JavaScript?",
    Back: "A closure is the combination of a function and the lexical environment within which that function was declared."
  },
  tags: ["javascript", "programming-concepts"]
};

// Agent calls: create_note(note)
```

### Searching and Updating a Note

```typescript
// 1. Find a note to update.
// Agent calls: search_notes({ query: "deck:Programming 'closure in JavaScript'" })
// Server returns a list of note IDs, e.g., [1512513129312]

// 2. Use the ID to update the note's tags.
// Agent calls: update_note({ id: 1512513129312, tags: ["js", "closures"] })
```

## Best Practices

1.  **Leverage Existing Tools**: Before adding a new tool, check if the desired functionality can be achieved by composing existing tools.
2.  **Use `get_note_type_info`**: Always encourage the agent to call `get_note_type_info` before using `create_note` to ensure the correct field names are used. This is a major source of potential errors.
3.  **Idempotency**: Where possible, design tools to be idempotent. For example, `create_deck` doesn't fail if the deck already exists.
4.  **Batching**: For creating multiple notes, `batch_create_notes` is significantly more performant than calling `create_note` in a loop.
5.  **Clarity over Conciseness**: In descriptions and schemas, be explicit to reduce ambiguity for the agent.

## Future Development

### Potential Enhancements

-   **Media Support**: Tools for adding audio, images, or video to notes. This would require handling file data.
-   **Card-level Operations**: Tools to suspend, unsuspend, or reposition individual cards, not just notes.
-   **Advanced Search**: A structured query tool that abstracts away some of Anki's complex search syntax.
-   **Profile Management**: Tools for listing or switching Anki profiles.

## Troubleshooting

### Common Issues

1. **AnkiConnect Connection**
   - Verify Anki is running
   - Check AnkiConnect installation
   - Validate port configuration

2. **Note Creation**
   - Verify deck exists
   - Check note type configuration
   - Validate field names

3. **Performance**
   - Use batch operations
   - Minimize API calls
   - Check for connection issues

### GUI Function Issues (Critical)

**Issue:** GUI functions like `guiSelectedNotes` and `guiCurrentCard` return empty results even when direct API calls work.

**Root Cause:** Using `client.invoke()` instead of proper yanki-connect namespace methods.

**Solution:** Always use the typed namespace methods in `utils.ts`:
- ✅ `client.graphical.guiSelectedNotes()` 
- ❌ `client.invoke("guiSelectedNotes")`
- ✅ `client.graphical.guiCurrentCard()`
- ❌ `client.invoke("guiCurrentCard")`
- ✅ `client.miscellaneous.version()`
- ❌ `client.invoke("version")`

**Why:** The yanki-connect library organizes methods into typed namespaces that provide proper error handling and response processing. The raw `invoke()` method doesn't process GUI responses correctly.

### Development Guidelines for yanki-connect

When adding new AnkiConnect functionality to `utils.ts`:

1. **Check the namespace:** Look at the [yanki-connect documentation](https://github.com/kitschpatrol/yanki-connect) to find the correct namespace:
   - `client.card.*` for card operations
   - `client.deck.*` for deck operations  
   - `client.graphical.*` for GUI operations
   - `client.miscellaneous.*` for utility functions
   - `client.model.*` for note type operations
   - `client.note.*` for note operations

2. **Use typed methods first:** Always try the namespace method before falling back to `invoke()`

3. **Test with MCP Inspector:** If direct API calls work but MCP doesn't, check namespace usage

## Resources

- [AnkiConnect API](https://foosoft.net/projects/anki-connect/)
- [MCP Documentation](https://github.com/modelcontextprotocol)
- [TypeScript Documentation](https://www.typescriptlang.org/) 