let shortcutsListenersAdded = false;

export async function router_function(command, data) {
    try {
        if (data) {
            console.log("Received data:", data);
            try {
                console.log("Received:", data);
                if (data.new_window === false) {
                    console.log("open in current window");

                    // Open links in the current window
                    const links = data.links || [];
                    if (links.length > 0) {
                        // Open the first link in the current tab
                        await chrome.tabs.update({ url: links[0] });
                        await new Promise((resolve) => setTimeout(resolve, data.delay || 0));
                        for (let i = 1; i < links.length; i++) {
                            await chrome.tabs.create({ url: links[i] });
                            await new Promise((resolve) => setTimeout(resolve, data.delay || 0));
                        }
                    }
                    return;
                } else {
                    console.log("open in new window");
                    let links = data.links || [];
                    let new_window = await chrome.windows.create({ incognito: data.private || false });
                    let new_window_tabs = await chrome.tabs.query({ windowId: new_window.id });
                    if (links.length > 0) {
                        // reuse the first tab in the new window for the first link
                        try {
                            await chrome.tabs.update(new_window_tabs[0].id, { url: links[0] });
                        } catch (e) {
                            // fallback to creating a new tab if update fails
                            await chrome.tabs.create({ url: links[0], windowId: new_window.id });
                        }
                        await new Promise((resolve) => setTimeout(resolve, data.delay || 0));
                        for (let i = 1; i < links.length; i++) {
                            await chrome.tabs.create({ url: links[i], windowId: new_window.id });
                            await new Promise((resolve) => setTimeout(resolve, data.delay || 0));
                        }
                    }
                    return
                }

            } catch (error) {
                console.log(error);
            }

        } else if (command) {
            console.log("command used:", command);
            // normalize the incoming command string
            const commandName = String(command).trim();
            let target;
            let all_default_commands = await chrome.commands.getAll()
            console.log(all_default_commands);


            let all_default_commands_name = []
            all_default_commands.forEach((cmd) => {
                all_default_commands_name.push(String(cmd.name).trim())
            })
            console.log('available command names:', all_default_commands_name);
            if (command === "activate") {
                let current_tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                chrome.scripting.executeScript({
                    target: { tabId: current_tabs[0].id },
                    files: ["content.js"],
                });
            } else {
                if (all_default_commands_name.includes(commandName)) {
                    console.log("this default command");
                    // get all the data with the default true
                    const stored = await chrome.storage.local.get("data");
                    console.log("all the stord data", stored);
                    const data = stored.data || [];
                    console.log("data", data);
                    let default_data = data.filter((item) => {
                        return item.default === true
                    })
                    console.log("all the default data:", default_data);
                    // find the matching command object (compare trimmed names)
                    target = all_default_commands.find((cmd) => {
                        return String(cmd.name).trim() === commandName
                    })
                    console.log(target);

                    if (!target) {
                        console.log('no target found — dumping candidates:');
                        all_default_commands.forEach((c) => console.log('-', JSON.stringify(c)));
                    }
                    //match the data    
                    for (const item of default_data) {
                        if (item.keybind.toLowerCase() === target.shortcut.toLowerCase()) {
                            if (item.new_window === false) {
                                console.log("open in current window");
                                const linksArr = item.links || [];
                                if (linksArr.length > 0) {
                                    try {
                                        await chrome.tabs.update({ url: linksArr[0] });
                                    } catch (e) {
                                        await chrome.tabs.create({ url: linksArr[0] });
                                    }
                                    for (let i = 1; i < linksArr.length; i++) {
                                        await chrome.tabs.create({ url: linksArr[i] });
                                    }
                                }
                            } else {
                                let new_window = await chrome.windows.create({ incognito: item.private || false });
                                let new_window_tabs2 = await chrome.tabs.query({ windowId: new_window.id });
                                const linksArr = item.links || [];
                                if (linksArr.length > 0) {
                                    try {
                                        await chrome.tabs.update(new_window_tabs2[0].id, { url: linksArr[0] });
                                    } catch (e) {
                                        await chrome.tabs.create({ url: linksArr[0], windowId: new_window.id });
                                    }
                                    for (let i = 1; i < linksArr.length; i++) {
                                        await chrome.tabs.create({ url: linksArr[i], windowId: new_window.id });
                                    }
                                }
                            }
                        }
                    }
                } else {
                    console.log('this is not default command');
                }
            }
        } else {
            // just for debugging error handling, in case the function is called without command or data
            console.log("no command or data received");
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

