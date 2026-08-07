let shortcutsListenersAdded = false;

export async function router_function(command, data) {
    try {
        if (data) {
            console.log("Received data payload:", data);
            const links = data.links || [];
            const delayMs = parseInt(data.delay) || 0;

            if (data.new_window === false) {
                console.log("Opening in current window");
                if (links.length > 0) {
                    try {
                        await chrome.tabs.update({ url: links[0] });
                    } catch (e) {
                        await chrome.tabs.create({ url: links[0] });
                    }
                    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

                    for (let i = 1; i < links.length; i++) {
                        await chrome.tabs.create({ url: links[i] });
                        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
                    }
                }
                return;
            } else {
                console.log("Opening in new window");
                let new_window;
                try {
                    new_window = await chrome.windows.create({ incognito: data.private || false });
                } catch (e) {
                    console.warn("Failed to create incognito window, falling back to standard window:", e);
                    new_window = await chrome.windows.create({ incognito: false });
                }
                let new_window_tabs = await chrome.tabs.query({ windowId: new_window.id });

                if (links.length > 0) {
                    try {
                        if (new_window_tabs.length > 0) {
                            await chrome.tabs.update(new_window_tabs[0].id, { url: links[0] });
                        } else {
                            await chrome.tabs.create({ url: links[0], windowId: new_window.id });
                        }
                    } catch (e) {
                        await chrome.tabs.create({ url: links[0], windowId: new_window.id });
                    }
                    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

                    for (let i = 1; i < links.length; i++) {
                        await chrome.tabs.create({ url: links[i], windowId: new_window.id });
                        if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
                    }
                }
                return;
            }
        } else if (command) {
            console.log("Command triggered:", command);
            const commandName = String(command).trim();

            if (commandName === "activate") {
                let current_tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (current_tabs && current_tabs[0]) {
                    chrome.scripting.executeScript({
                        target: { tabId: current_tabs[0].id },
                        files: ["content.js"],
                    });
                }
                return;
            }

            const all_default_commands = await chrome.commands.getAll();
            const target = all_default_commands.find((cmd) => String(cmd.name).trim() === commandName);

            const stored = await chrome.storage.local.get("data");
            const workflows = stored.data || [];
            const default_data = workflows.filter((item) => item.default === true);

            for (const item of default_data) {
                const matchByCommand = item.default_command && item.default_command === commandName;
                const matchByShortcut = target?.shortcut && item.keybind?.toLowerCase() === target.shortcut.toLowerCase();

                if (matchByCommand || matchByShortcut) {
                    console.log("Found matching default workflow:", item.title);
                    const linksArr = item.links || [];
                    const delayMs = parseInt(item.delay) || 0;

                    if (item.new_window === false) {
                        if (linksArr.length > 0) {
                            try {
                                await chrome.tabs.update({ url: linksArr[0] });
                            } catch (e) {
                                await chrome.tabs.create({ url: linksArr[0] });
                            }
                            if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

                            for (let i = 1; i < linksArr.length; i++) {
                                await chrome.tabs.create({ url: linksArr[i] });
                                if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
                            }
                        }
                    } else {
                        let new_window;
                        try {
                            new_window = await chrome.windows.create({ incognito: item.private || false });
                        } catch (e) {
                            console.warn("Failed to create incognito window, falling back to standard window:", e);
                            new_window = await chrome.windows.create({ incognito: false });
                        }
                        let new_window_tabs = await chrome.tabs.query({ windowId: new_window.id });

                        if (linksArr.length > 0) {
                            try {
                                if (new_window_tabs.length > 0) {
                                    await chrome.tabs.update(new_window_tabs[0].id, { url: linksArr[0] });
                                } else {
                                    await chrome.tabs.create({ url: linksArr[0], windowId: new_window.id });
                                }
                            } catch (e) {
                                await chrome.tabs.create({ url: linksArr[0], windowId: new_window.id });
                            }
                            if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

                            for (let i = 1; i < linksArr.length; i++) {
                                await chrome.tabs.create({ url: linksArr[i], windowId: new_window.id });
                                if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("router_function error:", error);
    }
}



export async function checkShortcuts() {
    try {
        console.log("checking shortcuts updated");
        const stored = await chrome.storage.local.get("data");
        const workflows = stored.data || [];
        const current_shortcuts = await chrome.commands.getAll();
        console.log("current_shortcuts", current_shortcuts);

        const commandShortcutMap = current_shortcuts.reduce((map, cmd) => {
            if (cmd.name && cmd.shortcut) {
                map[cmd.name] = cmd.shortcut.toLowerCase();
            }
            return map;
        }, {});

        let changed = false;
        const updatedWorkflows = workflows.map((item) => {
            if (item.default && item.default_command) {
                const currentShortcut = commandShortcutMap[item.default_command];
                if (currentShortcut && currentShortcut !== item.keybind.toLowerCase()) {
                    console.log(`Syncing default workflow '${item.title}' keybind from '${item.keybind}' to '${currentShortcut}'`);
                    changed = true;
                    return { ...item, keybind: currentShortcut };
                }
            }
            return item;
        });

        if (changed) {
            await chrome.storage.local.set({ data: updatedWorkflows });
            console.log("Updated default workflow keybinds in local storage.");
        }
    } catch (error) {
        console.log(error);
    }
}


export function notify_for_oninstall() {
    try {
        const notifId = 'set-shortcuts-' + Date.now();
        const options = {
            type: 'basic',
            title: 'Set extension shortcuts',
            message: 'Please set trigger shortcuts for the extension to work. Click to open shortcuts page.',
            // hardcoded icon for now
            iconUrl: "assets/icons/icon512.png",
            buttons: [{ title: 'Open Shortcuts' }]
        };

        if (chrome && chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create(notifId, options, () => { });

            if (!shortcutsListenersAdded) {
                shortcutsListenersAdded = true;

                chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
                    if (buttonIndex === 0) {
                        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
                        chrome.notifications.clear(id);
                    }
                });

                chrome.notifications.onClicked.addListener((id) => {
                    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
                    chrome.notifications.clear(id);
                });
            }
        } else {
            console.log('Notifications API not available. Please visit chrome://extensions/shortcuts to set shortcuts.');
        }
    } catch (error) {
        console.error('test_for_oninstall error:', error);
    }
}

