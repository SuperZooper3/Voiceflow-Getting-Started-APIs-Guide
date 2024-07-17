const axios = require('axios');
const readline = require('readline');

const api_key = 'YOUR_API_KEY_HERE'; // it should look like this: VF.DM.XXXXXXX.XXXXXX... keep this a secret!
const projectID = 'YOUR_PROJECT_ID_HERE';
const versionID = 'YOUR_VERSION_ID_HERE';

let buttons = [];

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const interact = async (user_id, request) => {
    try {
        const response = await axios.post(
            `https://general-runtime.voiceflow.com/state/user/${user_id}/interact`,
            { request: request },
            {
                headers: {
                    'Authorization': api_key,
                    'versionID': 'production',
                    "accept": "application/json",
                    "content-type": "application/json"
                }
            }
        );

        const traces = response.data;
        for (let trace of traces) {
            if (trace.type === 'text') {
                console.log(trace.payload.message);
            } else if (trace.type === 'choice') {
                buttons = trace.payload.buttons;
                console.log('Choose one of the following:');
                for (let i = 0; i < buttons.length; i++) {
                    console.log(`${i + 1}. ${buttons[i].name}`);
                }
            } else if (trace.type === 'end') {
                // an end trace means the voiceflow dialog has ended
                return false;
            } else {
                console.log('Unhandled trace');
                console.log(trace);
            }
        }
        // the dialog is still running
        return true;
    } catch (error) {
        console.error('Error interacting with Voiceflow:', error);
        return false;
    }
};

const saveTranscript = async (user_id) => {
    try {
        const response = await axios.put(
            'https://api.voiceflow.com/v2/transcripts',
            {
                projectID: projectID,
                versionID: versionID,
                sessionID: user_id
            },
            {
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'Authorization': api_key
                }
            }
        );

        console.log('Saved transcript with code ' + response.status);
    } catch (error) {
        console.error('Error saving transcript:', error);
    }
};

const startConversation = async () => {
    const question = (query) => {
        return new Promise(resolve => {
            rl.question(query, (answer) => {
                resolve(answer);
            });
        });
    };

    rl.question('> What is your name?\n', async (name) => {
        let isRunning = await interact(name, { type: 'launch' });

        while (isRunning) {
            if (buttons.length > 0) {
                const buttonSelection = await question('> Choose a button number, or a reply\n');
                try {
                    const selection = parseInt(buttonSelection);
                    if (isNaN(selection) || selection < 1 || selection > buttons.length) {
                        throw new Error('Invalid selection');
                    }
                    isRunning = await interact(name, buttons[selection - 1].request);
                } catch {
                    isRunning = await interact(name, { type: 'text', payload: buttonSelection });
                }
                buttons = [];
                await saveTranscript(name);
            } else {
                const nextInput = await question('> Say something\n');
                isRunning = await interact(name, { type: 'text', payload: nextInput });
                await saveTranscript(name);
            }
        }

        console.log('The conversation has ended.');
        rl.close();
    });
};

startConversation();
