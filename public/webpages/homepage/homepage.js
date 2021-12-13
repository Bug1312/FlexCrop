const defaultMax = 320;
var selectedRadios = {};

window.onkeydown = function(key) {
    if (key.keyCode == '27') {
        hideOverlays(['.shadow-overlay', '.menu-overlay', '.cart-overlay', '.popup-overlay'])
    }
}

function categoryButtonsMobilePopup(button) {
    let chevron = button.getElementsByClassName("chevron")[0],
        popup = button.parentNode.getElementsByTagName('div')[0];
    if (button.getElementsByClassName("chevron-down").length) {
        document.querySelectorAll(".chevron.category-chevron").forEach(element => {
            element.classList.remove("chevron-up");
            element.classList.add("chevron-down")
        });
        document.querySelectorAll(".category-buttons").forEach(element => {
            element.setAttribute('category-buttons-hide', '')
        });
        popup.removeAttribute('category-buttons-hide');
        chevron.classList.add("chevron-up");
        chevron.classList.remove("chevron-down")
    } else {
        document.querySelectorAll(".chevron").forEach(element => {
            element.classList.remove("chevron-up");
            element.classList.add("chevron-down")
        });
        document.querySelectorAll(".category-buttons").forEach(element => {
            element.setAttribute('category-buttons-hide', '')
        })
    }
};

function checkRadio(radio) {
    let nullRadio = radio.parentNode.querySelector('.null-radio'),
        selected = selectedRadios[radio.name];
    if (radio == selected) {
        nullRadio.checked = true;
        radio.checked = false;
        selectedRadios[radio.name] = nullRadio;
    } else {
        selectedRadios[radio.name] = radio
    }
};


function popupConfirm() {
    let item = document.getElementById('popup-title').innerHTML,
        rename = document.getElementById('popup-rename').value,
        amount = document.getElementById('popup-amount'),
        selectedVariant = document.getElementById('popup-type').selectedOptions[0],
        variant = (selectedVariant) ? selectedVariant.innerHTML : '',
        max = amount.getAttribute('max'),
        stack = amount.getAttribute('stack');
    cartAddItem(item, rename, amount.value, variant, max, stack);
    // Add to cart n stuff
    hideOverlays(['.shadow-overlay', '.popup-overlay'])
};

function openPopup(itemID, customName, customVariant) {
    hideOverlays(['.shadow-overlay', '.cart-overlay'])
    fetch('/data/data.json').then(res => res.text()).then(res => JSON.parse(res)).then(dataJSON => {
        let title = document.getElementById('popup-title'),
            image = document.getElementById('popup-image'),
            baseCost = document.getElementById('popup-cost'),
            baseAmount = document.getElementById('popup-amount'),
            variant = document.getElementById('popup-type'),
            rename = document.getElementById('popup-rename'),
            warning = document.getElementById('popup-warning');

        image.removeAttribute('pixelated');

        variant.innerHTML = '';
        variant.removeAttribute('invis');

        rename.removeAttribute('disabled');
        if (customName) {
            rename.value = customName;
        } else {
            rename.value = '';
        }
        dataJSON['Items'].filter(item => item.name == itemID).forEach(item => {
            title.innerHTML = item.name;
            image.setAttribute('src', item.image);
            image.setAttribute('alt', item.name);
            if (!item.image.includes('+16x')) {
                image.setAttribute('pixelated', '');
            };
            baseCost.innerHTML = item.defCost;
            baseCost.setAttribute('costCalc', item.defCost / item.defCountCost)
            baseAmount.value = item.defCountCost;
            baseAmount.max = (item.purchaseLimit) ? item.purchaseLimit : defaultMax;
            baseAmount.setAttribute('stack', (item.stack != undefined) ? item.stack : 64)
            if (item.variants != null) {
                item.variants.forEach((variant, index) => {
                    let newVariant = document.createElement('option');
                    if (index == 0)
                        image.setAttribute('src', variant.image);
                    newVariant.setAttribute('url', variant.image);
                    newVariant.innerHTML = variant.variantName;
                    document.getElementById('popup-type').appendChild(newVariant);
                });
            } else {
                variant.setAttribute('invis', '');
            };
            if (item.nameLock) {
                rename.setAttribute('disabled', '');
            };
            warning.innerHTML = (item.warning) ? item.warning : '';
            if (customVariant) {
                variant.childNodes.forEach(option => {
                    if (option.innerHTML == customVariant) {
                        option.defaultSelected = true;
                        updateVariant();
                    };
                });
            };
        });
        showOverlays(['.shadow-overlay', '.popup-overlay'])
    });
};

function cartAddToItem(parent, amount) {
    let newNum = Number(parent.querySelector('.item-counter P').innerHTML) + amount,
        itemID = parent.getAttribute('item'),
        rename = (parent.querySelector('.cart-item-name').innerHTML != itemID) ? parent.querySelector('.cart-item-name').innerHTML : '',
        variant = parent.querySelector('.cart-item-variant').innerHTML,
        max = parent.getAttribute('max'),
        stack = parent.getAttribute('stack');
    if (newNum <= parent.getAttribute('max') && newNum >= parent.getAttribute('min')) {
        parent.querySelector('.item-counter P').innerHTML = Number(newNum);
        max = parent.getAttribute('max');
    };
    if (newNum == 0) {
        parent.remove();
    };

    cartAddItem(itemID, rename, amount, variant, max, stack);
}

function cartAddItem(itemID, rename = "", amount = 1, variant = "", max = defaultMax, stack = 64) {
    addItemToStorage(itemID, (Number(amount) > Number(max)) ? max : amount, stack, rename, variant, max);
    cartSync();
}

function cartSync() {
    document.querySelector(".cart-items").innerHTML = ''
    fetch('/data/data.json').then(res => res.text()).then(res => JSON.parse(res)['Items']).then(dataJSON => {
        Object.keys(sessionStorage).forEach(key => {
            if (key.includes('item_')) {
                let sessionItem = JSON.parse(sessionStorage.getItem(key)),
                    itemID = sessionItem.item,
                    rename = sessionItem.name,
                    amount = sessionItem.amount,
                    variant = sessionItem.variant;
                dataJSON.forEach(item => {
                    if (item.name == itemID) {
                        document.querySelector(".cart-items").innerHTML +=
                            `<li class="cart-item" min="0" max="${(item.purchaseLimit) ? item.purchaseLimit : defaultMax}" item="${itemID}" stack="${(item.stack != undefined) ? item.stack : 64}">
                                        <div class="cart-item-image-container">
                                            <img class="cart-item-image" src="${(variant) ? item.variants.find(itemVariant => itemVariant.variantName == variant).image : item.image
                                }" ${(
                                    !(
                                        (variant) ? item.variants.find(itemVariant => itemVariant.variantName == variant).image : item.image
                                    ).includes('+16x')
                                ) ? 'pixelated' : ''
                                }>
                                        </div>
                                        <div class="cart-item-name-container">
                                            <p class="cart-item-name">${(rename) ? rename : item.name}</p>
                                            <p class="cart-item-variant">${variant}</p>
                                        </div>
                                        <div class="item-counter">
                                            <span class="chevron chevron-up" onclick="cartAddToItem(this.parentNode.parentNode,1)"></span>
                                            <p class="item-count">${amount}</p>
                                            <span class="chevron chevron-down" onclick="cartAddToItem(this.parentNode.parentNode,-1)"></span>
                                        </div>
                                            <p>x</p>
                                            <p>$${(item.defCountCost > 1) ? item.defCost + '/' + item.defCountCost : item.defCost
                                }</p>
                                        <div class="cart-item-button-container">
                                            <span class="material-icons-round" desktop="" onclick="openPopup('${itemID}', '${(rename) ? rename : ''}', '${variant}')">launch</span>
                                            <span class="material-icons-round" onclick="cartAddToItem(this.parentNode.parentNode,-Number(this.parentNode.parentNode.querySelector('.item-count').innerHTML))">clear</span>
                                        </div>
                                    </li>`
                    }
                });
            };

        });
        onLoadSearch();
    });
}

function updateVariant() {
    let variant = document.getElementById('popup-type'),
        image = document.getElementById('popup-image'),
        variantImage = variant.selectedOptions[0].getAttribute('url');
    image.setAttribute('src', variantImage);
};

function mobileDesktopSync(mobile) {
    if (mobile) {
        document.querySelector(".search-desktop input").value = document.querySelector('.searchbar').value;
    } else {
        document.querySelector('.searchbar').value = document.querySelector(".search-desktop input").value;
    }
}

function filter(type) {
    let items = document.querySelectorAll('.item-li');

    switch (type) {
        case "search":
            let searchbar = document.querySelector(".searchbar"),
                search = searchbar.value.toLowerCase();

            items.forEach(item => {
                let itemName = item.querySelector('p').innerHTML.toLowerCase();
                if (search) {
                    if (itemName.indexOf(search) != -1) {
                        item.removeAttribute('searchHide');
                    } else {
                        item.setAttribute('searchHide', '');
                    };
                } else {
                    item.removeAttribute('searchHide');
                };
            })
            break;
        case "tags":
            let blockItem = selectedRadios["block/item"],
                vanillaDM = selectedRadios["vanilla/dm"],
                tags = selectedRadios["tags"];
            items.forEach(item => {
                let = itemTags = item.getAttribute('tags');

                item.removeAttribute('blockItemHide');
                item.removeAttribute('vanillaDMHide');
                item.removeAttribute('tagHide');

                if (blockItem != null && !blockItem.classList.contains('null-radio')) {
                    item.setAttribute('blockItemHide', '');
                    if (itemTags.includes(blockItem.id.split('radio-').pop())) {
                        item.removeAttribute('blockItemHide');
                    };
                }

                if (vanillaDM != null && !vanillaDM.classList.contains('null-radio')) {
                    item.setAttribute('vanillaDMHide', '');
                    if (itemTags.includes(vanillaDM.id.split('radio-').pop())) {
                        item.removeAttribute('vanillaDMHide');
                    };
                }

                if (tags != null && !tags.classList.contains('null-radio')) {
                    item.setAttribute('tagHide', '');
                    if (itemTags.includes(tags.id.split('radio-').pop())) {
                        item.removeAttribute('tagHide');
                    };
                }
            })
    }
}

function sortList(method) {
    let sortedItems = [];
    document.querySelectorAll(".item-li").forEach(item => {
        sortedItems.push(item);
    });
    document.querySelector(".items").innerHTML = '';

    sortedItems.sort(function(itemOne, itemTwo) {
        if (itemOne.querySelector('.item-title').innerHTML < itemTwo.querySelector('.item-title').innerHTML) return -1;
        if (itemOne.querySelector('.item-title').innerHTML > itemTwo.querySelector('.item-title').innerHTML) return 1;
        return 0;
    });

    switch (method) {
        case 'alphabetical':
            sortedItems.sort(function(itemOne, itemTwo) {
                if (itemOne.querySelector('.item-title').innerHTML < itemTwo.querySelector('.item-title').innerHTML) return -1;
                if (itemOne.querySelector('.item-title').innerHTML > itemTwo.querySelector('.item-title').innerHTML) return 1;
                return 0;
            });
            break;
        case 'lowToHigh':
            sortedItems.sort(function(itemOne, itemTwo) {
                if (Number(itemOne.getAttribute("baseCost")) < Number(itemTwo.getAttribute("baseCost"))) return -1;
                if (Number(itemOne.getAttribute("baseCost")) > Number(itemTwo.getAttribute("baseCost"))) return 1;
                return 0;
            });
            break;
        case 'highToLow':
            sortedItems.sort(function(itemOne, itemTwo) {
                if (Number(itemOne.getAttribute("baseCost")) > Number(itemTwo.getAttribute("baseCost"))) return -1;
                if (Number(itemOne.getAttribute("baseCost")) < Number(itemTwo.getAttribute("baseCost"))) return 1;
                return 0;
            });
            break;
    };

    sortedItems.forEach(item => {
        document.querySelector(".items").appendChild(item);
    });
};

function updatePopupPrice(amount, costNode) {
    costNode.innerHTML = Math.ceil(amount * costNode.getAttribute('costCalc'));
};

function checkDebt() {
    if (!sessionStorage.getItem('debtNotified')) {
        fetch("/fetch-unotified-debt", {
            method: "POST"
        }).then(res => res.json()).then(res => {
            if (res[0]) {
                alert(`You owe $${res[0]}`);
                sessionStorage.setItem('debtNotified', true);
            };
        });
    }
};

function onLoadSearch() {
    if (document.querySelector(".search-desktop input").value != '') {
        mobileDesktopSync(true);
        filter('search');
    } else if (document.querySelector('.searchbar').value != '') {
        mobileDesktopSync(false);
        filter('search');
    };
};