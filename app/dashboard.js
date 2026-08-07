const links = document.getElementById("links")
const title = document.getElementById("title")
const keybind = document.getElementById("keybind")
const delay = document.getElementById("delay-input")
const private_checkbox = document.getElementById("incognito")
const new_window_checkbox = document.getElementById("new_window")
const default_workflows = document.getElementById("default_workflows")
let is_default = false;

function getDefaultCommandName(shortcut) {
    const mapping = {
        "ctrl+shift+1": "default_1",
        "ctrl+shift+2": "default_2",
        "ctrl+shift+3": "default_3"
    };
    return mapping[shortcut?.toLowerCase()] || null;
}

async function add_data_to_local_storage() {
    try {
        let rawData = {
            title: title.value,
            keybind: keybind.value,
            links: links.value,
            delay: delay.value,
            private: private_checkbox.checked,
            new_window: new_window_checkbox.checked
        };
        let validation_result = await validate_data(rawData);
        if (validation_result.valid) {
            const stored = await chrome.storage.local.get("data");
            let dataList = stored.data || [];
            let UID = Math.random().toString(36).substr(2, 9);

            let data_to_be_saved = {
                UID: UID,
                title: validation_result.data.title,
                keybind: validation_result.data.keybind,
                links: validation_result.data.links,
                default: is_default === true,
                default_command: is_default ? getDefaultCommandName(default_workflows.value) : null,
                delay: validation_result.data.delay,
                private: private_checkbox.checked,
                new_window: new_window_checkbox.checked
            };
            dataList.push(data_to_be_saved);
            await chrome.storage.local.set({ data: dataList });
            console.log("Saved workflow successfully:", data_to_be_saved);

            location.reload();
        } else {
            alert(validation_result.errors.join('\n'));
            console.log(validation_result.errors);
        }

    } catch (error) {
        console.error("add_data_to_local_storage error:", error);
    }
}

async function validate_data(data) {
    let errors = [];

    // Trim values
    let titleVal = data.title?.trim();
    let keybindVal = data.keybind?.trim().toLowerCase();
    let rawLinks = data.links?.trim();

    // 1. Empty checks
    if (!titleVal) errors.push("Title is required");
    if (!keybindVal) errors.push("Keybind is required");
    if (!rawLinks) errors.push("Links are required");

    // 2. Keybind validation (e.g. ctrl+a, ctrl+shift+x, ctrl+shift+space)
    const keybindRegex = /^((ctrl|alt|shift)\+)+(space|[a-z0-9])$/i;
    if (keybindVal && !keybindRegex.test(keybindVal)) {
        errors.push("Invalid keybind format (e.g. ctrl+a, ctrl+shift+x, ctrl+shift+space)");
    }

    // 3. Links validation and normalization
    let linksArray = rawLinks
        ? rawLinks.split("\n").map(l => l.trim()).filter(Boolean)
        : [];

    let processedLinks = [];
    let invalidLinks = [];

    linksArray.forEach(link => {
        let formattedLink = link;
        if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(formattedLink)) {
            formattedLink = "https://" + formattedLink;
        }
        try {
            new URL(formattedLink);
            processedLinks.push(formattedLink);
        } catch {
            invalidLinks.push(link);
        }
    });

    // Validate delay
    if (data.delay) {
        let delayValue = parseInt(data.delay);
        if (isNaN(delayValue) || delayValue < 0) {
            errors.push("Delay must be a non-negative number");
        }
    }

    // Check duplicate keybind
    const stored = await chrome.storage.local.get("data");
    const existingData = stored.data || [];
    const isUsed = existingData.some(item => item.keybind?.toLowerCase() === keybindVal);
    if (isUsed) {
        errors.push(`${keybindVal} is already used. Please choose a different keybind.`);
    }

    if (invalidLinks.length > 0) {
        errors.push("Invalid links: " + invalidLinks.join(", "));
    }

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
            title: titleVal,
            keybind: keybindVal,
            links: processedLinks,
            delay: data.delay ? parseInt(data.delay) : 0
        }
    };
}

async function render_ui() {
    const right = document.getElementById("right");

    // Clear previous UI
    right.innerHTML = "<h2>WORKFLOWS:</h2>";

    const stored = await chrome.storage.local.get("data");
    const data = stored.data || [];

    if (data.length === 0) {
        right.innerHTML += `<p style="opacity:0.6;">No data found</p>`;
        return;
    }

    data.forEach((item) => {
        const value = item;

        const link_card = document.createElement("div");
        link_card.classList.add("link-card");

        link_card.innerHTML = `
            <button class="delete-button" data-uid="${value.UID}">X</button>
            <div class="card-header">
                <h1>${value.default ? "✴️ " : ""}${value.title}</h1>
                <span class="keybind">${value.keybind}</span>
            </div>

            <div class="card-links">
            <h3>Links to open:</h3>
                ${(value.links || []).map((link) => `<a href="${link}" target="_blank">${link}</a>`).join("")}
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
        keybind.value = default_workflows.value;
        keybind.readOnly = true;
        is_default = true;
    } else {
        keybind.readOnly = false;
        keybind.value = "";
        is_default = false;
    }
}

async function delete_keybind(uid) {
    try {
        if (!confirm("Are you sure you want to delete this keybind?")) {
            return;
        }
        const stored = await chrome.storage.local.get("data");
        let data = stored.data || [];
        data = data.filter(item => item.UID !== uid);
        await chrome.storage.local.set({ data: data });
        console.log("Deleted keybind with UID:", uid);
        location.reload();
    } catch (error) {
        console.error("delete_keybind error:", error);
    }
}

async function sync_private_to_new_window() {
    if (private_checkbox.checked) {
        new_window_checkbox.checked = true;
        new_window_checkbox.disabled = true;
    } else {
        new_window_checkbox.disabled = false;
    }
}

function capture_keybind_input() {
    if (!keybind) return;

    keybind.addEventListener("keydown", (e) => {
        if (default_workflows && default_workflows.value !== "no_value") {
            return;
        }

        if (e.key === "Tab" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            return; // Allow standard tab key navigation
        }

        if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        const keys = [];
        if (e.ctrlKey) keys.push("ctrl");
        if (e.altKey) keys.push("alt");
        if (e.shiftKey) keys.push("shift");

        let key = e.key.toLowerCase();
        if (key === " ") key = "space";
        if (key === "escape" || key === "backspace") {
            keybind.value = "";
            return;
        }

        keys.push(key);
        keybind.value = keys.join("+");
    });
}

async function default_selecter() {
    // check how many default workflows are already saved in the local storage and disable the rest of the options
    if (!default_workflows) return;

    const stored = await chrome.storage.local.get();
    const data = stored.data || [];
    console.log("this the data from default selecter:", data);
    function getDefaultShortcutFromCommand(commandName) {
        const mapping = {
            default_1: "ctrl+shift+1",
            default_2: "ctrl+shift+2",
            default_3: "ctrl+shift+3"
        };
        return mapping[commandName] || null;
    }

    const usedDefaultCommands = new Set(
        data
            .filter(item => item.default && item.default_command)
            .map(item => item.default_command)
    );

    const usedDefaultKeybinds = new Set(
        data
            .filter(item => item.default && !item.default_command)
            .map(item => item.keybind?.toLowerCase())
            .filter(Boolean)
    );

    default_workflows.querySelectorAll("option").forEach((option) => {
        if (option.value === "no_value") {
            option.disabled = false;
            return;
        }

        const optionValue = option.value.toLowerCase();
        const commandName = getDefaultCommandName(optionValue);
        const shouldDisable =
            (commandName && usedDefaultCommands.has(commandName)) ||
            usedDefaultKeybinds.has(optionValue);

        option.disabled = shouldDisable;
    });

    const allDefaultsTaken = Array.from(default_workflows.options)
        .filter(option => option.value !== "no_value")
        .every(option => option.disabled);

    const noValueOption = default_workflows.querySelector('option[value="no_value"]');
    if (noValueOption) {
        noValueOption.text = allDefaultsTaken ? "all the workflows are used" : "select";
        // Ensure the 'select' option remains selectable so the user can open the menu
        noValueOption.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    render_ui();
    default_selecter();
    const add_button = document.getElementById("add-button");
    const default_workflows = document.getElementById("default_workflows");
    if (add_button) add_button.addEventListener("click", add_data_to_local_storage);
    if (default_workflows) default_workflows.addEventListener("change", check_default);
    if (private_checkbox) private_checkbox.addEventListener("change", sync_private_to_new_window);
    if (keybind) capture_keybind_input();

});
