function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * 1000));
}

async function clickButton(textContent) {
    const spans = document.querySelectorAll('span');
    const buttons = document.querySelectorAll('button');

    for (const element of [...spans, ...buttons]) {
        if (element.textContent.trim() === textContent) {
            return new Promise(resolve => {
                element.click();
                resolve(true); // Button clicked successfully
            });
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

async function fromEmployeePortalPage() {
    await sleep(3);
    const buttonWasClicked = await retry(async () => await clickButton('Entrar', 20));

    if (buttonWasClicked) {
        // Send a message to the service worker
        chrome.runtime.sendMessage({ type: 'buttonWasClicked' }, (response) => {
            // Got an asynchronous response with the data from the service worker.
            console.log('The service worker registers that the clock-in button was clicked at: ', response);
        });
    }

    await window.close();
}

async function fromLoginSSOPage() {
    await sleep(2);
    await retry(async () => await typeEmail('<YOUR_EMAIL.com>'));
    await retry(async () => await clickButton('Access with SSO'));
    await fromEmployeePortalPage();
}

async function fromLoginPage() {
    await sleep(2);
    await retry(async () => await clickButton('Access with SSO'));
    await fromLoginSSOPage();
}

async function handleActionsBasedOnURL() {
    const currentURL = window.location.href;

    switch (currentURL) {
        case 'https://app.sesametime.com/login':
            await fromLoginPage();
            break;

        case 'https://app.sesametime.com/login-sso':
            await fromLoginSSOPage();
            break;

        case 'https://app.sesametime.com/employee/portal':
            await fromEmployeePortalPage();
            break;

        default:
            console.log(`No actions defined for the current URL: ${currentURL}`);
            break;
    }
}

handleActionsBasedOnURL();

