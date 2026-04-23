// render opup UI for the popup
async function render_ui() {
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

    const root = document.createElement('div');
    Object.assign(body.style, {
        margin: '0',
        padding: '0',
        overflow: 'hidden',
        backgroundColor: 'black',
        // scrollbar: 'none'
        // overflow: 'hidden'
    });

    Object.assign(root.style, {
        margin: '0',
        padding: '8px',
        overflow: 'auto',
        // backgroundColor: 'red',
        display: 'flex',
        flexDirection: 'column',
        width: '620px',
        height: '720px',
        boxSizing: 'border-box',

    });

    // NOTE/TODO: make this dynamic in the future
    const stored = await chrome.storage.local.get();
    const data = stored.data || [];

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



}
render_ui()
