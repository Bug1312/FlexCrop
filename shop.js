const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    Database = require("fs-database"),
    dataJSON = require(__dirname + "/public/data/data.json"),
    Discord = require("discord.js"),
    bot = new Discord.Client(),
    cookieParser = require("cookie-parser"),
    https = require('https'),
    fs = require('fs'),
    minify = require('express-minify'),
    compression = require('compression');
require('dotenv').config();

class ShopSite {
    constructor(options = {}) {
        // Defaults
        this.name = "ShopSite";
        this.runBot = false;
        this.runSite = false;
        this.database = new Database();
        this.port = 8001;
        this.userClear = 1000 * 60 * 60; // 1000 milliseconds - 1 second => 60 seconds - 1 minute => 60 minutes
        this.cert;

        this.#clearUnusedDatabase;
        this.#runSite;
        this.#runBot;
        this.#runBoth;
        this.#setupSite;
        this.#setupPages;
        this.#setupBotFetches;
        this.#setupSiteFetches;

        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });
    }

    run() {
        if (this.runSite) this.#runSite();
        if (this.runBot) this.#runBot();
        if (this.runBot && this.runSite) this.#runBoth();

        setInterval(() => this.#clearUnusedDatabase(), this.userClear);
    }

    #runSite() {
        this.#setupSite();
        this.#setupPages();
        this.#setupSiteFetches();
    }

    #runBot() {
        new(require(__dirname + '/bot-code'))({
            database: this.database
        });
    }

    #runBoth() {
        this.#setupBotFetches();
        bot.login(process.env.TOKEN_SHOP);
    }

    #clearUnusedDatabase() {
        this.database.list('user_').then(users => {
            users.forEach(key => {
                this.database.get(key).then(user => {
                    if (!user.banned && (!user.orders || !user.orders.length) && !user.suggestions.length)
                        this.database.delete(key);
                });
            });
        });
    }

    #setupSite() {
        app.use(compression());
        app.use(minify({
            uglifyJsModule: require('uglify-js')
        }));
        app.use(cookieParser());
        app.use(express.static(__dirname + "/public"));
        app.use(bodyParser.urlencoded({
            extended: true
        }));
        app.use(bodyParser.json());

        try {
            if (this.cert == null) return ErrorEvent;
            https.createServer(this.cert, app).listen(this.port, () => {
                console.log(`${this.name} : HTTPS RUNNING`);
            });
        } catch (err) {
            console.warn(`${this.name} : Error running https; Attempting http...`);
            app.listen(this.port, () => {
                console.log(`${this.name} : HTTP RUNNING`);
            });
        }
    }

    #setupPages() {
        let database = this.database;

        app.get("/LICENSE", (request, response) => {
            response.send(fs.readFileSync(__dirname + "/LICENSE"))
        });

        app.get("/", (request, response) => {
            checkInfo(database, request, response, () => {
                response.sendFile(__dirname + "/public/webpages/homepage/index.html");
            });
        });

        app.get("/suggest", (request, response) => {
            checkInfo(database, request, response, () => {
                response.sendFile(__dirname + "/public/webpages/suggestion/index.html")
            });
        });

        app.get("/apply", (request, response) => {
            response.sendFile(__dirname + "/public/webpages/apply/index.html")
        });

        app.get("/checkout", (request, response) => {
            checkInfo(database, request, response, () => {
                response.sendFile(__dirname + "/public/webpages/checkout/index.html")
            });
        });

        app.get("/economy", (request, response) => {
            response.sendFile(__dirname + "/public/webpages/economy/index.html")
        });

        app.get("/terms", (request, response) => {
            response.sendFile(__dirname + "/public/webpages/terms/index.html")
        });

        app.get("/reload", (request, response) => {
            response.sendFile(__dirname + "/public/webpages/reload/index.html")
        });

        app.get("/employees", (request, response) => {
            response.sendFile(__dirname + "/public/webpages/employees/index.html")
        });
    }

    #setupBotFetches() {
        let database = this.database;

        app.post("/fetch-suggest", function(request, response) {
            checkInfo(database, request, response, () => {
                bot.channels.cache.get(dataJSON['Bot']['channels']['suggestions']).send(formatMessage('suggestion', {
                    uuid: request.body.id,
                    user: request.body.username,
                    suggestion: request.body.suggestion
                }));
                editUser(database, request.cookies._ufp, 'suggestions', request.body.id);
            });
        });

        app.post("/fetch-order", function(request, response) {
            checkInfo(database, request, response, () => {
                if (verify(request.body)) {
                    let items = [];
                    Object.keys(request.body).filter(key => key.includes('item_')).forEach(item => {
                        let orderItem = JSON.parse(request.body[item]);
                        items.push({
                            item: orderItem.item,
                            variant: orderItem.variant,
                            amount: orderItem.amount
                        });
                    });
                    if (items.length)
                        bot.channels.cache.get(dataJSON['Bot']['channels']['onlineOrders']).send(createOrder(request.body)).then(msg => {
                            database.set(`order_${JSON.parse(request.body.form).id}`, {
                                username: request.cookies.username,
                                location: msg.id,
                                items: items,
                                cost: parseCost(request.body),
                                print: request.cookies._ufp
                            });
                            response.send([1]);
                        });
                } else {
                    editUser(database, request.cookies._ufp, "banned", "An order you made has been flagged as 'suspicious' and will not be completed. If you think this is a mistake, contact FlexCrop's Web Administrator(s)")
                    response.send([2]);
                    bot.channels.cache.get(dataJSON['Bot']['channels']['admin']).send(`\`\`\`json\n${JSON.stringify(request.body)}\`\`\``);
                };
                setTimeout(() => {
                    editUser(database, request.cookies._ufp, 'orders', JSON.parse(request.body.form).id)
                }, 20);

                database.get('data_usernameUpdate').then(value => {
                    if (!value) value = [];
                    let index = value.findIndex(usernames =>
                        usernames.newName == JSON.parse(request.body.form).username
                    );
                    if (index != -1)
                        value.splice(index, 1);
                    database.set('data_usernameUpdate', value);
                })
            });
        });
    }

    #setupSiteFetches() {
        let database = this.database;

        app.post("/fetch-unotified-debt", function(request, response) {
            database.get(`user_${request.cookies._ufp}`).then(user => {
                response.send([user.debt]);
            });
        });

        app.post("/fetch-ban", function(request, response) {
            database.get(`user_${request.cookies._ufp}`).then(user => {
                response.send([user.banned]);
            })
        });

        app.post("/fetch-leaderboard", function(request, response) {
            database.get('data_leaderboard').then(leaderboard => {
                response.send(leaderboard);
            });
        });

        app.post("/fetch-supplies", function(request, response) {
            let tempArray = [];
            database.list('order_').then(orders => {
                orders.forEach(key => {
                    database.get(key).then(order => {
                        if (request.cookies.username != 'undefined' && order.username != request.cookies.username && !order.supplied) {
                            tempArray.push({
                                id: key.replace('order_', ''),
                                items: order.items,
                                cost: order.cost
                            });
                        };
                    });
                });
            });
            setTimeout(() => {
                response.send(tempArray);
            }, 2000);
        });

        app.post("/fetch-supplied", function(request, response) {
            id = request.body.id,
                username = request.cookies.username;

            if (
                id[2] + id[5] + id[8] + id[11] == '1312' &&
                id.length == 12
            ) {
                database.get(`order_${id}`).then(value => {
                    let pay = Number(value.cost.toString().substr(-3)) + 1000,
                        updatedOrder = value;
                    updatedOrder.supplied = true;
                    bot.channels.cache.get(dataJSON['Bot']['channels']['supply']).send(`\`${username}\` claims they have completed \`${id}\` for $${pay}`);
                    database.set(`order_${id}`, updatedOrder);
                });
            }
        });

        app.post("/fetch-employees", function(request, response) {
            let tempArray = [];
            database.list('employee_').then(employees => {
                employees.forEach(key => {
                    database.get(key).then(employee => {
                        tempArray.push(employee.username);
                    });
                });
            });
            setTimeout(() => {
                response.send(tempArray);
            }, 1000);
        });

        app.post("/fetch-username-updates", function(request, response) {
            let tempArray = [];
            database.get('data_usernameUpdate').then(users => {
                if (users)
                    users.forEach(user => {
                        tempArray.push(user)
                    });
            });
            setTimeout(() => {
                response.send(tempArray);
            }, 1000);
        });

        app.post("/fetch-site-data", function(request, response) {
            database.get('data_site').then(data => {
                response.send(data);
            })
        });
    }


}

function checkInfo(database, request, response, callback = new Function(), stopBans = true, stopMaintenance = true) {
    database.get('data_site').then(data => {
        if (!data) {
            data = {
                maintenance: false,
                message: "",
                warning: ""
            }
            database.set('data_site', data);
        };

        database.get(`user_${request.cookies._ufp}`).then(user => {
            if (stopBans && !(user.banned == undefined || user.banned.length == 0)) {
                response.sendFile(__dirname + "/public/webpages/forbidden/index.html");
                return;
            }
            if (stopMaintenance && data.maintenance) {
                response.send("This site is currently under maintenance");
                return;
            }
            callback();
        }).catch(err => {
            createUser(database, request.cookies._ufp);
            if (stopMaintenance && data.maintenance) response.send("This site is currently under maintenance");
            callback();
        });
    });
}

function createUser(database, fingerprint, data = {}) {
    newData = {
        debt: 0,
        suggestions: [],
        orders: [],
        banned: ""
    };
    Object.keys(data).forEach(key => newData[key] = data[key]);

    database.set(`user_${fingerprint}`, newData);
}

function editUser(database, userid, key, value) {
    database.get(`user_${userid}`).then(user => {
        if (typeof(user[key]) == 'object') user[key].push(value);
        else user[key] = value;
        database.set(`user_${userid}`, user);
    }).catch((err) => {
        createUser(database, userid, {
            [key]: value
        });
    });
};

function formatMessage(type, data = {}) {
    switch (type) {
        case 'order':
            return `\`\`\`${data.uuid}\`\`\`\n\`${data.user}\` want's to buy\nwith an overall price: $\`${data.total}\`\n\n${data.items.join('\n')}\n\n${(data.giftBoolean) ? `for \`${data.giftee}\`\n` : ''}Via ${data.deliveryType}\n${(data.location) ? `${data.location}\n` : ''}${(data.note) ? `With the note "${data.note}"` : 'With no note'}\n\`\`\` \`\`\``;
        case 'suggestion':
            return `\`\`\`${data.uuid}\`\`\`\n\`${data.user}\` made a suggestion!\n\n\`\`\`${data.suggestion}\`\`\``;
        case 'item':
            return `${data.itemID}${(data.variant) ? `( ${data.variant} )` : ''}${(data.rename) ? `{ \`${data.rename}\` }` : ''}#${data.amount}`;
        case 'newName':
            return `${data.userid} has logged in with a new name. All names : \n${data.names}`
        case 'default':
            console.error(`${this.name} : Error formatting message, '${type}' is not a valid type`);
    };
};

function verify(order) {
    let valid = true;
    Object.keys(order).forEach(key => {
        if (key.includes('item_')) {
            let orderItem = JSON.parse(order[key]),
                itemID = orderItem.item,
                rename = orderItem.name,
                amount = orderItem.amount,
                variant = orderItem.variant,
                stack = orderItem.stack,
                itemCheck;
            dataJSON['Items'].forEach(item => {
                if (item.name == itemID) {
                    let varCheck;
                    itemCheck = true;
                    if (item.variants) {
                        item.variants.forEach(itemVariant => {
                            if (itemVariant.variantName == variant) {
                                varCheck = true;
                            };
                        });
                    } else {
                        varCheck = true;
                    }
                    if (
                        Math.ceil(amount) != amount ||
                        rename && item.nameLock ||
                        !varCheck ||
                        item.purchaseLimit && !(amount <= item.purchaseLimit) ||
                        item.stack != undefined && item.stack != stack
                    ) {
                        valid = false;
                    };
                };
            });
            if (!itemCheck) {
                valid = false;
            };
        };
        if (key == 'form') {
            let form = JSON.parse(order[key]),
                delivCheck;
            dataJSON['DeliveryTypes'].forEach(deliveryType => {
                if (deliveryType.name == form.deliveryType) {
                    delivCheck = true;
                };
            })
            if (
                form.id[2] + form.id[5] + form.id[8] + form.id[11] != '1312' ||
                form.id.indexOf(/[^\d\p{L}]/gu) > -1 ||
                form.id.length != 12 ||
                !delivCheck
            ) {
                valid = false;
            };
        };
    });
    return valid;
};

function createOrder(order) {
    if (verify(order)) {
        let form = JSON.parse(order.form),
            data = {
                uuid: form.id,
                user: form.username,
                total: parseCost(order),
                items: [],
                giftBoolean: form.giftBoolean,
                giftee: form.giftee,
                deliveryType: form.deliveryType,
                location: form.location,
                note: form.note,
            };

        Object.keys(order).filter(key => key.includes('item_')).forEach(item => {
            let orderItem = JSON.parse(order[item]);
            data.items.push(
                formatMessage('item', {
                    itemID: orderItem.item,
                    variant: orderItem.variant,
                    rename: orderItem.name,
                    amount: orderItem.amount,
                })
            );
        });
        return formatMessage('order', data);
    };
};

function parseCost(order) {
    let stacks = 0,
        items = 0,
        total = 0;

    function calculate(string, stack = 0, item = 0) {
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
    };

    Object.keys(order).forEach(key => {
        if (key.includes('item_')) {
            let orderItem = JSON.parse(order[key]),
                itemID = orderItem.item,
                amount = orderItem.amount,
                stack = orderItem.stack;
            dataJSON['Items'].forEach(item => {
                if (item.name == itemID) {
                    let itemCost, itemTotal;
                    if (item.defCountCost > 1) {
                        itemCost = item.defCost + '/' + item.defCountCost;
                        itemTotal = Math.ceil(amount * item.defCost / item.defCountCost);
                    } else {
                        itemCost = item.defCost;
                        itemTotal = amount * itemCost;
                    }
                    total += itemTotal;
                    if (Number(stack) != 0) {
                        stacks += Number(Math.ceil(Number(amount) / Number(stack)));
                    };
                    if (stack < 1) {
                        items += 1 / Number(stack) * Number(amount);
                    } else {
                        items += Number(amount);
                    }
                };
            });
        };
    });
    dataJSON['DeliveryTypes'].forEach(deliveryType => {
        if (deliveryType.name == JSON.parse(order.form).deliveryType) {
            total += calculate(deliveryType.formula, stacks, items);
        };
    });
    return total;
};

module.exports = ShopSite;