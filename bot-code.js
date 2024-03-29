const Discord = require("discord.js"),
    bot = new Discord.Client(),
    Database = require("fs-database"),
    dataJSON = require("./public/data/data.json"),
    botJSON = dataJSON["Bot"],
    serverUtils = require("minecraft-server-util");
require('dotenv').config();

class ShopBot {
    constructor(options = {}) {
        // Defaults
        this.name = "ShopBot";
        this.database = new Database();

        this.#run;

        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });

        this.#run(this);
    }

    #run(overall) {
        bot.on("ready", () => {
            console.log(`${overall.name} : BOT STARTED AT`, new Date());

            /* 
            // Stopped working for some reason?
            setInterval(() => {
                overall.database.get("data_watched").then(watchedUsers => {
                    if (watchedUsers.length)
                        serverUtils.queryFull('dmu.swdteam.co.uk', {
                            port: 25587
                        })
                        .then((response) => {
                            if (!response) return;
                            let players = response.players;
                            watchedUsers.forEach(data => {
                                let playerIndex = players.findIndex(player => player.toLowerCase() == data.player) != -1
                                if (playerIndex != -1) {
                                    bot.channels.cache.get(botJSON['channels']['botUsage']).send(formatMessage('userJoin', {
                                        employee: data.employee,
                                        player: players[playerIndex]
                                    }));
                                    watchedUsers.splice(watchedUsers.indexOf(data), 1);
                                }
                            });
                            overall.database.set("data_watched", watchedUsers);
                        })
                })
            }, 1000 * 60 * 5)
            */
        });

        bot.on("message", message => {
            let adminBoolean = (botJSON['users']['admins'].indexOf(message.author.id) > -1) ? true : false,
                lowercaseMsg = message.content.toLowerCase().replace(botJSON['prefix'], ''),
                args = lowercaseMsg.replace(botJSON['prefix'], '').match(/\S+/g),
                originalCaseArgs = message.content.replace(botJSON['prefix'], '').replace(botJSON['prefix'], '').match(/\S+/g);
            if (message.channel == bot.channels.cache.get(botJSON['channels']['botUsage']) && message.content[0] == botJSON['prefix']) {
                if (adminBoolean) {
                    switch (args[0]) {
                        case 'pay':
                            let paydbKey = `employee_${args[1]}`,
                                unpaid = (args[2]) ? args[2] : Infinity;
                            overall.database.get(paydbKey).then(employee => {
                                if (unpaid == Infinity)
                                    employee.unpaid = 0
                                else
                                    employee.unpaid -= unpaid;
                                overall.database.set(paydbKey, employee);
                            });
                            break;
                        case 'employee':
                            let employeedbKey = `employee_${args[2]}`;
                            switch (args[1]) {
                                case 'edit':
                                    overall.database.get(employeedbKey).then(employee => {
                                        let newValue = originalCaseArgs[4];
                                        if (!isNaN(args[4]))
                                            newValue = Number(args[4]);
                                        else if (args[4].toLowerCase() == 'true')
                                            newValue = true;
                                        else if (args[4].toLowerCase() == 'false')
                                            newValue = false;
                                        if (args[3].includes('.')) {
                                            let parent = args[3].substring(args[3].indexOf('.'), -Infinity),
                                                child = args[3].substring(args[3].indexOf('.') + 1);
                                            employee[parent][child] = newValue;
                                        } else {
                                            employee[args[3]] = newValue;
                                        };
                                        overall.database.set(employeedbKey, employee);
                                    }).then(() => {
                                        message.channel.send('Edited')
                                    });
                                    break;
                                case 'add':
                                    let newEmployeeObject = botJSON['defaultEmployee'];
                                    newEmployeeObject.username = originalCaseArgs[3];
                                    overall.database.set(employeedbKey, newEmployeeObject).then(() => {
                                        message.channel.send('Added')
                                    });
                                    break;
                                case 'remove':
                                    overall.database.delete(employeedbKey).then(() => {
                                        message.channel.send('Removed')
                                    }).catch(err => {
                                        message.channel.send('Invalid ID')
                                    });
                                    break;
                                case 'stats':
                                    overall.database.get(employeedbKey).then(employee => {
                                        if (args[3].includes('.')) {
                                            let parent = args[3].substring(args[3].indexOf('.'), -Infinity),
                                                child = args[3].substring(args[3].indexOf('.') + 1);
                                            message.channel.send(employee[parent][child]);
                                        } else {
                                            message.channel.send(employee[args[3]]);
                                        }
                                    });
                                    break;
                                default:
                                    message.channel.send('You need a valid parameter: edit, add, remove, stats');
                                    break;
                            };
                            break;
                        case 'remove':
                            if (!args[1] || !overall.database.get(`order_${args[1]}`)) {
                                message.channel.send('You need a valid order ID to complete an order')
                            } else {
                                completeOrder(overall, args[1], message.author.id, true);
                            };
                            break;
                        case 'month':
                            overall.database.list('employee_').then(employees => {
                                employees.forEach(dbKey => {
                                    overall.database.get(dbKey).then(employee => {
                                        employee.eotm = false;
                                        employee.money.month = 0;
                                        employee.money.month_pays = 0;
                                        overall.database.set(dbKey, employee);
                                    });
                                });
                            }).then(() => {
                                message.channel.send('New month initiated')
                            })
                            break;
                        case 'mm':
                            overall.database.get('data_site').then(data => {
                                data.maintenance = !(data.maintenance);
                                overall.database.set('data_site', data);
                            }).then(() => {
                                message.channel.send('Maintenance Mode Toggled')
                            })
                            break;
                        case 'customlog':
                            if (!args[1] || !args[2] || !args[3] || !args[4]) {
                                message.channel.send('Command Usage: !customlog <OrderID> <MessageID> <EmployeeID> <Debtor> ["removed"]');
                            } else
                                bot.channels.cache.get(botJSON['channels']['orderLog']).send(formatMessage('log', {
                                    id: args[1],
                                    msgID: args[2],
                                    employee: `<@!${args[3]}>`,
                                    action: args[5] == 'removed' ? 'Removed' : 'Completed',
                                    debtor: args[4]
                                }));
                            break;
                        case 'name':
                            overall.database.get('data_usernameUpdate').then(value => {
                                if (!value) value = [];
                                overall.database.set('data_usernameUpdate', value);
                            });
                            switch (args[1]) {
                                case 'new':
                                    if (!args[2] || !args[3]) {
                                        message.channel.send('Command Usage: !name new <OldUserName> <NewUserName>');
                                    } else
                                        overall.database.get('data_usernameUpdate').then(value => {
                                            value.push({
                                                oldName: originalCaseArgs[2],
                                                newName: originalCaseArgs[3]
                                            });
                                            overall.database.set('data_usernameUpdate', value);
                                            message.channel.send('Username Updated');
                                        });
                                    overall.database.list('employee_').then(employees => {
                                        employees.forEach(employeedbKey => {
                                            overall.database.get(employeedbKey).then(employee => {
                                                if (employee.username.toLowerCase() == args[2]) {
                                                    employee.username = originalCaseArgs[3];
                                                    overall.database.set(employeedbKey, employee);
                                                    message.channel.send('Employee Username Updated');
                                                }
                                            })
                                        })
                                    })
                                    break;
                                case 'remove':
                                    if (!args[2]) {
                                        message.channel.send('Command Usage: !name remove <UserName>');
                                    } else {
                                        overall.database.get('data_usernameUpdate').then(value => {
                                            let index = value.findIndex(usernames =>
                                                usernames.newName.toLowerCase() == args[2]
                                            );
                                            if (index != -1) {
                                                value.splice(index, 1);
                                                message.channel.send('Username Removed');
                                            } else {
                                                message.channel.send('Username Not Found');
                                            }
                                            overall.database.set('data_usernameUpdate', value);
                                        });
                                    }
                                    break;
                                default:
                                    message.channel.send('Please select an option: new | remove');
                                    break;
                            }

                            break;
                        case 'confirm':
                            overall.database.get('data_debt').then(debtors => {
                                if (!debtors) debtors = {};
                                if (!args[1]) {
                                    message.channel.send('You need a valid order ID');
                                } else {
                                    Object.keys(debtors).forEach(key => {
                                        if (debtors[key][args[1]]) {
                                            debt = debtors[key][args[1]];
                                            delete debtors[key][args[1]];
                                            if (!Object.keys(debtors[key]).length) {
                                                delete debtors[key];
                                            };
                                        };
                                    });
                                    if (!debt) {
                                        message.channel.send('You need a valid order ID');
                                    } else {
                                        message.channel.send('Payment Confirmed');
                                    };
                                };
                                overall.database.set('data_debt', debtors);
                            });
                            break;
                        case 'cleardebt':
                            overall.database.get('data_debt').then(debtors => {
                                if (!debtors) debtors = {};
                                if (!args[1] || !Object.keys(debtors).filter(debtor => debtor.toLowerCase() == args[1])) {
                                    message.channel.send('You need a valid username');
                                } else {
                                    delete debtors[Object.keys(debtors).filter(debtor => debtor.toLowerCase() == args[1])[0]];
                                    message.channel.send('Debt Removed');
                                };
                                overall.database.set('data_debt', debtors);
                            });
                            break;
                        case 'prepay':
                            overall.database.get(`order_${args[1]}`).then(order => {
                                if (!order) {
                                    message.channel.send('You need a valid order ID to prepay an order')
                                } else {
                                    order.prepayed = true;
                                    overall.database.set(`order_${args[1]}`, order);

                                    bot.channels.cache.get(botJSON['channels']['onlineOrders']).messages.fetch({
                                        around: order.location,
                                        limit: 1
                                    }).then(msgs => {
                                        msgs.first().react('🅿️')
                                    });

                                    message.channel.send('Order prepayed');
                                };
                            });
                            break;
                        case 'msg':
                            overall.database.get('data_site').then(data => {
                                if (!args[1] || !(args[1] == "message" || args[1] == "msg" || args[1] == "warn" || args[1] == "warning")) message.channel.send('You need a message type');
                                else if (args[1] == "message" || args[1] == "msg") {
                                    data.message = originalCaseArgs[2];
                                } else if (args[1] == "warn" || args[1] == "warning") {
                                    data.warning = originalCaseArgs[2];
                                }
                                overall.database.set('data_site', data);
                            });
                            break;
                    };
                };
                switch (args[0]) {
                    case 'list':
                        let tempArrayList = [];
                        overall.database.list('order_').then(matches => {
                            matches.forEach(dbKey => {
                                overall.database.get(dbKey).then(order => {
                                    tempArrayList.push(formatMessage('undoneOrder', {
                                        orderID: dbKey.replace('order_', ''),
                                        msgID: order.location
                                    }));
                                });
                            })
                        }).then(() => {
                            setTimeout(() => {
                                console.log(tempArrayList)
                                if (tempArrayList.length > 13) {
                                    tempArrayList.join('?').match(/.{1,1957}/gm).forEach(msg => {
                                        message.channel.send(msg.replace(/\?/g, '\n'));
                                    });
                                } else
                                    message.channel.send((tempArrayList.toString()) ? tempArrayList.join('\n') : 'No orders left to complete!')
                            }, 500)
                        });
                        break;
                    case 'complete':
                        if (!args[1]) {
                            message.channel.send('You need a valid order ID to complete an order')
                        } else {
                            overall.database.get(`order_${args[1]}`).then(order => {
                                if (order)
                                    completeOrder(overall, args[1], message.author.id, false, (args[2] && args[2] == 'true') ? true : false);
                                else
                                    message.channel.send('You need a valid order ID to complete an order')
                            })
                        };
                        break;
                    case 'payments':
                        let tempArrayPayments = [];
                        overall.database.list('employee_').then(employees => {
                            employees.forEach(dbKey => {
                                overall.database.get(dbKey).then(employee => {
                                    if (employee.unpaid) {
                                        tempArrayPayments.push(formatMessage('payUser', {
                                            employeeID: employee.username,
                                            payments: employee.unpaid
                                        }));
                                    };
                                });
                            });
                        }).then(() => {
                            setTimeout(() => {
                                message.channel.send((tempArrayPayments.toString()) ? tempArrayPayments.join('\n') : 'No payments left to complete!')
                            }, 300)
                        })
                        break;
                    case 'stats':
                        overall.database.get(`employee_${message.author.id}`).then(employee => {
                            message.reply(`you have completed ${employee.orders} order(s)\nand have a score of ${(employee.money.month_pays * 10000) + employee.money.month}`);
                        });
                        break;
                    case 'leaderboard':
                        let tempArrayEmployees = [];
                        overall.database.list('employee_').then(employees => {
                            employees.forEach(dbKey => {
                                overall.database.get(dbKey).then(employee => {
                                    if (!employee.dont_pay)
                                        tempArrayEmployees.push({
                                            employee: employee.username,
                                            score: (employee.money.month_pays * 10000) + employee.money.month
                                        })
                                });
                            });
                        }).then(() => {
                            setTimeout(() => {
                                tempArrayEmployees.sort((employeeOne, employeeTwo) => {
                                    if (employeeOne.score > employeeTwo.score) return -1;
                                    if (employeeOne.score < employeeTwo.score) return 1;
                                    return 0;
                                });
                                for (let i = 0; i < tempArrayEmployees.length; i++) {
                                    let employee = tempArrayEmployees[i],
                                        newValue = `\`${employee.employee}\` - ${employee.score}`;
                                    tempArrayEmployees[i] = newValue;
                                };
                                message.channel.send((tempArrayEmployees.toString()) ? tempArrayEmployees.join('\n') : 'Error: Delay in connection or No employees have completed orders');
                            }, 800)
                        });
                        break;
                    case 'transfer':
                        overall.database.get('data_debt').then(debtors => {
                            let debt;
                            if (!debtors) debtors = {};
                            if (!args[1]) {
                                message.channel.send('You need a valid order ID');
                            } else {
                                Object.keys(debtors).forEach(key => {
                                    if (debtors[key][args[1]]) {
                                        debt = debtors[key][args[1]];
                                        delete debtors[key][args[1]];
                                        if (!Object.keys(debtors[key]).length) {
                                            delete debtors[key];
                                        };
                                    };
                                });
                                if (!debt) {
                                    message.channel.send('You need a valid order ID');
                                } else {
                                    overall.database.get(`employee_${message.author.id}`).then(employee => {
                                        if (!debtors[employee.username]) {
                                            let newDebtor = {};
                                            newDebtor[args[1]] = debt;
                                            debtors[employee.username] = newDebtor;
                                        } else
                                            debtors[employee.username][args[1]] = debt;
                                        message.channel.send(`Debt of $${debt} transferred to you`);
                                    });
                                };
                            };
                            setTimeout(() => {
                                overall.database.set('data_debt', debtors);
                            }, 100);
                        });
                        break;
                    case 'debt':
                        overall.database.get('data_debt').then(debtors => {
                            if (!debtors) debtors = {};
                            switch (args[1]) {
                                case 'me': // Employee
                                    overall.database.get(`employee_${message.author.id}`).then(employee => {
                                        if (!debtors || !debtors[employee.username])
                                            message.channel.send("You do not owe anything");
                                        else {
                                            let debt = 0;
                                            Object.keys(debtors[employee.username]).forEach(key => {
                                                debt += debtors[employee.username][key];
                                            });
                                            message.channel.send(`\`${employee.username}\` owes $${debt} for these orders:\n${Object.keys(debtors[employee.username]).join(' ')}`);
                                        }
                                    });
                                    break;
                                case undefined: // All users
                                    if (!debtors) {
                                        message.channel.send(`Nobody owes anything!`);
                                    } else {
                                        let list = [];
                                        Object.keys(debtors).forEach(debtor => {
                                            let debt = 0;
                                            Object.keys(debtors[debtor]).forEach(key => {
                                                debt += debtors[debtor][key];
                                            });
                                            list.push(`\`${debtor}\` - $${debt}`)
                                        })
                                        message.channel.send(`These people owe FlexCrop:\n${list.join('\n')}`);
                                    }
                                    break;
                                default: //Specific user
                                    let debt = 0,
                                        searchResult = Object.keys(debtors).filter(debtor => debtor.toLowerCase() == args[1]);
                                    if (searchResult.length) {
                                        Object.keys(debtors[searchResult[0]]).forEach(key => {
                                            debt += debtors[searchResult[0]][key];
                                        });
                                        message.channel.send(`\`${searchResult[0]}\` owes $${debt} for these orders:\n${Object.keys(debtors[searchResult[0]]).join(' ')}`);
                                    } else {
                                        message.channel.send("This user does not owe anything");
                                    }
                                    break;
                            }
                        });
                        break;
                    case 'ping':
                        message.channel.send(`Ping is \`${Date.now() - message.createdTimestamp}ms\``);
                        break;
                        /*case 'watch':
                            overall.database.get("data_watched").then(watchedUsers => {
                                if (!watchedUsers)
                                    watchedUsers = [];

                                watchedUsers.push({
                                    employee: message.author.id,
                                    player: args[1]
                                })

                                overall.database.set("data_watched", watchedUsers);

                                message.channel.send("Player added to watchlist");

                            })
                            break;*/
                        // Admin perms
                    case 'pay':
                    case 'employee':
                    case 'remove':
                    case 'month':
                    case 'mm':
                    case 'customlog':
                    case 'name':
                    case 'confirm':
                    case 'cleardebt':
                    case 'prepay':
                    case 'msg':
                        if (!adminBoolean) message.reply("You don't have access to that command!");
                        break;
                    default:
                        message.channel.send("That's not a command!");
                        break;
                };
            };
        });

        bot.on("raw", event => {
            if (event.t == "GUILD_MEMBER_REMOVE") {
                if (event.d.guild_id == dataJSON['Bot']['servers']['flexcrop']) {
                    bot.channels.cache
                        .get(dataJSON['Bot']['channels']['leave-join'])
                        .send(
                            "<@" +
                            event.d.user.id +
                            "> / " +
                            event.d.user.username +
                            "#" +
                            event.d.user.discriminator +
                            " has left the server."
                        );
                }
            }
        });

        bot.login(process.env.TOKEN_SHOP);

    }
}

function completeOrder(overall, orderID, employeeID, remove = false, employeeDebt = false) {
    overall.database.get(`order_${orderID}`).then(order => {
        if (order.location == undefined || order.location == 'undefined')
            bot.channels.cache.get(botJSON['channels']['admin']).send(`${orderID} had an undefined location`);
        bot.channels.cache.get(botJSON['channels']['orderLog']).send(formatMessage('log', {
            id: orderID,
            msgID: order.location,
            action: remove ? 'Removed' : 'Completed',
            employee: `<@!${bot.users.cache.get(employeeID).id}>`,
            debtor: (employeeDebt || remove) ? `<@!${bot.users.cache.get(employeeID).id}>` : order.username
        }));
        bot.channels.cache.get(botJSON['channels']['onlineOrders']).messages.fetch({
            around: order.location,
            limit: 1
        }).then(msgs => {
            if (remove) {
                msgs.first().react('❌')
            } else {
                msgs.first().react('✅')
            };
        });
    }).then(() => {
        overall.database.get(`order_${orderID}`).then(order => {
            overall.database.get(`employee_${employeeID}`).then(employee => {
                if (!remove) {
                    employee.orders++;
                    employee.money.overall += order.cost;
                    employee.money.month += order.cost;
                    employee.money.past_ten += order.cost;
                    if (employee.orders % 10 == 0) {
                        if (!employee.dont_pay) {
                            let wage = (employee.eotm) ? 13000 : 10000
                            employee.unpaid += Math.ceil(wage + ((employee.money.past_ten > wage + 5000) ? (employee.money.past_ten - wage) * 0.2 : 0));
                        }
                        employee.money.month_pays++;
                        employee.money.past_ten = 0;
                    };
                    if (!order.prepayed)
                        overall.database.get('data_debt').then(debtors => {
                            if (!debtors) debtors = {};
                            if (employeeDebt) {
                                if (!debtors[employee.username]) {
                                    let newDebtor = {};
                                    newDebtor[orderID.toLowerCase()] = order.cost;
                                    debtors[employee.username] = newDebtor;
                                } else {
                                    debtors[employee.username][orderID.toLowerCase()] = order.cost;
                                }
                            } else {
                                if (!debtors[order.username]) {
                                    let newDebtor = {};
                                    newDebtor[orderID.toLowerCase()] = order.cost;
                                    debtors[order.username] = newDebtor;
                                } else {
                                    debtors[order.username][orderID.toLowerCase()] = order.cost;
                                }
                            };
                            overall.database.set('data_debt', debtors);
                        });
                }
                overall.database.set(`employee_${employeeID}`, employee);
                overall.database.delete(`order_${orderID}`);
            })
        })
    });
};

function formatMessage(type, data = {}) {
    switch (type) {
        case 'log':
            return `
\`\`\`  \`\`\`Order ID : ${data.id}
Link : ${ data.msgID ? `<https://discord.com/channels/${dataJSON['Bot']['servers']['flexcrop']}/${dataJSON['Bot']['channels']['onlineOrders']}/${data.msgID}>` : '\`UNDEFINED\`'}
Action : ${data.action}
Employee : ${data.employee}
Debtor : ${data.debtor}
\`\`\` \`\`\``;
        case 'payUser':
            return `${data.employeeID} : ${data.payments}`;
        case 'undoneOrder':
            return `${data.orderID} : <https://discord.com/channels/${dataJSON['Bot']['servers']['flexcrop']}/${dataJSON['Bot']['channels']['onlineOrders']}/${data.msgID}>`;
        case 'userJoin':
            return `<@${data.employee}>, ${data.player} is online!`;
    };
};

module.exports = ShopBot;