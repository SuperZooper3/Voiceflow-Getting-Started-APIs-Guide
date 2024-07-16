import requests

api_key = 'YOUR_API_KEY_HERE' # it should look like this: VF.DM.XXXXXXX.XXXXXX... keep this a secret!

projectID = "YOUR_PROJECT_ID_HERE"
versionID = "YOUR_VERSION_ID_HERE"

buttons = []

# user_id defines who is having the conversation, e.g. steve, john.doe@gmail.com, username_464
def interact(user_id, request):
    global buttons

    response = requests.post(
        f'https://general-runtime.voiceflow.com/state/user/{user_id}/interact',
        json={ 'request': request },
        headers={ 
            'Authorization': api_key,
            'versionID': 'production'
        },
    )

    for trace in response.json():
        if trace['type'] == 'text':
            print(trace['payload']['message'])
        elif trace['type'] == "choice":
            buttons = trace['payload']['buttons']
            print("Choose one of the following:")
            for i in range(len(buttons)):
                print(f"{i+1}. {buttons[i]['name']}")
        elif trace['type'] == 'end':
            # an end trace means the the voiceflow dialog has ended
            return False
        else:
            print("Unhandled trace")
            print(trace)
    # the dialog is still running
    return True

def save_transcript(user_id):
    url = "https://api.voiceflow.com/v2/transcripts"

    payload = {
        "projectID": projectID,
        "versionID": versionID,
        "sessionID": user_id
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "Authorization": api_key
    }

    response = requests.put(url, json=payload, headers=headers)

    print("Saved transcript with code " + str(response.status_code))

name = input('> What is your name?\n')
isRunning = interact(name, { 'type': 'launch' })

while (isRunning):
    if (len(buttons) > 0):
        buttonSelection = input('> Choose a button number, or a reply\n')
        try:
            isRunning = interact(name, buttons[int(buttonSelection) - 1]["request"])
        except:
            isRunning = interact(name, { 'type': 'text', 'payload': buttonSelection })
        buttons = []
    else:
        nextInput = input('> Say something\n')
        isRunning = interact(name, { 'type': 'text', 'payload': nextInput })
    save_transcript(name)

print("The conversation has ended.")