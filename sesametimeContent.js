function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

// Create a function that check if the browser is fully loaded.
// This function will be used to wait for the page to be fully
// loaded before trying to click on the button.
async function isPageFullyLoaded() {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (document.readyState === 'complete') {
                clearInterval(interval);
                resolve(true);
            }
        }, 100);
    });
}

// find elemetn by text content and return true if they are visible otherwise returns false.
async function isElementVisible(textContent) {
    const spans = document.querySelectorAll('span');
    const buttons = document.querySelectorAll('button');

    for (const element of [...spans, ...buttons]) {
        if (element.textContent.trim() === textContent) {
            return element.offsetParent !== null;
        }
    }

    return false; // Button not found
}

async function clickButton(textContent) {
    const spans = document.querySelectorAll('span');
    const buttons = document.querySelectorAll('button');

    for (const element of [...spans, ...buttons]) {
        if (element.textContent.trim() === textContent) {
            await element.click();
            return true;
        }
    }

    return false; // Button not found
}

async function retry(callBack, maxRetries = 10, delayBetweenRetries = 2) {

    for (let i = 0; i < maxRetries; i++) {
        if (await callBack()) {
            return true;
        }
        await sleep(delayBetweenRetries);
    }

    console.log(`Not found after ${maxRetries} attempts.`);
    return false;
}

async function typeEmail(email) {
    const inputFields = document.querySelectorAll('input[type="text"], input[type="email"]');

    for (const inputField of inputFields) {
        inputField.value = email;
        inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        return true;
    }

    return false;
}

// TODO: after loging in, the below code doesn't work anymore.
async function handleEmployeePortalPage() {
    await retry(async () => await clickButton('Entrar'), 5, 2);
    const entrarButtonIsVisible = await retry(async () => await isElementVisible('Entrar'), 2, 1.5);
    const salirButtonIsVisible = await retry(async () => await isElementVisible('Salir'), 2, 1.5);

    // If the `Entrar` button isn't visible and the `salir` button is visible, it means that the clock-in button was pressed successfully.
    const clockInButtonWasClicked = !entrarButtonIsVisible && salirButtonIsVisible;

    if (clockInButtonWasClicked) {
        // Send a message to the service worker
        chrome.runtime.sendMessage({ type: 'clockInButtonWasClicked' }, (response) => {
            // Got an asynchronous response with the data from the service worker.
            console.log(`The service worker registers that the clock-in button was clicked at: ${response}`);
        });
    }

    // Ask background process to close current tab
    chrome.runtime.sendMessage({ type: 'closeCurrentTab'});
}

async function handleLoginSSOPage() {
    chrome.runtime.sendMessage({ type: 'getCurrentLoggedGmailEmail' }, async (response) => {
        if (!response) {
            alert('Please, sync your browser with your gmail account and try again.');
            return;
        }

        await retry(async () => await typeEmail(response));
        await retry(async () => await clickButton('Access with SSO'));
    });
}

async function handleLoginPage() {
    await isPageFullyLoaded();
    await retry(async () => await clickButton('Access with SSO'));
}

async function handleActionsBasedOnURL() {
    const currentURL = window.location.href;
    console.log(`[handleActionsBasedOnURL] Current URL: ${currentURL}`);

    switch (currentURL) {
        case 'https://app.sesametime.com/login':
            await handleLoginPage();
            break;

        case 'https://app.sesametime.com/login-sso':
            await handleLoginSSOPage();
            break;

        case 'https://app.sesametime.com/employee/portal':
            await handleEmployeePortalPage();
            break;

        default:
            console.log(`No actions defined for the current URL: ${currentURL}`);
            break;
    }
}

handleActionsBasedOnURL();

