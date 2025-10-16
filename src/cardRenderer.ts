/**
 * Card Renderer for Anki note previews
 * Simplified version using shadcn/ui design principles
 */

/**
 * Note structure matching batch_create_notes format
 */
export interface PreviewNote {
	type: "Basic" | "Cloze";
	deck: string;
	fields: Record<string, string>;
	tags?: string[];
	id?: string | number; // Optional custom ID for tracking across sessions/subsets
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Extract card preview text (first 60 chars of main field)
 */
function extractCardPreview(note: PreviewNote): string {
	let text = "";
	if (note.type === "Basic") {
		text = note.fields.Front || note.fields.front || "";
	} else {
		text = note.fields.Text || note.fields.text || "";
	}
	// Strip HTML tags for preview
	text = text.replace(/<[^>]*>/g, "");
	// Truncate to 60 chars
	return text.length > 60 ? `${text.substring(0, 60)}...` : text;
}

/**
 * Convert cloze text to HTML with interactive reveals
 */
function renderClozeHtml(text: string): string {
	const clozeRegex = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;

	return text.replace(clozeRegex, (_match, number, content, hint) => {
		const displayHint = hint ? `[${hint}]` : "[...]";
		return `<span class="cloze" data-cloze="${number}">
      <span class="cloze-hidden">${displayHint}</span>
      <span class="cloze-revealed" style="display: none;">${content}</span>
    </span>`;
	});
}

/**
 * Count unique cloze deletions in text
 */
function countClozes(text: string): number {
	const clozeRegex = /\{\{c(\d+)::([^:}]+)(?:::([^}]+))?\}\}/g;
	const numbers = new Set<string>();
	let match = clozeRegex.exec(text);

	while (match !== null) {
		numbers.add(match[1]);
		match = clozeRegex.exec(text);
	}

	return numbers.size;
}

/**
 * Render a single Basic card
 */
function renderBasicCard(note: PreviewNote, index: number, totalCards: number): string {
	const front = note.fields.Front || note.fields.front || "";
	const back = note.fields.Back || note.fields.back || "";
	const tags = note.tags ? note.tags.join(", ") : "";
	const preview = extractCardPreview(note);
	const cardId = note.id ?? index;

	const extraFields = Object.entries(note.fields)
		.filter(([key]) => !["Front", "front", "Back", "back"].includes(key))
		.map(
			([key, value]) => `
      <div class="field-group extra">
        <div class="field-label">${escapeHtml(key)}</div>
        <div class="field-content">${value}</div>
      </div>
    `
		)
		.join("");

	return `
    <div class="card" data-index="${index}" data-id="${cardId}" data-preview="${escapeHtml(preview)}">
      <div class="card-header">
        <div class="card-meta">
          <span class="card-number">${index + 1}/${totalCards}</span>
          <span class="card-type">Basic</span>
        </div>
        <span class="card-deck">${escapeHtml(note.deck)}</span>
      </div>
      <div class="card-body">
        <div class="field-group">
          <div class="field-label">Front</div>
          <div class="field-content">${front}</div>
        </div>
        <div class="divider"></div>
        <div class="field-group">
          <div class="field-label">Back</div>
          <div class="field-content">${back}</div>
        </div>
        ${extraFields}
      </div>
      ${tags ? `<div class="card-footer"><span class="tags">${escapeHtml(tags)}</span></div>` : ""}
    </div>
  `;
}

/**
 * Render a single Cloze card
 */
function renderClozeCard(note: PreviewNote, index: number, totalCards: number): string {
	const text = note.fields.Text || note.fields.text || "";
	const extra = note.fields.Extra || note.fields.extra || "";
	const tags = note.tags ? note.tags.join(", ") : "";
	const preview = extractCardPreview(note);
	const cardId = note.id ?? index;
	const clozeCount = countClozes(text);

	const extraFields = Object.entries(note.fields)
		.filter(([key]) => !["Text", "text", "Extra", "extra"].includes(key))
		.map(
			([key, value]) => `
      <div class="field-group extra">
        <div class="field-label">${escapeHtml(key)}</div>
        <div class="field-content">${value}</div>
      </div>
    `
		)
		.join("");

	return `
    <div class="card" data-index="${index}" data-id="${cardId}" data-preview="${escapeHtml(preview)}">
      <div class="card-header">
        <div class="card-meta">
          <span class="card-number">${index + 1}/${totalCards}</span>
          <span class="card-type">Cloze ${clozeCount > 0 ? `(${clozeCount})` : ""}</span>
        </div>
        <span class="card-deck">${escapeHtml(note.deck)}</span>
      </div>
      <div class="card-body">
        <div class="field-group">
          <div class="field-content cloze-text" onclick="toggleAllClozes(this)">
            ${renderClozeHtml(text)}
          </div>
          <div class="cloze-hint">Click on [...] to reveal • Click anywhere to toggle all</div>
        </div>
        ${
					extra
						? `
          <div class="divider"></div>
          <div class="field-group">
            <div class="field-label">Extra</div>
            <div class="field-content">${extra}</div>
          </div>
        `
						: ""
				}
        ${extraFields}
      </div>
      ${tags ? `<div class="card-footer"><span class="tags">${escapeHtml(tags)}</span></div>` : ""}
    </div>
  `;
}

/**
 * Generate card metadata for JavaScript
 */
function generateCardMetadata(notes: PreviewNote[]): string {
	return JSON.stringify(
		notes.map((note, index) => ({
			index,
			id: note.id ?? index,
			preview: extractCardPreview(note),
		}))
	);
}

/**
 * Generate complete HTML page with all cards
 */
export function renderNotesToHtml(notes: PreviewNote[]): string {
	const cardsHtml = notes
		.map((note, index) => {
			if (note.type === "Basic") {
				return renderBasicCard(note, index, notes.length);
			}
			return renderClozeCard(note, index, notes.length);
		})
		.join("\n");

	const cardMetadata = generateCardMetadata(notes);

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anki Card Preview (${notes.length} card${notes.length !== 1 ? "s" : ""})</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --background: 0 0% 100%;
      --foreground: 240 10% 3.9%;
      --card: 0 0% 100%;
      --card-foreground: 240 10% 3.9%;
      --primary: 240 5.9% 10%;
      --primary-foreground: 0 0% 98%;
      --muted: 240 4.8% 95.9%;
      --muted-foreground: 240 3.8% 46.1%;
      --border: 240 5.9% 90%;
      --ring: 240 5.9% 10%;
      --radius: 0.5rem;
    }

    .dark-mode {
      --background: 240 10% 3.9%;
      --foreground: 0 0% 98%;
      --card: 240 10% 8%;
      --card-foreground: 0 0% 98%;
      --primary: 0 0% 98%;
      --primary-foreground: 240 5.9% 10%;
      --muted: 240 3.7% 15.9%;
      --muted-foreground: 240 5% 64.9%;
      --border: 240 3.7% 15.9%;
      --ring: 240 4.9% 83.9%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      min-height: 100vh;
      padding: 2rem;
      line-height: 1.5;
    }

    .container {
      max-width: 56rem;
      margin: 0 auto;
    }

    .header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      cursor: pointer;
      transition: all 150ms;
    }

    .btn:hover {
      background: hsl(var(--muted));
    }

    .card {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      margin-bottom: 1.5rem;
      overflow: hidden;
      transition: all 150ms;
    }

    .card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .dark-mode .card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);
    }

    .card-meta {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .card-number {
      font-size: 0.75rem;
      font-weight: 600;
      color: hsl(var(--muted-foreground));
    }

    .card-type {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      background: hsl(var(--muted));
      border-radius: calc(var(--radius) - 2px);
    }

    .card-deck {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
    }

    .card-body {
      padding: 1.5rem;
    }

    .field-group {
      margin-bottom: 1rem;
    }

    .field-group:last-child {
      margin-bottom: 0;
    }

    .field-group.extra {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid hsl(var(--border));
    }

    .field-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: hsl(var(--muted-foreground));
      margin-bottom: 0.5rem;
    }

    .field-content {
      font-size: 1rem;
      line-height: 1.6;
    }

    .divider {
      height: 1px;
      background: hsl(var(--border));
      margin: 1.25rem 0;
    }

    .cloze-text {
      cursor: pointer;
      user-select: none;
    }

    .cloze {
      display: inline;
      cursor: pointer;
      transition: all 150ms;
    }

    .cloze-hidden {
      color: hsl(217 91% 60%);
      font-weight: 600;
      background: hsl(217 91% 60% / 0.1);
      padding: 0.125rem 0.5rem;
      border-radius: calc(var(--radius) - 2px);
    }

    .cloze-revealed {
      color: hsl(142 76% 36%);
      font-weight: 600;
      background: hsl(142 76% 36% / 0.1);
      padding: 0.125rem 0.5rem;
      border-radius: calc(var(--radius) - 2px);
    }

    .dark-mode .cloze-hidden {
      color: hsl(217 91% 70%);
    }

    .dark-mode .cloze-revealed {
      color: hsl(142 76% 56%);
    }

    .cloze:hover .cloze-hidden {
      background: hsl(217 91% 60% / 0.2);
    }

    .cloze-hint {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      margin-top: 0.5rem;
      font-style: italic;
    }

    .card-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);
    }

    .tags {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
      }

      .header h1 {
        font-size: 1.5rem;
      }

      .card-body {
        padding: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anki Card Preview</h1>
      <div class="subtitle">${notes.length} card${notes.length !== 1 ? "s" : ""} ready for review</div>
    </div>

    <div class="controls">
      <button class="btn" onclick="toggleDarkMode()">Toggle Dark Mode</button>
      <button class="btn" onclick="revealAllClozes()">Reveal All Clozes</button>
      <button class="btn" onclick="hideAllClozes()">Hide All Clozes</button>
    </div>

    <div id="cards">
      ${cardsHtml}
    </div>
  </div>

  <script>
    // Card metadata from server
    const cardMetadata = ${cardMetadata};

    // Dark mode toggle
    function toggleDarkMode() {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    }

    // Load dark mode preference
    if (localStorage.getItem('darkMode') === 'true') {
      document.body.classList.add('dark-mode');
    }

    // Toggle single cloze
    function toggleCloze(event) {
      event.stopPropagation();
      const cloze = event.currentTarget;
      const hidden = cloze.querySelector('.cloze-hidden');
      const revealed = cloze.querySelector('.cloze-revealed');

      if (hidden.style.display !== 'none') {
        hidden.style.display = 'none';
        revealed.style.display = 'inline';
      } else {
        hidden.style.display = 'inline';
        revealed.style.display = 'none';
      }
    }

    // Add click handlers to clozes
    document.querySelectorAll('.cloze').forEach(cloze => {
      cloze.addEventListener('click', toggleCloze);
    });

    // Toggle all clozes in a card
    function toggleAllClozes(element) {
      const clozes = element.querySelectorAll('.cloze');
      const firstHidden = element.querySelector('.cloze-hidden[style="display: inline;"], .cloze-hidden:not([style])');

      clozes.forEach(cloze => {
        const hidden = cloze.querySelector('.cloze-hidden');
        const revealed = cloze.querySelector('.cloze-revealed');

        if (firstHidden) {
          hidden.style.display = 'none';
          revealed.style.display = 'inline';
        } else {
          hidden.style.display = 'inline';
          revealed.style.display = 'none';
        }
      });
    }

    // Reveal all clozes on page
    function revealAllClozes() {
      document.querySelectorAll('.cloze').forEach(cloze => {
        cloze.querySelector('.cloze-hidden').style.display = 'none';
        cloze.querySelector('.cloze-revealed').style.display = 'inline';
      });
    }

    // Hide all clozes on page
    function hideAllClozes() {
      document.querySelectorAll('.cloze').forEach(cloze => {
        cloze.querySelector('.cloze-hidden').style.display = 'inline';
        cloze.querySelector('.cloze-revealed').style.display = 'none';
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        revealAllClozes();
      } else if (e.key === 'h' || e.key === 'H') {
        hideAllClozes();
      } else if (e.key === 'd' || e.key === 'D') {
        toggleDarkMode();
      }
    });

    console.log('Anki Card Preview loaded');
    console.log('Keyboard shortcuts: Space = Reveal all, H = Hide all, D = Dark mode');
  </script>
</body>
</html>`;
}
