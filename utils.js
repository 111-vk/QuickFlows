let shortcutsListenersAdded = false;

export async function router_function(command, data) {
    try {
        if (data) {
            console.log("Received data:", data);
            try {
                console.log("Received:", data);
                let links = data.links;
                let new_window = await chrome.windows.create({ incognito: data.private || false });
                for (let link of links) {
                    await chrome.tabs.create({ url: link, windowId: new_window.id });
                    await new Promise((resolve) => setTimeout(resolve, data.delay || 0));
                }
                return
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
                    default_data.forEach(async (item) => {
                        if (item.keybind.toLowerCase() === target.shortcut.toLowerCase()) {
                            let new_window = await chrome.windows.create({ incognito: item.private || false });
                            item.links.forEach(async (link) => {

                                await chrome.tabs.create({ url: link, windowId: new_window.id });

                            });
                        }
                    })
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
            message: 'Please set default keybinds on the Extensions → Keyboard shortcuts page for this extension.',
            // hardcoded icon for now
            iconUrl: "assets/image.png",
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

