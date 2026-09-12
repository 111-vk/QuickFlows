// render UI for the popup
(async function render_ui() {
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
    let data = stored.data || [];

    // Sort data so default workflows appear first
    data.sort((a, b) => {
        if (a.default && !b.default) return -1;
        if (!a.default && b.default) return 1;
        return 0;
    });

    if (data.length === 0) {
        const empty_state = document.createElement("div");
        empty_state.classList.add("empty-state");

        empty_state.innerHTML = `
            <h2>No workflows found</h2>
            <p>Click the settings button to create a workflow</p>
        `;
        root.appendChild(empty_state);
    }

    body.appendChild(root);
    data.forEach((item) => {
        const value = item;

        const link_card = document.createElement("div");
        link_card.classList.add("link-card");

        const linksList = value.links || [];
        const defaultBadge = value.default ? '<span class="default-badge">Default</span>' : '';

        link_card.innerHTML = `
                <div class="card-header">
                    <h1>${value.title}</h1>
                    <div class="card-header-right">
                        ${defaultBadge}
                        <span class="keybind">${value.keybind}</span>
                    </div>
                </div>

                <div class="card-links">
                <h3>Links to open:</h3>
                    ${linksList.map((link) => `<a class="ext-link" data-url="${link}" href="#">${link}</a>`).join("")}
                </div>
            `;
        root.appendChild(link_card);
    });

    // Add click listeners to links to open in a new tab
    root.addEventListener("click", (e) => {
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
