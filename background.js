import { router_function, checkShortcuts, notify_for_oninstall } from "./utils.js";

chrome.commands.onCommand.addListener(async (command, ...all) => {
    await checkShortcuts();
    try {
        await router_function(command, null);
    } catch (error) {
        console.log(error);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            if (message?.type === "keybind") {
                await router_function(null, message.payload);
            }
        } catch (error) {
            console.error("onMessage error:", error);
        }
    })();
});

chrome.runtime.onInstalled.addListener(() => {
    try {
        notify_for_oninstall();
    } catch (error) {
        console.log(error);
    }
});
