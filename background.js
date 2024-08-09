chrome.action.onClicked.addListener(tab => {
    const { origin } = new URL(tab.url);
    chrome.permissions.contains({
        origins: [origin + "/*"],
    }, (hasPermission) => {
        if (hasPermission) {
            chrome.permissions.remove({
                origins: [origin + "/*"]
            }, () => chrome.tabs.reload(tab.id));
        } else {
            chrome.permissions.request({
                origins: [origin + "/*"]
            }, () => chrome.tabs.reload(tab.id));
        }
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    injectScriptIfNecessary(tab);
});

/**
 * @param {chrome.tabs.Tab} tab 
 */
function injectScriptIfNecessary(tab) {
    if (tab.status !== "loading" || !tab.url) {
        return;
    }

    try {
        const { origin, protocol } = new URL(tab.url);
        if (protocol !== "https:" && protocol !== "http:") {
            return;
        }
        chrome.permissions.contains({
            origins: [origin + "/*"]
        }, (hasPermission) => {
            if (hasPermission) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id, allFrames: true },
                    files: ["installDisableAutogain.js"],
                });
            }
            chrome.action.setTitle({
                title: hasPermission
                    ? "Disable Automatic Gain Control"
                    : "Enable Automatic Gain Control",
                tabId: tab.id,
            });
            chrome.action.setBadgeText({
                text: hasPermission ? "On" : "",
                tabId: tab.id,
            });
        });
    } catch (e) {
        console.error("Failed to inject script", e);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (typeof message === "object" && message["type"] === "enable-meet-hangouts") {
        chrome.permissions.request({
            origins: [
                "https://meet.google.com/*",
                "https://hangouts.google.com/*"
            ]
        }, (granted) => {
            sendResponse(granted);
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    // 必ずIDを指定してコンテキストメニューを作成
    chrome.contextMenus.create({
        id: "sampleContextMenu",  // IDを追加
        title: "Usage",
        contexts: ["action"]
    }, function() {
        if (chrome.runtime.lastError) {
            console.error("Failed to create context menu:", chrome.runtime.lastError.message);
        } else {
            console.log("Context menu created successfully.");
        }
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "sampleContextMenu") {
        showUsage();
    }
});

function showUsage() {
    chrome.tabs.create({
        url: chrome.runtime.getURL("usage.html")
    });
}