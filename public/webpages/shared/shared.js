function resetCookie() {
    fetch("/fetch-username-updates", {
        method: "POST"
    }).then(response => response.json()).then(response => {
        response.forEach(user => {
            if (localStorage.getItem('flexcrop-username-lock') == user.oldName) {
                localStorage.setItem('flexcrop-username-lock', user.newName);
            };
        });
    });

    document.cookie = `username=${localStorage.getItem('flexcrop-username-lock') || 'undefined'};expires=01 Jan 3000 00:00:00 GMT; SameSite=Strict"`
    FingerprintJS.load()
        .then(fp => fp.get())
        .then(result => {
            document.cookie = `_ufp=${result.visitorId};expires=01 Jan 3000 00:00:00 GMT; SameSite=Strict"`
        })
}

function hideOverlays(overlaySelectors) {
    overlaySelectors.forEach(selector => {
        document.querySelector(selector).removeAttribute('active')
    })
};

function showOverlays(overlaySelectors) {
    overlaySelectors.forEach(selector => {
        document.querySelector(selector).setAttribute('active', '')
    })
};

function createUUID() {
    return 'xx1xx3xx1xx2'.replace(/x/g, function(randomCharacter) {
        let random = Math.random() * 16 | 0,
            v = randomCharacter == 'x' ? random : (random & 0x3 | 0x8);
        return v.toString(16);
    });
}

function addJSON(types) {
    fetch('/data/data.json').then(res => res.text()).then(res => JSON.parse(res)).then(dataJSON => {
        types.forEach(type => {
            switch (type) {
                case 'MenuPages':
                    dataJSON[type].forEach(menuPage => {
                        let newMenu = document.createElement('A');
                        newMenu.innerHTML = menuPage.displayName;
                        newMenu.setAttribute('href', menuPage.url);
                        document.querySelector('.mobile-menu-links').appendChild(newMenu)
                        document.querySelector('.menu-container[desktop]').appendChild(newMenu.cloneNode(true))
                    });
                    break;
                case 'Tags':
                    dataJSON[type].forEach(tag => {
                        let newTagMobileInput = document.createElement('INPUT'),
                            newTagMobileLabel = document.createElement('LABEL'),
                            newTagDesktopInput = document.createElement('INPUT'),
                            newTagDesktopLabel = document.createElement('LABEL');
                        // Mobile
                        {
                            // Input
                            {
                                // Dynamic
                                newTagMobileInput.id = `mobile-radio-${tag.id}`;
                                // Static
                                newTagMobileInput.name = 'tags';
                                newTagMobileInput.type = 'radio';

                                newTagMobileInput.setAttribute('onclick', 'checkRadio(this)');
                            }
                            // Label
                            {
                                newTagMobileLabel.setAttribute('for', `mobile-radio-${tag.id}`);
                                newTagMobileLabel.innerHTML = tag.name;
                            }
                        }
                        // Desktop
                        {
                            // Input
                            {
                                // Dynamic
                                newTagDesktopInput.id = `desktop-radio-${tag.id}`
                                // Static
                                newTagDesktopInput.name = 'tags';
                                newTagDesktopInput.type = 'radio';
                                newTagDesktopInput.setAttribute('onclick', 'checkRadio(this)');
                            }
                            // Label
                            {
                                newTagDesktopLabel.setAttribute('for', `desktop-radio-${tag.id}`);
                                newTagDesktopLabel.innerHTML = tag.name;
                            }
                        }
                        document.querySelector('#mobile-tags-container').appendChild(newTagMobileInput);
                        document.querySelector('#mobile-tags-container').appendChild(newTagMobileLabel);

                        document.querySelector('#desktop-tags-container').appendChild(newTagDesktopInput);
                        document.querySelector('#desktop-tags-container').appendChild(newTagDesktopLabel);
                    });
                    break;
                case 'Items':
                    dataJSON[type].forEach(item => {
                        let newItemLI = document.createElement('LI'),
                            newItemBUTTON = document.createElement('BUTTON'),
                            newItemP = document.createElement('P'),
                            newItemIMG = document.createElement('IMG');
                        // Image
                        {
                            // Dynamic
                            newItemIMG.setAttribute('src', item.image);
                            newItemIMG.setAttribute('alt', item.name);
                            newItemIMG.setAttribute('loading', 'lazy');
                            if (!item.image.includes('+16x')) {
                                newItemIMG.setAttribute('pixelated', '')
                            }
                            // Static
                            newItemIMG.classList.add('item-image');
                        }
                        // Title
                        {
                            // Dynamic
                            newItemP.innerHTML = item.name;
                            // Static
                            newItemP.classList.add('item-title');
                        }
                        // Button 
                        {
                            // Static
                            newItemBUTTON.classList.add('item-button');
                            newItemBUTTON.setAttribute('onclick', `openPopup('${item.name}')`);
                            newItemBUTTON.appendChild(newItemP);
                            newItemBUTTON.appendChild(newItemIMG);
                        }
                        // List Item 
                        {
                            // Static
                            newItemLI.classList.add('item-li');
                            newItemLI.setAttribute('baseCost', item.defCost);
                            newItemLI.setAttribute('tags', JSON.stringify(item.tags))
                            newItemLI.appendChild(newItemBUTTON);
                        }
                        if (!item.disabled)
                            document.querySelector('ul.items').appendChild(newItemLI);
                    });
                    sortList();
                    break;
                case 'DeliveryTypes':
                    dataJSON[type].forEach(deliveryType => {
                        let newOption = document.createElement('OPTION'),
                            select = document.getElementById('deliveryOption');
                        newOption.innerHTML = deliveryType.name;
                        newOption.setAttribute('description', deliveryType.desc);
                        newOption.setAttribute('location', (deliveryType.location) ? true : false);
                        newOption.setAttribute('giftBlock', (deliveryType.giftBlock) ? true : false);
                        if (!deliveryType.disabled)
                            select.appendChild(newOption)
                    })
                    break;
                case 'Notifications':
                    let siteInfo = dataJSON['SiteInfo'],
                        parent = document.getElementById('messages');
                    if (siteInfo.warning) {
                        let warnDiv = document.createElement('div'),
                            warnMsg = document.createElement('p');

                        warnMsg.innerHTML = siteInfo.warning;
                        warnDiv.appendChild(warnMsg);
                        warnDiv.classList.add('warning');
                        parent.appendChild(warnDiv)
                    }
                    if (siteInfo.message) {
                        let notifDiv = document.createElement('div'),
                            notifMsg = document.createElement('p');

                        notifMsg.innerHTML = siteInfo.message;
                        notifDiv.appendChild(notifMsg);
                        notifDiv.classList.add('notification');
                        parent.appendChild(notifDiv);
                    };
                    break;
                case 'Supplies':
                    fetch("/fetch-supplies", {
                        method: "POST"
                    }).then(response => response.json()).then(response => {
                        document.getElementById('supplies-container').innerText = '';
                        response.forEach(order => {
                            document.getElementById('supplies-container').innerHTML +=
                                `<div class="supply-bar" onclick="openPopup(this)" items='${JSON.stringify(order.items).replace(/\'/g, "&#39;")}' id='${order.id}'>
                                    <img class="supply-img" src="/data/images/other/min_logo/logoShort.png">
                                    <p class="supply-pay">${Number(order.cost.toString().substr(-3)) + 1000}</p>
                                    <div class="supply-break">
                                        <p class="supply-items">${order.items.length}</p>
                                    </div>
                                </div>`;
                        });
                    });
                    break;
                case 'SupplyLeaderboards':
                    fetch("/fetch-leaderboard", {
                        method: "POST"
                    }).then(response => response.json()).then(response => {
                        response.forEach((supplier, index) => {
                            // Desktop
                            let desktop_listItem = document.querySelector(`:not(.side-leaderboard-list) .leaderboard-list .leaderboardee:nth-child(${index + 1})`);
                            desktop_listItem.setAttribute('title', `${supplier.items} Item(s)`);
                            desktop_listItem.querySelector('.leaderboardee-img').setAttribute('src', `https://minotar.net/helm/${supplier.name}/16`);
                            desktop_listItem.querySelector('.leaderboardee-img').setAttribute('pixelated', '');
                            desktop_listItem.querySelector('.leaderboardee-name').innerHTML = supplier.name;
                            // Mobile
                            let mobile_listItem = document.querySelector(`.side-leaderboard-list .leaderboard-list .leaderboardee:nth-child(${index + 1})`);
                            mobile_listItem.querySelector('.leaderboardee-img').setAttribute('src', `https://minotar.net/helm/${supplier.name}/16`);
                            mobile_listItem.querySelector('.leaderboardee-img').setAttribute('pixelated', '');
                            mobile_listItem.querySelector('.leaderboardee-name').innerHTML = supplier.name;
                        });
                    });
                    break;
                case 'Employees':
                    fetch("/fetch-employees", {
                        method: "POST"
                    }).then(response => response.json()).then(response => {
                        document.getElementById('employee-container').innerHTML = '';
                        response.forEach(name => {
                            document.getElementById('employee-container').innerHTML +=
                                `<div class="employee-bar" title="${name}">
                                    <img class="employee-img" src="https://minotar.net/helm/${name}/16" pixelated>
                                    <p class="employee-name">${name}</p>
                                </div>`;
                        });
                    });
                    break;
                default:
                    console.error(`There is no JSON identified by ${type}`);
            }
        })
    })
};

function homePageRedirect(logo) {
    logo.classList.add('logo-spin');
    setTimeout(() => window.location = '/', 500);
}

function calculate(string, stack, item) {
    return Math.ceil(
        eval(
            string
            .toLowerCase()
            .replace(/(\s|\$)/g, '')
            .replace(/stacks/g, stack)
            .replace(/items/g, item)
            .replace(/free/g, 0)

        )
    );
}

function addItemToStorage(itemID, amount = 1, stack = 64, rename = "", variant = "", max = Infinity) {
    let item = {
            item: itemID,
            name: rename,
            amount: amount,
            variant: variant,
            stack: stack
        },
        checkBoolean;
    Object.keys(sessionStorage).forEach(key => {
        if (
            key.includes('item_') &&
            JSON.parse(sessionStorage.getItem(key)).item == itemID &&
            JSON.parse(sessionStorage.getItem(key)).name == rename &&
            JSON.parse(sessionStorage.getItem(key)).variant == variant
        ) {
            item.amount = Number(JSON.parse(sessionStorage.getItem(key)).amount) + Number(amount);
            if (item.amount > max) {
                item.amount = max;
            };
            sessionStorage.setItem(key, JSON.stringify(item));
            checkBoolean = true;
        };
    });
    if (!checkBoolean) {
        sessionStorage.setItem(`item_${Math.random()}`, JSON.stringify(item));
    };
    removeItem();
}

function removeItem(itemID, rename = "", variant = "") {
    Object.keys(sessionStorage).forEach(key => {
        if (
            itemID &&
            key.includes('item_') &&
            JSON.parse(sessionStorage.getItem(key)).item == itemID &&
            JSON.parse(sessionStorage.getItem(key)).name == rename &&
            JSON.parse(sessionStorage.getItem(key)).variant == variant
        ) {
            sessionStorage.removeItem(key);
        } else if (
            key.includes('item_') &&
            JSON.parse(sessionStorage.getItem(key)).amount <= 0
        ) {
            sessionStorage.removeItem(key);
        };
    });
};