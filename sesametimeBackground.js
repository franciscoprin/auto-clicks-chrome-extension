const sesametimeAlarm = "SesameTimeAlarm";
const sesametimeURL = "https://app.sesametime.com/employee/portal";
const frequency = 3 * 60 // 3 hours

async function startSesameTime() {
    // // check if the sesametimeAlarm is running and return if it is running
    // const alarms = await chrome.alarms.getAll();
    // const sesametimeAlarm = await alarms.find(alarm => alarm.name === sesametimeAlarm);
    // if (sesametimeAlarm) return;

    // close any sesametime alarms that might be running
    await chrome.alarms.clear(sesametimeAlarm);

    // create an chorme alarm to run every 5 minutes, 
    // it should be enough to keep the session alive  each time that the alarm is triggered, 
    // the callback function will be called and it will open a new tab with the sesametime portal
    await chrome.alarms.create(sesametimeAlarm, { periodInMinutes: frequency });
}

chrome.runtime.onInstalled.addListener(async () => await startSesameTime());
chrome.runtime.onStartup.addListener(async () => await startSesameTime());

chrome.alarms.onAlarm.addListener(async ({ reason }) => {
    // ignore on weekend base on the current time zone where the extension is running
    const date = new Date();
    const day = date.getDay();
    if (day === 0 || day === 6) return;

    // ignore on the hour of 00:00 to 06:00
    const hour = date.getHours();
    if (hour < 6) return;

    await chrome.tabs.create({ url: sesametimeURL });
});