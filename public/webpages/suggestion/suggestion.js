window.onkeydown = function(key) {
    if (key.keyCode == '27') {
        hideOverlays(['.shadow-overlay', '.suggestion-overlay'])
    }
}

function sendSuggestion() {
    hideOverlays(['.shadow-overlay', '.suggestion-overlay']);

    let username = (localStorage['flexcrop-username-lock']) ? localStorage['flexcrop-username-lock'] : 'Anonymous',
        suggestion = document.getElementById('suggestion'),
        data = {
            id: createUUID(),
            suggestion: suggestion.value,
            username
        };
    if (suggestion != '') {
        fetch("/fetch-suggest", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        }).then(res => res.json()).then(res => console.log(res));
    };
    clearSuggestion();
}

function clearSuggestion() {
    document.getElementById('suggestion').value = ''
}