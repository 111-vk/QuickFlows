// render opup UI for the popup
(async function render_ui() {
    // Build root container and apply styles
    const body = document.body || document.querySelector('body');
    if (!body) return;

    const style = document.createElement('style');
    style.textContent = `
::-webkit-scrollbar {
    display: none;
}

* {
    scrollbar-width: none;
}

* {
    -ms-overflow-style: none;
}
`;
    document.head.appendChild(style);

    // Add UI styles for popup elements (centering empty state)
    const uiStyles = document.createElement('style');
    uiStyles.textContent = `
    .card-header {
    padding-right: 0px;
    }
    html, body { height: 100%; }
    body { font-family: Inter, 'Segoe UI', Arial, sans-serif; }
    .empty-state{
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
    .empty-state h2{ margin: 0; font-size: 20px; }
    .empty-state p{ margin: 0; opacity: 0.85; }
    .link-card{ background: #0f0f0f; color: #fff; padding: 12px; border-radius: 8px; margin-bottom: 8px; }
    `;
    document.head.appendChild(uiStyles);

    const root = document.createElement('div');
    Object.assign(body.style, {
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        backgroundColor: 'black',
    });

    Object.assign(root.style, {
        margin: '0',
        padding: '8px',
        overflow: 'scroll',
        // backgroundColor: 'red',
        display: 'flex',
        flexDirection: 'column',
        width: '620px',
        height: '720px',
        boxSizing: 'border-box',
        marginTop: '55px',

    });

    // NOTE/TODO: make this dynamic in the future
    const stored = await chrome.storage.local.get();
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
        // If you're storing plain objects (recommended)
        const value = item


        const link_card = document.createElement("div");
        link_card.classList.add("link-card");

        link_card.innerHTML = `
                <div class="card-header">
                    <h1>${value.title}</h1>
                    <span class="keybind">${value.keybind}</span>
                </div>

                <div class="card-links">
                <h3>Links to open:</h3>
                    ${value.links.map((link) => `<a href="${link}" target="_blank">${link}</a>`).join("")}
                </div>
            `;
        root.appendChild(link_card)
    });



})()

async function open_dashboard() {
    console.log("testing");
    let url = "../app/dashboard.html";
    chrome.tabs.create({ url });
}

document.getElementById("settings-btn").addEventListener("click", open_dashboard);
