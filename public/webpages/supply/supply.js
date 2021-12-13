function formatItem(itemJSON) {
    return `${itemJSON.amount} ${itemJSON.item} ${(itemJSON.variant)? `{ ${itemJSON.variant} }`: ''}`;
}

function openPopup(order) {
    let items = JSON.parse(order.getAttribute('items')),
        id = order.getAttribute('id'),
        cost = order.querySelector('.supply-pay').innerHTML,
        popup = document.querySelector('.popup-overlay'),
        popupCost = document.getElementById('popup-pay'),
        popupList = document.getElementById('popup-list');
    // Reset
    popup.removeAttribute('id');
    popupList.innerHTML = '';
    popupCost.innerHTML = '0';
    // Edit
    popup.setAttribute('id', id);
    items.forEach(item => {
        newLi = document.createElement('li');
        newLi.innerHTML = formatItem(item);
        popupList.append(newLi);
    });
    popupCost.innerHTML = cost;
    showOverlays(['.shadow-overlay', '.popup-overlay']);
};

function loadLeaderboards() {
    function updateLi(leaderboardee, index) {
        leaderboardee.style = `background: hsl(${ 120 + 2*index }, ${ 90 - 2*index }%, ${ 90 - 4*index }%);`
    }
    document.querySelectorAll(".section-left li").forEach((leaderboardee, i) => {
        updateLi(leaderboardee, Math.abs(i - 10));
    })
    document.querySelectorAll(".side-leaderboard-list li").forEach((leaderboardee, i) => {
        updateLi(leaderboardee, Math.abs(i - 10));
    })
}

function notifyFlexCrop() {
    hideOverlays(['.confirm-overlay', '.shadow-overlay']);
    fetch("/fetch-supplied", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id: document.querySelector('.popup-overlay').getAttribute('id'),
            pay: document.getElementById('popup-pay').innerHTML
        })
    });
}