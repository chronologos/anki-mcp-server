# Fork Documentation

This repository is a fork of [nailuoGG/anki-mcp-server](https://github.com/nailuoGG/anki-mcp-server) with additional features for enhanced LLM-driven flashcard workflows.

## Summary of Changes

| Feature | Upstream | This Fork |
|---------|----------|-----------|
| GUI integration tools | ❌ | ✅ |
| Card preview system | ❌ | ✅ |
| Interactive accept/reject/comment | ❌ | ✅ |

## New Features

### 1. GUI Integration Tools

Added two tools for interacting with Anki's graphical interface:

- **`gui_selected_notes`**: Retrieves notes currently selected in the Anki browser window. Returns both note IDs and full note details, useful for reviewing or modifying cards the user has manually selected.

- **`gui_current_card`**: Gets the card currently being shown during review. Enables workflows where an LLM can assist with cards as they're being studied.

### 2. Card Preview System (`batch_preview_notes`)

A complete HTML preview system that lets users review generated cards in a browser before committing them to Anki.

**Components:**
- `src/cardRenderer.ts` - Renders notes to clean HTML with shadcn/ui-inspired styling
- `src/previewServer.ts` - HTTP server that auto-selects an available port and opens the browser

**Features:**
- Renders both Basic (Front/Back) and Cloze (interactive deletions) cards
- Dark mode with localStorage persistence
- Interactive cloze reveals (click individual or toggle all)
- Keyboard shortcuts: `Space` = reveal all, `H` = hide all, `D` = dark mode
- Auto-closes server after 5 minutes of inactivity
- Optional custom ID field for tracking cards across sessions

### 3. Accept/Reject/Comment Workflow

The preview interface includes interactive feedback controls for each card:

- **Accept** (✓): Mark a card as approved
- **Reject** (✗): Mark a card for removal
- **Comment**: Add feedback or revision notes

This enables a human-in-the-loop workflow where an LLM generates cards, the user reviews them in the preview, and provides structured feedback that can be consumed programmatically.

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/cardRenderer.ts` | **New** | HTML rendering engine for card previews |
| `src/previewServer.ts` | **New** | HTTP server for browser-based preview |
| `src/mcpTools.ts` | Modified | Added `batch_preview_notes`, `gui_selected_notes`, `gui_current_card` |
| `src/utils.ts` | Modified | Added `guiSelectedNotes()` and `guiCurrentCard()` to AnkiClient |
| `CLAUDE.md` | Modified | Documented new tools and preview system |

## Usage Examples

### Preview cards before creation

```javascript
// Same format as batch_create_notes
{
  "notes": [
    {
      "type": "Basic",
      "deck": "Programming",
      "fields": { "Front": "What is a closure?", "Back": "A function with access to its outer scope" },
      "tags": ["javascript"],
      "id": "closure-001"  // Optional tracking ID
    },
    {
      "type": "Cloze",
      "deck": "Programming",
      "fields": { "Text": "In JavaScript, {{c1::const}} declares a {{c2::block-scoped}} variable" },
      "tags": ["javascript", "syntax"]
    }
  ],
  "port": 3000  // Optional, auto-selects if not specified
}
```

### Get selected notes from Anki browser

```javascript
// No parameters required
// Returns: { noteIds: [...], notes: [...] }
```

### Get current review card

```javascript
// No parameters required
// Returns: card details or null if not reviewing
```

## Staying in Sync with Upstream

```bash
# Add upstream remote if not already added
git remote add upstream git@github.com:nailuoGG/anki-mcp-server.git

# Fetch and merge upstream changes
git fetch upstream
git merge upstream/master
```

## Why This Fork?

The upstream `anki-mcp-server` provides solid fundamentals for creating and managing Anki cards via MCP. This fork extends it with features specifically designed for **LLM-assisted flashcard creation workflows**:

1. **Quality control**: Preview cards visually before they're created, catching formatting issues and errors
2. **Human-in-the-loop**: The accept/reject/comment system enables structured feedback on LLM-generated cards
3. **Context awareness**: GUI tools let the LLM understand what the user is currently looking at in Anki
