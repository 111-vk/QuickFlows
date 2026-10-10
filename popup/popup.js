// render UI for the popup
(async function render_ui() {
    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function highlightSearchTerm(value, searchTerm) {
        const text = String(value ?? "");
        if (!searchTerm) return escapeHtml(text);

        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matcher = new RegExp(escapedSearchTerm, "gi");
        let highlightedText = "";
        let lastIndex = 0;

        for (const match of text.matchAll(matcher)) {
            highlightedText += escapeHtml(text.slice(lastIndex, match.index));
            highlightedText += `<mark class="search-match">${escapeHtml(match[0])}</mark>`;
            lastIndex = match.index + match[0].length;
        }

        return highlightedText + escapeHtml(text.slice(lastIndex));
    }

    const body = document.body || document.querySelector('body');
    if (!body) return;

    const style = document.createElement('style');
    style.textContent = `
::-webkit-scrollbar { display: none; }
* { scrollbar-width: none; -ms-overflow-style: none; }
`;
    document.head.appendChild(style);

    const uiStyles = document.createElement('style');
    uiStyles.textContent = `
    .card-header { padding-right: 0px; display: flex; justify-content: space-between; align-items: center; }
    .card-header h1 { margin: 0; flex: 1; }
    .card-header-right { display: flex; align-items: center; gap: 8px; }
    .default-badge { background: #4a9eff; color: #000; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    html, body { height: 100%; margin: 0; padding: 0; }
    body { font-family: Inter, 'Segoe UI', Arial, sans-serif; background: #000; color: #fff; }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        color: #ffffff;
        text-align: center;
        gap: 8px;
        box-sizing: border-box;
        padding: 24px;
    }
    .empty-state h2 { margin: 0; font-size: 18px; }
    .empty-state p { margin: 0; opacity: 0.85; font-size: 13px; }
    .link-card { background: #0f0f0f; color: #fff; padding: 12px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #262626; }
    .card-links a { cursor: pointer; }
    `;
    document.head.appendChild(uiStyles);

    const root = document.createElement('div');

    Object.assign(root.style, {
        margin: '0',
        padding: '8px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        width: '500px',
        maxHeight: '520px',
        boxSizing: 'border-box',
        marginTop: '55px',
    });

    const stored = await chrome.storage.local.get("data");
    const data = stored.data || [];

    // Sort data so default workflows appear first
    data.sort((a, b) => {
        if (a.default && !b.default) return -1;
        if (!a.default && b.default) return 1;
        return 0;
    });

    const searchInput = document.createElement("input");
    searchInput.type = "search";
    searchInput.className = "workflow-search";
    searchInput.placeholder = "Search workflows...";
    searchInput.setAttribute("aria-label", "Search workflows");
    const results = document.createElement("div");
    results.className = "workflow-results";
    root.append(searchInput, results);
    body.appendChild(root);
    searchInput.focus();

    function renderWorkflows() {
        results.replaceChildren();
        const searchTerm = searchInput.value.trim().toLowerCase();
        const filteredData = data.filter((item) =>
            [item.title, item.keybind, ...(item.links || [])]
                .some((value) => String(value || "").toLowerCase().includes(searchTerm))
        );

        if (data.length === 0 || filteredData.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.classList.add("empty-state");
            const heading = document.createElement("h2");
            const message = document.createElement("p");
            if (data.length === 0) {
                heading.textContent = "No workflows found";
                message.textContent = "Click the settings button to create a workflow";
            } else {
                heading.textContent = "No matches found";
                message.textContent = "Try a different title, shortcut, or link.";
            }
            emptyState.append(heading, message);
            results.appendChild(emptyState);
            return;
        }

        filteredData.forEach((value) => {
            const link_card = document.createElement("div");
            link_card.classList.add("link-card");
            const linksList = value.links || [];
            const defaultBadge = value.default ? '<span class="default-badge">Default</span>' : '';
            link_card.innerHTML = `
                <div class="card-header">
                    <h1>${highlightSearchTerm(value.title, searchTerm)}</h1>
                    <div class="card-header-right">
                        ${defaultBadge}
                        <span class="keybind">${highlightSearchTerm(value.keybind, searchTerm)}</span>
                    </div>
                </div>

                <div class="card-links">
                <h3>Links to open:</h3>
                    ${linksList.map((link) => `<a class="ext-link" data-url="${escapeHtml(link)}" href="#">${highlightSearchTerm(link, searchTerm)}</a>`).join("")}
                </div>
            `;
            results.appendChild(link_card);
        });
    }

    searchInput.addEventListener("input", renderWorkflows);
    renderWorkflows();

    // Add click listeners to links to open in a new tab
    results.addEventListener("click", (e) => {
        const target = e.target;
        if (target && target.classList.contains("ext-link")) {
            e.preventDefault();
            const url = target.getAttribute("data-url");
            if (url) {
                chrome.tabs.create({ url });
            }
        }
    });
})();

async function open_dashboard() {
    let url = chrome.runtime.getURL("app/dashboard.html");
    chrome.tabs.create({ url });
}

const settingsBtn = document.getElementById("settings-btn");
if (settingsBtn) {
    settingsBtn.addEventListener("click", open_dashboard);
}
