/**
 * Card Renderer for Anki note previews
 * With accept/reject/comment functionality for LLM feedback
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
      <div class="card-actions">
        <button class="action-btn accept-btn" onclick="acceptCard(${index})">✓ Accept</button>
        <button class="action-btn reject-btn" onclick="rejectCard(${index})">✗ Reject</button>
        <button class="action-btn comment-btn" onclick="toggleComment(${index})">💬 Comment</button>
      </div>
      <div class="comment-section" id="comment-${index}" style="display: none;">
        <textarea
          class="comment-input"
          placeholder="Add your feedback or reason for rejection..."
          oninput="updateComment(${index}, this.value)"
        ></textarea>
      </div>
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
      <div class="card-actions">
        <button class="action-btn accept-btn" onclick="acceptCard(${index})">✓ Accept</button>
        <button class="action-btn reject-btn" onclick="rejectCard(${index})">✗ Reject</button>
        <button class="action-btn comment-btn" onclick="toggleComment(${index})">💬 Comment</button>
      </div>
      <div class="comment-section" id="comment-${index}" style="display: none;">
        <textarea
          class="comment-input"
          placeholder="Add your feedback or reason for rejection..."
          oninput="updateComment(${index}, this.value)"
        ></textarea>
      </div>
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
      --success: 142 76% 36%;
      --destructive: 0 84% 60%;
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
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      min-height: 100vh;
      padding: 2rem;
      padding-top: 6rem;
      line-height: 1.5;
    }

    /* Decision Summary Bar */
    .summary-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: hsl(var(--card));
      border-bottom: 1px solid hsl(var(--border));
      padding: 1rem;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .summary-content {
      max-width: 56rem;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .summary-stats {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .stat-total { color: hsl(var(--foreground)); }
    .stat-accepted { color: hsl(var(--success)); }
    .stat-rejected { color: hsl(var(--destructive)); }
    .stat-commented { color: hsl(217 91% 60%); }

    .export-btn {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border: none;
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      transition: opacity 150ms;
    }

    .export-btn:hover {
      opacity: 0.9;
    }

    .export-btn.success {
      background: hsl(var(--success));
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

    /* Card Styles */
    .card {
      background: hsl(var(--card));
      border: 2px solid hsl(var(--border));
      border-radius: var(--radius);
      margin-bottom: 1.5rem;
      overflow: hidden;
      transition: all 150ms;
      position: relative;
    }

    .card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .dark-mode .card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .card.accepted {
      border-color: hsl(var(--success));
      border-left-width: 4px;
    }

    .card.rejected {
      border-color: hsl(var(--destructive));
      border-left-width: 4px;
    }

    .card.commented::after {
      content: '💬';
      position: absolute;
      top: 1rem;
      right: 1rem;
      font-size: 1.25rem;
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

    /* Cloze Styles */
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

    /* Action Buttons */
    .card-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      border-top: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.2);
    }

    .action-btn {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 2px solid hsl(var(--border));
      border-radius: var(--radius);
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 150ms;
      background: hsl(var(--card));
      color: hsl(var(--foreground));
    }

    .accept-btn:hover {
      border-color: hsl(var(--success));
      color: hsl(var(--success));
    }

    .accept-btn.active {
      background: hsl(var(--success));
      border-color: hsl(var(--success));
      color: white;
    }

    .reject-btn:hover {
      border-color: hsl(var(--destructive));
      color: hsl(var(--destructive));
    }

    .reject-btn.active {
      background: hsl(var(--destructive));
      border-color: hsl(var(--destructive));
      color: white;
    }

    .comment-btn:hover {
      border-color: hsl(217 91% 60%);
      color: hsl(217 91% 60%);
    }

    .comment-btn.active {
      background: hsl(217 91% 60%);
      border-color: hsl(217 91% 60%);
      color: white;
    }

    /* Comment Section */
    .comment-section {
      padding: 1rem;
      background: hsl(var(--muted) / 0.3);
      border-top: 1px solid hsl(var(--border));
    }

    .comment-input {
      width: 100%;
      min-height: 80px;
      padding: 0.75rem;
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      font-family: inherit;
      font-size: 0.875rem;
      resize: vertical;
      background: hsl(var(--card));
      color: hsl(var(--foreground));
      transition: border-color 150ms;
    }

    .comment-input:focus {
      outline: none;
      border-color: hsl(217 91% 60%);
    }

    @media (max-width: 768px) {
      body {
        padding: 1rem;
        padding-top: 8rem;
      }

      .summary-content {
        flex-direction: column;
        align-items: stretch;
      }

      .summary-stats {
        justify-content: space-around;
      }

      .export-btn {
        width: 100%;
      }

      .header h1 {
        font-size: 1.5rem;
      }

      .card-body {
        padding: 1rem;
      }

      .card-actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <!-- Decision Summary Bar -->
  <div class="summary-bar">
    <div class="summary-content">
      <div class="summary-stats">
        <div class="stat stat-total">
          <span>Total:</span>
          <strong id="stat-total">${notes.length}</strong>
        </div>
        <div class="stat stat-accepted">
          <span>✓ Accepted:</span>
          <strong id="stat-accepted">0</strong>
        </div>
        <div class="stat stat-rejected">
          <span>✗ Rejected:</span>
          <strong id="stat-rejected">0</strong>
        </div>
        <div class="stat stat-commented">
          <span>💬 Comments:</span>
          <strong id="stat-commented">0</strong>
        </div>
      </div>
      <button class="export-btn" onclick="exportDecisions()" id="export-btn">
        📋 Copy Decisions to Clipboard
      </button>
    </div>
  </div>

  <div class="container">
    <div class="header">
      <h1>Anki Card Preview</h1>
      <div class="subtitle">${notes.length} card${notes.length !== 1 ? "s" : ""} ready for review</div>
    </div>

    <div class="controls">
      <button class="btn" onclick="toggleDarkMode()">Toggle Dark Mode</button>
      <button class="btn" onclick="revealAllClozes()">Reveal All Clozes</button>
      <button class="btn" onclick="hideAllClozes()">Hide All Clozes</button>
      <button class="btn" onclick="acceptAllCards()">✓ Accept All</button>
      <button class="btn" onclick="clearAllDecisions()">🔄 Clear All</button>
    </div>

    <div id="cards">
      ${cardsHtml}
    </div>
  </div>

  <script>
    // Card metadata from server
    const cardMetadata = ${cardMetadata};

    // Decision state
    let decisions = [];

    // Initialize decisions
    function initDecisions() {
      // Try to load from localStorage
      const saved = localStorage.getItem('anki-preview-decisions');
      if (saved) {
        try {
          decisions = JSON.parse(saved);
        } catch (e) {
          decisions = [];
        }
      }

      // Ensure we have an entry for each card
      if (decisions.length !== cardMetadata.length) {
        decisions = cardMetadata.map((card, index) => ({
          index: index,
          id: card.id,
          action: 'pending',
          comment: ''
        }));
      }

      // Restore UI state
      restoreUIState();
      updateSummary();
    }

    // Save decisions to localStorage
    function saveDecisions() {
      localStorage.setItem('anki-preview-decisions', JSON.stringify(decisions));
    }

    // Restore UI state from decisions
    function restoreUIState() {
      decisions.forEach((decision, index) => {
        const card = document.querySelector(\`.card[data-index="\${index}"]\`);
        if (!card) return;

        // Update card appearance
        card.classList.remove('accepted', 'rejected', 'commented');
        if (decision.action === 'accept') {
          card.classList.add('accepted');
          card.querySelector('.accept-btn').classList.add('active');
        } else if (decision.action === 'reject') {
          card.classList.add('rejected');
          card.querySelector('.reject-btn').classList.add('active');
        }

        // Restore comment
        if (decision.comment) {
          card.classList.add('commented');
          const commentSection = card.querySelector(\`#comment-\${index}\`);
          const commentInput = commentSection.querySelector('textarea');
          commentInput.value = decision.comment;
          commentSection.style.display = 'block';
          card.querySelector('.comment-btn').classList.add('active');
        }
      });
    }

    // Accept card
    function acceptCard(index) {
      const decision = decisions[index];
      const card = document.querySelector(\`.card[data-index="\${index}"]\`);
      const acceptBtn = card.querySelector('.accept-btn');
      const rejectBtn = card.querySelector('.reject-btn');

      if (decision.action === 'accept') {
        // Toggle off
        decision.action = 'pending';
        card.classList.remove('accepted');
        acceptBtn.classList.remove('active');
      } else {
        // Accept
        decision.action = 'accept';
        card.classList.remove('rejected');
        card.classList.add('accepted');
        acceptBtn.classList.add('active');
        rejectBtn.classList.remove('active');
      }

      saveDecisions();
      updateSummary();
    }

    // Reject card
    function rejectCard(index) {
      const decision = decisions[index];
      const card = document.querySelector(\`.card[data-index="\${index}"]\`);
      const acceptBtn = card.querySelector('.accept-btn');
      const rejectBtn = card.querySelector('.reject-btn');
      const commentSection = card.querySelector(\`#comment-\${index}\`);

      if (decision.action === 'reject') {
        // Toggle off
        decision.action = 'pending';
        card.classList.remove('rejected');
        rejectBtn.classList.remove('active');
      } else {
        // Reject
        decision.action = 'reject';
        card.classList.remove('accepted');
        card.classList.add('rejected');
        rejectBtn.classList.add('active');
        acceptBtn.classList.remove('active');

        // Auto-show comment section
        commentSection.style.display = 'block';
        card.querySelector('.comment-btn').classList.add('active');
        commentSection.querySelector('textarea').focus();
      }

      saveDecisions();
      updateSummary();
    }

    // Toggle comment section
    function toggleComment(index) {
      const card = document.querySelector(\`.card[data-index="\${index}"]\`);
      const commentSection = card.querySelector(\`#comment-\${index}\`);
      const commentBtn = card.querySelector('.comment-btn');

      if (commentSection.style.display === 'none') {
        commentSection.style.display = 'block';
        commentBtn.classList.add('active');
        commentSection.querySelector('textarea').focus();
      } else {
        commentSection.style.display = 'none';
        commentBtn.classList.remove('active');
      }
    }

    // Update comment
    function updateComment(index, value) {
      decisions[index].comment = value;
      const card = document.querySelector(\`.card[data-index="\${index}"]\`);

      if (value.trim()) {
        card.classList.add('commented');
      } else {
        card.classList.remove('commented');
      }

      saveDecisions();
      updateSummary();
    }

    // Update summary stats
    function updateSummary() {
      const accepted = decisions.filter(d => d.action === 'accept').length;
      const rejected = decisions.filter(d => d.action === 'reject').length;
      const commented = decisions.filter(d => d.comment.trim()).length;

      document.getElementById('stat-accepted').textContent = accepted;
      document.getElementById('stat-rejected').textContent = rejected;
      document.getElementById('stat-commented').textContent = commented;
    }

    // Accept all cards
    function acceptAllCards() {
      decisions.forEach((decision, index) => {
        decision.action = 'accept';
        const card = document.querySelector(\`.card[data-index="\${index}"]\`);
        card.classList.remove('rejected');
        card.classList.add('accepted');
        card.querySelector('.accept-btn').classList.add('active');
        card.querySelector('.reject-btn').classList.remove('active');
      });
      saveDecisions();
      updateSummary();
    }

    // Clear all decisions
    function clearAllDecisions() {
      if (!confirm('Clear all decisions? This cannot be undone.')) return;

      decisions.forEach((decision, index) => {
        decision.action = 'pending';
        decision.comment = '';
        const card = document.querySelector(\`.card[data-index="\${index}"]\`);
        card.classList.remove('accepted', 'rejected', 'commented');
        card.querySelector('.accept-btn').classList.remove('active');
        card.querySelector('.reject-btn').classList.remove('active');
        card.querySelector('.comment-btn').classList.remove('active');
        const commentSection = card.querySelector(\`#comment-\${index}\`);
        commentSection.style.display = 'none';
        commentSection.querySelector('textarea').value = '';
      });

      saveDecisions();
      updateSummary();
    }

    // Export decisions to clipboard
    async function exportDecisions() {
      const exportData = {
        version: 1,
        totalCards: cardMetadata.length,
        decisions: decisions.map((decision, index) => ({
          index: decision.index,
          id: decision.id,
          action: decision.action,
          comment: decision.comment,
          cardPreview: cardMetadata[index].preview
        })),
        summary: {
          accepted: decisions.filter(d => d.action === 'accept').length,
          rejected: decisions.filter(d => d.action === 'reject').length,
          pending: decisions.filter(d => d.action === 'pending').length,
          commented: decisions.filter(d => d.comment.trim()).length
        }
      };

      const jsonString = JSON.stringify(exportData, null, 2);

      try {
        await navigator.clipboard.writeText(jsonString);

        // Success feedback
        const btn = document.getElementById('export-btn');
        btn.classList.add('success');
        btn.textContent = '✓ Copied to Clipboard!';

        setTimeout(() => {
          btn.classList.remove('success');
          btn.textContent = '📋 Copy Decisions to Clipboard';
        }, 2000);
      } catch (err) {
        alert('Failed to copy to clipboard. Please check browser permissions.');
        console.error('Copy failed:', err);
      }
    }

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
      // Don't trigger when typing in textarea
      if (e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        revealAllClozes();
      } else if (e.key === 'h' || e.key === 'H') {
        hideAllClozes();
      } else if (e.key === 'd' || e.key === 'D') {
        toggleDarkMode();
      } else if (e.key === 'e' || e.key === 'E') {
        exportDecisions();
      }
    });

    // Initialize on load
    initDecisions();

    console.log('Anki Card Preview loaded');
    console.log('Keyboard shortcuts: Space = Reveal all, H = Hide all, D = Dark mode, E = Export');
  </script>
</body>
</html>`;
}
