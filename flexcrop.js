const express = require("express"),
    app = express(),
    bodyParser = require("body-parser"),
    Database = require("fs-database"),
    db = new Database(__dirname + "/../../database/flexcrop"),
    // db = new Database(), // Use this for development
    dataJSON = require(__dirname + "/public/data/data.json"),
    Discord = require("discord.js"),
    bot = new Discord.Client(),
    cookieParser = require("cookie-parser"),
    https = require('https'),
    fs = require('fs');
require('dotenv').config();

/* 
    FOR DEVELOPERS:
        - ENVIRONMENTAL VARIABLES:
            - PORT: Port number for website
            - TOKEN: Discord Bot Token for Discord bot
            - MAINTENANCE_USER: When site is in maintenence, users with this key in their cookies retain access
        - CONSTANT VARIABLES:
            - runBot: Determines if the Discord will run
            - runWebsite: Determines if the site will run on PORT
*/
const runBot = true,
    runWebsite = true;

// Load website
{

    var minify = require('express-minify');
    var compression = require('compression');

    app.use(compression());
    app.use(minify({
        uglifyJsModule: require('uglify-js'),
    }));

    app.use(express.static(__dirname + "/public"));
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(cookieParser());

    if (runWebsite) {
        try {
            const httpsCertOptions = {
                key: fs.readFileSync('/cert/net/flexcrop/private.key.pem'),
                cert: fs.readFileSync('/cert/net/flexcrop/domain.cert.pem')
            }
            https.createServer(httpsCertOptions, app).listen(process.env.PORT, function() {
                console.log(`HTTPS RUNNING`);
            });
        } catch (err) {
            console.warn("Error running https; Running http");
            app.listen(process.env.PORT, function() {
                console.log(`HTTP RUNNING`);
            });
        }
    }

    setInterval(() => {
        db.list('user_').then(users => {
            users.forEach(key => {
                db.get(key).then(user => {
                    if (!user.banned && (!user.orders || !user.orders.length) && !user.suggestions.length)
                        db.delete(key);
                });
            });
        });
    }, 1000 * 60 * 60); // 1000 milliseconds - 1 second => 60 seconds - 1 minute => 60 minutes - 1 hour

}

// Pages 
{
    app.get("/LICENSE", (request, response) => {
        response.send(fs.readFileSync(__dirname + "/LICENSE"))
    });

    app.get("/", (request, response) => {
        checkBan(request, response, () => {
            db.get('data_maintenance').then(maintenanceBool => {
                if (maintenanceBool && !request.cookies[process.env.MAINTENANCE_USER]) {
                    response.send('Currently down for maintenance, come again later')
                } else
                    response.sendFile(__dirname + "/public/webpages/homepage/index.html")
            })
        });
    });

    app.get("/suggest", (request, response) => {
        checkBan(request, response, () => {
            db.get('data_maintenance').then(maintenanceBool => {
                if (maintenanceBool && !request.cookies[process.env.MAINTENANCE_USER]) {
                    response.send('Currently down for maintenance, come again later')
                } else
                    response.sendFile(__dirname + "/public/webpages/suggestion/index.html")
            })
        });
    });

    app.get("/apply", (request, response) => {
        response.sendFile(__dirname + "/public/webpages/apply/index.html")
    });

    app.get("/checkout", (request, response) => {
        checkBan(request, response, () => {
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

// Fetches
{
    app.post("/fetch-unotified-debt", function(request, response) {
        checkBan(request, response, () => {
            db.get(`user_${request.cookies._ufp}`).then(user => {
                response.send([user.debt]);
            });
        });
    });

    app.post("/fetch-suggest", function(request, response) {
        checkBan(request, response, () => {
            bot.channels.cache.get(dataJSON['Bot']['channels']['suggestions']).send(createSuggestion(request.body));
            editUser(request.cookies._ufp, 'suggestions', request.body.id);
        });
    });

    app.post("/fetch-order", function(request, response) {
        checkBan(request, response, () => {
            if (validateOrder(request.body)) {
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
                        db.set(`order_${JSON.parse(request.body.form).id}`, {
                            username: request.cookies.username,
                            location: msg.id,
                            items: items,
                            cost: parseCost(request.body),
                            print: request.cookies._ufp
                        });
                        response.send([1]);
                    });
            } else {
                editUser(request.cookies._ufp, 'banned', "An order you made has been flagged as 'suspicious' and will not be completed. If you think this is a mistake, contact FlexCrop's Web Administrator(s)")
                bot.channels.cache.get(dataJSON['Bot']['channels']['admin']).send(`\`\`\`json\n${JSON.stringify(request.body)}\`\`\``);
                response.send([2]);
            };

            editUser(request.cookies._ufp, 'orders', JSON.parse(request.body.form).id);

            db.get('data_usernameUpdate').then(value => {
                if (!value) value = [];
                let index = value.findIndex(usernames =>
                    usernames.newName == JSON.parse(request.body.form).username
                );
                if (index != -1)
                    value.splice(index, 1);
                db.set('data_usernameUpdate', value);
            })
        });
    });

    app.post("/fetch-ban", function(request, response) {
        db.get(`user_${request.cookies._ufp}`).then(user => {
            response.send([user.banned]);
        })
    });

    app.post("/fetch-leaderboard", function(request, response) {
        checkBan(request, response, () => {
            db.get('data_leaderboard').then(leaderboard => {
                response.send(leaderboard);
            });
        });
    });

    app.post("/fetch-supplies", function(request, response) {
        checkBan(request, response, () => {
            let tempArray = [];
            db.list('order_').then(orders => {
                orders.forEach(key => {
                    db.get(key).then(order => {
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
    });

    app.post("/fetch-supplied", function(request, response) {
        checkBan(request, response, () => {
            id = request.body.id,
                username = request.cookies.username;

            if (
                id[2] + id[5] + id[8] + id[11] == '1312' &&
                id.length == 12
            ) {
                db.get(`order_${id}`).then(value => {
                    let pay = Number(value.cost.toString().substr(-3)) + 1000,
                        updatedOrder = value;
                    updatedOrder.supplied = true;
                    bot.channels.cache.get(dataJSON['Bot']['channels']['supply']).send(`\`${username}\` claims they have completed \`${id}\` for $${pay}`);
                    db.set(`order_${id}`, updatedOrder);
                });
            }
        });
    });

    app.post("/fetch-employees", function(request, response) {
        checkBan(request, response, () => {
            let tempArray = [];
            db.list('employee_').then(employees => {
                employees.forEach(key => {
                    db.get(key).then(employee => {
                        tempArray.push(employee.username);
                    });
                });
            });
            setTimeout(() => {
                response.send(tempArray);
            }, 1000);
        });
    });

    app.post("/fetch-username-updates", function(request, response) {
        checkBan(request, response, () => {
            let tempArray = [];
            db.get('data_usernameUpdate').then(users => {
                if (users)
                    users.forEach(user => {
                        tempArray.push(user)
                    });
            });
            setTimeout(() => {
                response.send(tempArray);
            }, 1000);
        });
    });

}

// Helper Functions
{
    // Site 
    {
        function validateOrder(order) {
            let validated = true;
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
                                rename && item.nameLock ||
                                !varCheck ||
                                item.purchaseLimit && !(amount <= item.purchaseLimit) ||
                                item.stack != undefined && item.stack != stack
                            ) {
                                validated = false;
                            };
                        };
                    });
                    if (!itemCheck) {
                        validated = false;
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
                        validated = false;
                    };
                };
            });
            return validated;
        };

        function parseCost(order) {
            let stacks = 0,
                items = 0,
                total = 0;
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

        function createOrder(order) {
            if (validateOrder(order)) {
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

        function createSuggestion(suggestData) {
            return formatMessage('suggestion', {
                uuid: suggestData.id,
                user: suggestData.username,
                suggestion: suggestData.suggestion
            })
        };

        function checkBan(request, response, callback) {
            db.get(`user_${request.cookies._ufp}`).then(user => {
                try {
                    if (!user.banned) {
                        callback();
                    } else {
                        response.sendFile(__dirname + "/public/webpages/forbidden/index.html");
                    };
                } catch (err) {
                    db.set(`user_${request.cookies._ufp}`, {
                        "debt": 0,
                        "suggestions": [],
                        "orders": [],
                        "banned": ""
                    });
                    callback();
                };
            });
        };

        function editUser(userid, key, value) {
            db.get(`user_${userid}`).then(user => {
                if (typeof(user[key]) == 'object') {
                    user[key].push(value);
                } else {
                    user[key] = value;
                };
                db.set(`user_${userid}`, user);
            }).catch(() => {
                db.set(`user_${userid}`, {
                    [key]: value
                })
            });
        };
    }

    // Bot Code
    {
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
            };
        };
    }
}

// Start bots 
{
    if (runBot) require(__dirname + '/bot-code');
    if (runBot) bot.login(process.env.TOKEN);
}