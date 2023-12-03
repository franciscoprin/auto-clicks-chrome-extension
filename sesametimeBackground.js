// Global varaibles
const sesametimeAlarmName = 'SesameTimeAlarm';
const baseSesametimeURL = 'https://app.sesametime.com';
const sesametimePortalURL = `${baseSesametimeURL}/employee/portal`;
const sesametimeAlarmFrequency = 2 * 60 // 2 hours
const sesametimeAlarmStartAt = 6; // hours - military time
let clockInButtonClickedAt = null;

async function handleSesameTimeAlarm() {
    // Get now time
    const now = new Date();

    // Ignore if the clock-in button was clicked today
    if ( clockInButtonClickedAt != null && now.getDate() == clockInButtonClickedAt.getDate()) return;

    // ignore on weekend base on the current time zone where the extension is running
    const day = now.getDay();
    if (day === 0 || day === 6) return;

    // ignore on the hour of 00:00 to 06:00 - military time
    const hour = now.getHours();
    if (hour < sesametimeAlarmStartAt) return;

    // open a new tab with the sesametime portal
    await chrome.tabs.create({ url: sesametimePortalURL });
}

// close any sesametime alarms that might be running
chrome.alarms.clear(sesametimeAlarmName);

// create an chorme alarm to run every 5 minutes, 
// it should be enough to keep the session alive  each time that the alarm is triggered, 
// the callback function will be called and it will open a new tab with the sesametime portal
chrome.alarms.create(sesametimeAlarmName, { periodInMinutes: sesametimeAlarmFrequency });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // check if the sender.tab.url starts with the baseSesametimeURL
    const senderURL = sender.tab.url;
    if (senderURL.startsWith(baseSesametimeURL)) {
        // The background service answer back according to the message type
        if (message.type === 'buttonWasClicked') {
            // Store current date time in the session storage:
            clockInButtonClickedAt =  new Date();

            // Send a response to the content script
            sendResponse(clockInButtonClickedAt.toString());
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