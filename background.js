chrome.commands.onCommand.addListener(async (command, ...all) => {
    try {
        await router_function(command, null);
    } catch (error) {
        console.log(error);
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === "keybind") {
        await router_function(null, message.payload);
    }
});

async function router_function(command, data) {
    try {
        if (data) {
            console.log("Received data:", data);
            try {
                console.log("Received:", data);
                let links = data.links;
                let new_window = await chrome.windows.create();
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
                            let new_window = await chrome.windows.create()
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

