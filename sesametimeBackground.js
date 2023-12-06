// Global varaibles
const sesametimeAlarmName = 'SesameTimeAlarm';
const baseSesametimeURL = 'https://app.sesametime.com';
const sesametimePortalURL = `${baseSesametimeURL}/employee/portal`;
const sesametimeAlarmFrequency = 2 * 60 // 2 hours
const sesametimeAlarmStartAt = 6; // hours - military time
let clockInButtonClickedAt = null;

async function shouldIgnoreSesameTimeEvents() {
    // Get now time
    const now = new Date();

    // ignore on weekend base on the current time zone where the extension is running
    const day = now.getDay();
    if (day === 0 || day === 6) return true;

    // ignore on the hour of 00:00 to 06:00 - military time
    const hour = now.getHours();
    if (hour < sesametimeAlarmStartAt) return true;

    // Ignore if the clock-in button was clicked today
    console.log(
        `[shouldIgnoreSesameTimeEvents]`,
        `\n * now: ${now}`,
        `\n * clockInButtonClickedAt: ${clockInButtonClickedAt}`,
    );
    
    if ( clockInButtonClickedAt != null && now.getDate() == clockInButtonClickedAt.getDate()) {
        console.log(`[shouldIgnoreSesameTimeEvents] it was ignored`);
        return true;
    }

    console.log(`[shouldIgnoreSesameTimeEvents] it wasn't ignored`);
    return false;
}

async function handleSesameTimeAlarm() {
    // ignore base on conditions
    if (await shouldIgnoreSesameTimeEvents()) return;

    // open a new tab with the sesametime portal
    await chrome.tabs.create({ url: sesametimePortalURL });
}

// close any sesametime alarms that might be running
chrome.alarms.clear(sesametimeAlarmName);

// create an chorme alarm to run every 5 minutes, 
// it should be enough to keep the session alive  each time that the alarm is triggered, 
// the callback function will be called and it will open a new tab with the sesametime portal
chrome.alarms.create(
    sesametimeAlarmName, { 
        delayInMinutes: 0, // Trigger immediately upon creation
        periodInMinutes: sesametimeAlarmFrequency,
    }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // check if the sender.tab.url starts with the baseSesametimeURL
    const senderURL = sender.tab.url;
    if (senderURL.startsWith(baseSesametimeURL)) {
        // The background service answer back according to the message type
        if (message.type === 'clockInButtonWasClicked') {
            // Store current date time in the session storage:
            clockInButtonClickedAt =  new Date();

            // Send a response to the content script
            sendResponse(clockInButtonClickedAt.toString());
            console.log(
                `[onMessage.addListener][${message.type}]`,
                `\n * clockInButtonClickedAt: ${clockInButtonClickedAt}`,
            );
        }

        // NOTE: The browser should be synced with the user gmail account:
        //       otherwise the userInfo.email will return an empty string
        else if(message.type === 'getCurrentLoggedGmailEmail') {
            // Get the current logger user email from chrome.identity
            chrome.identity.getProfileUserInfo((userInfo) => {
                // Send a response to the content script
                sendResponse(userInfo.email);
                console.log(
                    `[onMessage.addListener][${message.type}]`,
                    `\n * userInfo.email: ${userInfo.email}`,
                );
            });
        }

        else if (message.type === 'closeCurrentTab') {
            // Get the current tab id
            const tabId = sender.tab.id;

            // Close the current tab
            chrome.tabs.remove(tabId);
            console.log(
                `[onMessage.addListener][${message.type}]`,
                `\n * tabId: ${tabId}`,
            );
        }
    }

    // Return true to indicate that the response should be sent asynchronously
    return true;
});

chrome.alarms.onAlarm.addListener(async ( alarm ) => {
    switch (alarm.name) {
        case sesametimeAlarmName:
            await handleSesameTimeAlarm();
            break;
    
        default:
            console.log(`No actions defined for the current alarm: ${alarm.name}`);
            break;
    }
});

// On tab update if the url starts with the baseSesametimeURL excute chrome.scripting.executeScript
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status != 'complete') return;
    if (!tab.url.startsWith('https://app.sesametime.com')) return;

    // ignore base on conditions
    if (await shouldIgnoreSesameTimeEvents()) return;

    if ( 
        // Trigger when the page status is loaded.
        changeInfo.status == 'complete' && tab.url.startsWith('https://app.sesametime.com')
    ) {
        await chrome.scripting.executeScript({
            target: {tabId: tabId, allFrames: true},
            // files: ['content_scripts/cscript.js'],
            files: ['sesametimeContent.js'],
        });
    }
});   
