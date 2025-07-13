# Anki MCP Server

A Model Context Protocol (MCP) server that enables LLMs to interact with Anki flashcard software through AnkiConnect.

![Anki Icon](./assets/icon.png)

## Features

### Tools
- `list_decks` - List all available Anki decks
- `create_deck` - Create a new Anki deck
- `create_note` - Create a new note (Basic or Cloze)
- `batch_create_notes` - Create multiple notes at once
- `search_notes` - Search for notes using Anki query syntax
- `get_note_info` - Get detailed information about a note
- `update_note` - Update an existing note
- `delete_note` - Delete a note
- `list_note_types` - List all available note types
- `create_note_type` - Create a new note type
- `get_note_type_info` - Get detailed structure of a note type
- `gui_selected_notes` - Get selected notes from the Anki GUI browser
- `gui_current_card` - Get the current card being shown in Anki GUI

### Resources
- `anki://decks/all` - Complete list of available decks
- `anki://note-types/all` - List of all available note types
- `anki://note-types/all-with-schemas` - Detailed structure information for all note types
- `anki://note-types/{modelName}` - Detailed structure information for a specific note type

## Prerequisites

1. [Anki](https://apps.ankiweb.net/) installed on your system
2. [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki

## Configuration

### Using API Key for AnkiConnect

If your AnkiConnect plugin is configured with an API key for security, you can provide it using the `--anki-connect-key` argument:

```bash
npx anki-mcp-server --anki-connect-key "your-api-key-here"
```

### Usage with Claude Desktop

Add the server to your claude_desktop_config.json:

**Without API key:**
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes","anki-mcp-server"]
    }
  }
}
```

**With API key:**
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes","anki-mcp-server", "--anki-connect-key", "your-api-key-here"]
    }
  }
}
```

#### Using Local Development Build

If you're developing or testing local changes, use the absolute path to your built version:

```json
{
  "mcpServers": {
    "anki": {
      "command": "node",
      "args": ["/absolute/path/to/anki-mcp-server/dist/index.js", "--anki-connect-key", "your-api-key-here"]
    }
  }
}
```

**Important:** When using local builds:
1. Make your changes to the source code
2. Run `npm run build` to compile
3. Restart Claude Desktop to pick up changes
4. The local build will use your latest changes instead of the published npm package

### Configuration for Cline

Add the server to your Cline MCP settings file inside VSCode's settings `cline_mcp_settings.json` 

**Without API key:**
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes","anki-mcp-server"]
    }
  }
}
```

**With API key:**
```json
{
  "mcpServers": {
    "anki": {
      "command": "npx",
      "args": ["--yes","anki-mcp-server", "--anki-connect-key", "your-api-key-here"]
    }
  }
}
```

## Development

### Setup

1. Install dependencies:  
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. For development with auto-rebuild:
```bash
npm run watch
```

### Testing

Run the test suite:
```bash
npm test
```

This executes tests for:
- Server initialization
- AnkiConnect communication
- Note operations (create/read/update/delete)
- Deck management
- Error handling

### Debugging

Since MCP servers communicate over stdio, we recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npm run inspector
```

This provides a browser-based interface for:
- Monitoring MCP messages
- Testing tool invocations
- Viewing server logs
- Debugging communication issues

## Example Usage

1. Create a new deck:
```
Create a new Anki deck called "Programming"
```

2. Add a basic card:
```
Create an Anki card in the "Programming" deck with:
Front: What is a closure in JavaScript?
Back: A closure is the combination of a function and the lexical environment within which that function was declared.
```

3. Add a cloze deletion card:
```
Create a cloze card in the "Programming" deck with:
Text: In JavaScript, {{c1::const}} declares a block-scoped variable that cannot be {{c2::reassigned}}.
```

4. Get selected notes from Anki GUI:
```
Show me the notes that are currently selected in the Anki browser
```

5. Get current card being studied:
```
What card is currently being shown in Anki?
```

## Troubleshooting

### GUI Functions Not Working (`guiSelectedNotes`, `guiCurrentCard`)

**Symptoms:** 
- Direct API calls with curl work fine
- MCP Inspector and Claude return empty results for `gui_selected_notes`
- Getting different behavior between direct API calls and the MCP server

**Root Cause:**
The issue was using `client.invoke("guiSelectedNotes")` instead of the proper yanki-connect namespace methods.

**Solution:**
Use the typed namespace methods:
- `client.graphical.guiSelectedNotes()` instead of `client.invoke("guiSelectedNotes")`
- `client.graphical.guiCurrentCard()` instead of `client.invoke("guiCurrentCard")`
- `client.miscellaneous.version()` instead of `client.invoke("version")`

The yanki-connect library organizes its methods into typed namespaces (`client.graphical.*`, `client.miscellaneous.*`, etc.) which provide better error handling and response processing than the raw `invoke()` method.

### Common AnkiConnect Issues

1. **Connection Refused**
   - Ensure Anki is running
   - Verify AnkiConnect add-on is installed and enabled
   - Check if port 8765 is accessible

2. **API Key Required**
   - If you configured AnkiConnect with an API key, use the `--anki-connect-key` argument

3. **Collection Unavailable**
   - Close any open dialogs in Anki
   - Ensure no other applications are accessing the Anki database

4. **GUI Functions Require Browser Open**
   - `gui_selected_notes` requires the Anki Card Browser to be open
   - `gui_current_card` requires a card to be currently displayed in review mode

## Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests: `npm test`
4. Submit a pull request

## Credits

Icon courtesy of [macOS Icons](https://macosicons.com/#/?icon=mWDBpVXqbc)

## License

MIT License - see LICENSE file for details
