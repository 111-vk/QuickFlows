import { router_function, notify_for_oninstall, test } from "./utils.js";

chrome.commands.onCommand.addListener(async (command, ...all) => {
    try {
        await router_function(command, null);
    } catch (error) {
        console.log(error);
    }
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
        if (message.type === "keybind") {
            await router_function(null, message.payload);
        }
    } catch (error) {
        console.log(error);
    }
});

chrome.runtime.onInstalled.addListener(() => {
    try {
        notify_for_oninstall();
    } catch (error) {
        console.log(error);
    }
});
