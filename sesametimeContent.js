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
    let retries = 0;

    async function attempt() {
        if (retries >= maxRetries) {
            console.log(`Not found after ${maxRetries} attempts.`);
            return false;
        }

        if (await callBack()) {
            return true;
        }

        retries++;
        await sleep(delayBetweenRetries);
        await attempt();
    }

    await attempt();
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
    const buttonWasClicked = await retry(async () => await clickButton('Entrar'), 5, 2);

    await sleep(6); // Wait while the `Entrar` button is being clicked
    // TODO: create better loggic to check if `entrar` the button was clicked and the page is fully loaded

    if (buttonWasClicked) {
        // Send a message to the service worker
        chrome.runtime.sendMessage({ type: 'buttonWasClicked' }, (response) => {
            // Got an asynchronous response with the data from the service worker.
            console.log('The service worker registers that the clock-in button was clicked at: ', response);
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

