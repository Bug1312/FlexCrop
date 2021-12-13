function loadReason() {
    fetch("/fetch-ban", {
        method: "POST"
    }).then(response => response.json()).then(response => {
        document.getElementById('reason').innerHTML = response[0]
    }).catch(err => {
        window.location.reload();
    });
}