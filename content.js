(async function start_key_listener() {
    try {
        // keep a reference on window so we can remove it reliably
        let handler = window.__ext_key_handler || null;
        if (handler) document.removeEventListener("keydown", handler);

        show_popup("Key listener activated!");

        handler = async (e) => {
            console.log("start listening key");

            let keys = [];

            if (e.ctrlKey) keys.push("ctrl");
            if (e.altKey) keys.push("alt");
            if (e.shiftKey) keys.push("shift");

            let key = e.key.toLowerCase();

            if (["control", "shift", "alt"].includes(key)) return;

            keys.push(key);

            let pressed = keys.join("+");
            console.log("Pressed:", pressed);

            const stored = await chrome.storage.local.get("data");
            const data = stored.data || [];

            for (let item of data) {
                if (item.keybind === pressed) {
                    console.log(`Executing: ${item.title}`);

                    chrome.runtime.sendMessage({
                        type: "keybind",
                        payload: item,
                    });
                    document.removeEventListener("keydown", handler);
                    // clear stored reference
                    if (window.__ext_key_handler === handler) window.__ext_key_handler = null;
                    console.log("Listener removed");

                    break;
                }
            }
        };

        // store the handler so future invocations can remove it
        window.__ext_key_handler = handler;
        document.addEventListener("keydown", handler);

    } catch (error) {
        console.log(error);
    }
})();

function show_popup(content = "Activated!") {
    // Prevent duplicate popup
    let existing = document.getElementById("ext-popup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "ext-popup";

    popup.innerHTML = `
        <div class="popup-box">
            <p>${content}</p>
        </div>
    `;

    // Styles (inline for extension safety)
    Object.assign(popup.style, {
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: "999999",
    });

    const box = popup.querySelector(".popup-box");

    Object.assign(box.style, {
        background: "#ff1e00",
        color: "#e2e8f0",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid #334155",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        fontSize: "14px",
        maxWidth: "250px",
        animation: "fadeIn 0.2s ease",
    });

    document.body.appendChild(popup);

    // Auto remove after 2.5s
    setTimeout(() => {
        popup.remove();
    }, 2500);
}