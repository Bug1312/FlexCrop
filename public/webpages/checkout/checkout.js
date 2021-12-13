var subtotal = 0,
    stacks = 0,
    items = 0;

async function loadPage() {
    document.getElementById('delivery-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        setUsername(document.getElementById('mcUsername').value);
        resetCookie();
        swapSection();
    });
    addJSON(['MenuPages', 'DeliveryTypes']);
    getUsername();
    loadSideSummary();
    updateTotal();
}



function updateTotal() {
    setTimeout(() => {
        document.getElementById('subtotal').innerHTML = subtotal;
    }, 500);
};

function setUsername(username) {
    localStorage.setItem('flexcrop-username-lock', username);
};

function getUsername() {
    if (localStorage.getItem('flexcrop-username-lock')) {
        document.getElementById('mcUsername').value = localStorage.getItem('flexcrop-username-lock');
        document.getElementById('mcUsername').disabled = true;
    };
};

function giftToggleUpdate() {
    let checkbox = document.getElementById('gift'),
        textbox = document.getElementById('giftee'),
        deliverySelect = document.getElementById('deliveryOption'),
        deliveryOptions = document.querySelectorAll('#deliveryOption option');
    if (checkbox.checked) {
        textbox.removeAttribute('disabled');
        deliveryOptions.forEach(option => {
            if (option.getAttribute('giftBlock') == 'true') {
                if (option.selected) {
                    deliverySelect.selectedIndex = 0;
                };
                option.setAttribute('disabled', '');
            };
        });
    } else {
        textbox.setAttribute('disabled', '')
        deliveryOptions.forEach(option => {
            if (option.getAttribute('giftBlock') == 'true') {
                option.removeAttribute('disabled');
            };
        });
    };
    updateDelivery(deliverySelect.selectedOptions[0]);
};

function updateDelivery(option) {
    document.getElementById('explaination').innerHTML = option.getAttribute('description');
    if (option.getAttribute('location') == 'false') {
        document.getElementById('flexcrop-location').setAttribute('disabled', '');
        document.getElementById('flexcrop-location').value = '';

    } else {
        document.getElementById('flexcrop-location').removeAttribute('disabled');
    }
};

function loadSideSummary() {
    let JSONFile = new XMLHttpRequest(),
        summary = document.getElementById('side-summary-items');
    summary.innerHTML = '';
    JSONFile.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            let dataJSON = JSON.parse(this.responseText)['Items'];
            Object.keys(sessionStorage).forEach(key => {
                if (key.includes('item_')) {
                    let sessionItem = JSON.parse(sessionStorage.getItem(key)),
                        itemID = sessionItem.item,
                        rename = sessionItem.name,
                        amount = sessionItem.amount,
                        variant = sessionItem.variant;
                    dataJSON.forEach(item => {
                        if (item.name == itemID) {
                            let cost, total;
                            if (item.defCountCost > 1) {
                                cost = item.defCost + '/' + item.defCountCost;
                                total = Math.ceil(amount * item.defCost / item.defCountCost);
                            } else {
                                cost = item.defCost;
                                total = amount * cost;
                            }
                            summary.innerHTML += `
                            <li class="side-summary-item">
                                <div class="side-summary-item-div item-image-div">
                                    <img class="side-summary-item-image" alt="${itemID}" src="${
                                        (variant)? item.variants.find(itemVariant => itemVariant.variantName == variant).image:item.image
                                    }" ${
                                        (
                                            !(
                                                (variant)? item.variants.find(itemVariant => itemVariant.variantName == variant).image:item.image
                                            ).includes('+16x')
                                        )? 'pixelated': ''
                                        }>
                                </div>
                                <div class="side-summary-item-div item-flex">
                                    <p class="side-summary-item-name">${(rename)? rename:itemID}<br />${variant}</p>
                                    <p class="side-summary-item-math">${amount} x $${
                                        cost
                                        
                                    }</p>
                                </div>
                                <div class="side-summary-item-div">
                                    <p class="item-total">${total}</p>
                                </div>
                            </li>`;
                            subtotal += total;
                        };
                    });
                };
            });
        };
    };
    JSONFile.open('GET', '/data/data.json', true);
    JSONFile.send();
}

function loadMainSummary() {
    let summary = document.getElementById('summary-items');
    summary.innerHTML = '';
    fetch('/data/data.json').then(res => res.text()).then(res => JSON.parse(res)).then(dataJSON => {
        let itemsJSON = dataJSON['Items'],
            deliveryJSON = dataJSON['DeliveryTypes'];
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes('item_')) {
                let sessionItem = JSON.parse(sessionStorage.getItem(key)),
                    itemID = sessionItem.item,
                    rename = sessionItem.name,
                    amount = sessionItem.amount,
                    variant = sessionItem.variant,
                    stack = (sessionItem.stack != undefined) ? sessionItem.stack : 64;
                itemsJSON.forEach(item => {
                    if (item.name == itemID) {
                        let cost, total;
                        if (item.defCountCost > 1) {
                            cost = item.defCost + '/' + item.defCountCost;
                            total = Math.ceil(amount * item.defCost / item.defCountCost);
                        } else {
                            cost = item.defCost;
                            total = amount * cost;
                        }
                        summary.innerHTML += `
                            <li class="side-summary-item">
                                <div class="side-summary-item-div item-image-div">
                                    <img class="side-summary-item-image" alt="${itemID}" src="${
                                        (variant)? item.variants.find(itemVariant => itemVariant.variantName == variant).image:item.image
                                    }" ${
                                        (
                                            !(
                                                (variant)? item.variants.find(itemVariant => itemVariant.variantName == variant).image:item.image
                                            ).includes('+16x')
                                        )? 'pixelated': ''
                                        }>
                                </div>
                                <div class="side-summary-item-div item-flex">
                                    <p class="side-summary-item-name">${(rename)? rename:itemID}<br />${variant}</p>
                                    <p class="side-summary-item-math">${amount} x $${
                                        cost
                                        
                                    }</p>
                                </div>
                                <div class="side-summary-item-div">
                                    <p class="item-total">${total}</p>
                                </div>
                            </li>`;
                        subtotal += total;
                        if (Number(stack) != 0) {
                            stacks += Number(Math.ceil(Number(amount) / Number(stack)));
                        };
                        if (stack >= 1) {
                            items += Number(amount);
                        } else {
                            items += 1 / Number(stack) * Number(amount);
                        }
                    };
                });
            };
        });
        deliveryJSON.forEach(deliveryType => {
            if (deliveryType.name == document.getElementById('deliveryOption').value) {
                let tax = calculate(deliveryType.formula, stacks, items);
                document.getElementById('deliveryTax').innerHTML = `
                        <div class="side-summary-item-div item-image-div">
                            <img id="delivery-image" class="side-summary-item-image" alt="${deliveryType.name}" src="${deliveryType.image}" ${
                                    ((deliveryType.image).includes('+16x'))? '': 'pixelated'
                                }>
                        </div>
                        <div class="side-summary-item-div item-flex">
                            <p id="delivery-name" class="side-summary-item-name">Delivery<br>${deliveryType.name}</p>
                            <p id="delivery-math" class="side-summary-item-math">${deliveryType.formula}</p>
                        </div>
                        <div class="side-summary-item-div">
                            <p id="delivery-total" class="item-total">${tax}</p>
                        </div>
                    `;
                document.getElementById('total').innerHTML = tax + Number(subtotal) / 2
            };
        });
    });
}

function swapSection() {
    let items = document.getElementById('side-summary-items'),
        formAndSummary = document.getElementById('form-and-small-summary'),
        recap = document.getElementById('recap');

    if (items.innerHTML != '') {
        formAndSummary.setAttribute('hidden', '');
        recap.removeAttribute('hidden');
        loadMainSummary();
    }
}

function sendOrder(button = null) {
    let username = document.getElementById('mcUsername').value,
        giftBoolean = document.getElementById('gift').checked,
        giftee = document.getElementById('giftee').value,
        deliveryType = document.getElementById('deliveryOption').value,
        location = document.getElementById('flexcrop-location').value,
        note = document.getElementById('note').value,
        form = {
            username,
            giftBoolean,
            giftee,
            deliveryType,
            location,
            note,
            id: createUUID()
        };
    if (button)
        button.disabled = true;
    sessionStorage.setItem('form', JSON.stringify(form));
    fetch("/fetch-order", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(window.sessionStorage)
    }).then(response => response.json()).then(response => {
        if (response == 1) {
            sessionStorage.clear();
            window.location = '/';
        } else if (response == 2) {
            window.location = '/reload';
        };
    });
};