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
    .card-header { padding-right: 0px; }
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

        link_card.innerHTML = `
                <div class="card-header">
                    <h1>${value.title}</h1>
                    <span class="keybind">${value.keybind}</span>
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
