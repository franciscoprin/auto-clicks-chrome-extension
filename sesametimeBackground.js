function sesameButtonWasClicked(textContent) {
    const spans = document.querySelectorAll('span');
    const buttons = document.querySelectorAll('button');

    for (const element of [...spans, ...buttons]) {
        if (element.textContent.trim() === textContent) {
            return true
        }
    }

    return false;
}

chrome.tabs.onRemoved.addListener(function(tabId, changeInfo, tab) {

    chrome.storage.session.get(["lastSesametimeSuccesfulClick"]).then((result) => {
        

        const lastActionTimestamp = result.lastSesametimeSuccesfulClick || 0;
        const elapseTimeInMilliseconds = 3 * 60 * 1000; // each 5 minutes in milliseconds
        const currentDate = new Date().getTime();

        if (currentDate - lastActionTimestamp >= elapseTimeInMilliseconds) {

            // Open a new tab:
            chrome.tabs.create({ url: "https://app.sesametime.com/employee/portal" });

            if ( sesameButtonWasClicked(textContent) ){
                // Save the current timestamp as the last action timestamp:
                chrome.storage.sessions.set({ 'lastSesametimeSuccesfulClick': currentDate });
            }

            // Close the current tab:
            chrome.windows.close();
        }
    });
});
