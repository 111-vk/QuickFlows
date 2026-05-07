const links = document.getElementById("links")
const title = document.getElementById("title")
const keybind = document.getElementById("keybind")
const delay = document.getElementById("delay-input")
const private_checkbox = document.getElementById("incognito")
let is_default = null

async function add_data_to_local_storage() {
    try {
        let data = {
            title: title.value,
            keybind: keybind.value,
            links: links.value,
            delay: delay.value
        }
        // TODO: save the data in the local storage DONE
        let validation_result = await validate_data(data)
        if (validation_result.valid) {
            const stored = await chrome.storage.local.get();
            let stored_keys = Object.keys(stored)
            if (stored_keys.includes("data")) {
                // console.log(" \"key\" is found");
                let response = await chrome.storage.local.get("data")
                let UID = Math.random().toString(36).substr(2, 9);
                data = response.data
                let data_to_be_saved = {
                    UID: UID,
                    title: validation_result.data.title,
                    keybind: validation_result.data.keybind,
                    links: validation_result.data.links,
                    default: is_default,
                    delay: validation_result.data.delay,
                    private: private_checkbox.checked

                }
                data.push(data_to_be_saved)
                await chrome.storage.local.set({ data: data });
                console.log("done!", data_to_be_saved);

                location.reload();
            } else {
                console.log("data key is not found. cteating it");
                await chrome.storage.local.set({ data: [] });
                //TODO: make this dynamic PENDING
            }
        } else {
            alert(validation_result.errors.join('\n'));
            console.log(validation_result.errors)
        }

    } catch (error) {
        console.log(error);
    }

}
async function validate_data(data) {
    let errors = [];

    // Trim values
    let title = data.title?.trim();
    let keybind = data.keybind?.trim();
    let links = data.links?.trim();

    // 1. Empty checks
    if (!title) errors.push("Title is required");
    if (!keybind) errors.push("Keybind is required");
    if (!links) errors.push("Links are required");

    // 2. Keybind validation (basic: ctrl+a, alt+shift+x etc.)
    const keybindRegex = /^(ctrl|alt|shift)(\+(ctrl|alt|shift))*\+[a-z0-9]$/i;
    if (keybind && !keybindRegex.test(keybind)) {
        errors.push("Invalid keybind format (e.g. ctrl+a, ctrl+shift+x)");
    }

    // 3. Links validation
    let linksArray = links.split("\n").map(l => l.trim()).filter(Boolean);

    let invalidLinks = [];
    linksArray.forEach(link => {
        try {
            new URL(link);
        } catch {
            invalidLinks.push(link);
        }
    });


    // validate delay
    if (data.delay) {
        let delayValue = parseInt(data.delay);
        if (isNaN(delayValue) || delayValue < 0) {
            errors.push("Delay must be a non-negative number");
        }
    }
    // check if the selected default keybind is already used and alert the user
    const stored = await chrome.storage.local.get();
    const existingData = stored.data || [];
    const isUsed = existingData.some(item => item.keybind === keybind);
    if (isUsed) {
        errors.push(`${keybind} is already used. Please choose a different keybind.`);
    }


    if (invalidLinks.length > 0) {
        errors.push("Invalid links: " + invalidLinks.join(", "));
    }

    // 4. Final result
    if (errors.length > 0) {
        console.error(errors);
        return {
            valid: false,
            errors
        };
    }

    return {
        valid: true,
        data: {
            title,
            keybind,
            links: linksArray,
            delay: data.delay ? parseInt(data.delay) : 0

        }
    };
}
async function render_ui() {
    const right = document.getElementById("right");

    // Clear previous UI
    right.innerHTML = "<h2>Data</h2>";

    const stored = await chrome.storage.local.get();
    const data = stored.data || [];

    if (data.length === 0) {
        right.innerHTML += `<p style="opacity:0.6;">No data found</p>`;
        return;
    }

    data.forEach((item) => {
        // If you're storing plain objects (recommended)
        const value = item


        const link_card = document.createElement("div");
        link_card.classList.add("link-card");

        link_card.innerHTML = `
            <button class="delete-button" data-uid="${value.UID}">X</button>
            <div class="card-header">
                <h1>${value.default ? "✴️" : ""}${value.title}</h1>
                <span class="keybind">${value.keybind}</span>
            </div>

            <div class="card-links">
            <h3>Links to open:</h3>
                ${value.links.map((link) => `<a href="${link}" target="_blank">${link}</a>`).join("")}
            </div>

        `;
        right.appendChild(link_card);

        const btn = link_card.querySelector('.delete-button');
        if (btn) {
            btn.addEventListener('click', () => delete_keybind(value.UID));
        }
    });
}

async function check_default() {
    if (default_workflows.value !== "no_value") {
        keybind.value = default_workflows.value
        keybind.readOnly = true
        is_default = true
    } else {
        keybind.readOnly = false
        keybind.value = ""
        is_default = false
    }
}

async function delete_keybind(uid) {
    try {
        const stored = await chrome.storage.local.get();
        let data = stored.data || [];
        data = data.filter(item => item.UID !== uid);
        if (confirm("Are you sure you want to delete this keybind?")) {
            await chrome.storage.local.set({ data: data });
            console.log("Deleted keybind with UID:", uid);
            location.reload();
        }
    } catch (error) {
        console.log(error);
    }

}

document.addEventListener("DOMContentLoaded", () => {
    render_ui();
    const add_button = document.getElementById("add-button");
    const default_workflows = document.getElementById("default_workflows");
    if (add_button) add_button.addEventListener("click", add_data_to_local_storage);
    if (default_workflows) default_workflows.addEventListener("change", check_default);
});
