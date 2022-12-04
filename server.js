const Database = require("fs-database"),
    fs = require('fs');

const ShopSite = require(__dirname + "/shop.js"),
    API = require(__dirname + "/api.js");


/* 
 * ========================================================================================================================================= *
 * ENVIRONMENTAL VARIABLES [.env file]                                                                                                       *
 *  Reason                  |                                                                                                                *
 *      Key                 | Description                                                                                                    *
 * -------------------------|--------------------------------------------------------------------------------------------------------------- *
 *  ShopSite                |                                                                                                                *
 *      TOKEN_SHOP          | Discord Bot Token for ShopSite's bot                                                                           *
 * -------------------------|--------------------------------------------------------------------------------------------------------------- *
 *  Overall                 |                                                                                                                *
 *      MAINTENANCE_USER    | When all sites in maintenence, users with this key in their cookies retain access                              *
 * ----------------------------------------------------------------------------------------------------------------------------------------- *
 * ========================================================================================================================================= *
 * CONSTANT VARIABLES [process options]                                                                                                      *
 *  Process                 |               |                                                                       |                        *
 *      Key                 | Datatype      | Description                                                           | Default Value          *
 * -------------------------|---------------|-----------------------------------------------------------------------|----------------------- *
 *  API                     |               |                                                                       |                        *
 *      cert                | Object        | Object used to hold SSL Certificate information of API                | null                   *
 *          cert            | String        | Domain certification for SSL Certificate of API                       | null                   *
 *          key             | String        | Private key for SSL Certificate of API                                | null                   *
 *      corsOptions         | Object        | Object used to hold CORS options                                      | See below              *
 *          origin          | Array         | Array full of strings that CORS accepts                               | ["*"]                  *
 *      name                | String        | Used to prefix console logs                                           | "API"                  *
 *      port                | Number        | Port number for API's website                                         | 8000                   *
 * -------------------------|---------------|-----------------------------------------------------------------------|----------------------- *
 *  ShopSite                |               |                                                                       |                        *
 *      cert                | Object        | Object used to hold SSL Certificate information of ShopSite           | null                   *
 *          cert            | String        | Domain certification for SSL Certificate of ShopSite                  | null                   *
 *          key             | String        | Private key for SSL Certificate of ShopSite                           | null                   *
 *      database            | fs-database   | Database used for ShopSite                                            | fs-database()          *
 *      name                | String        | Used to prefix console logs                                           | "ShopSite"             *
 *      port                | Number        | Port number for ShopSite's website                                    | 8001                   *
 *      runBot              | Boolean       | Determines if the Discord bot using TOKEN_SHOP will run for ShopSite  | false                  *
 *      runSite             | Boolean       | Determines if the ShopSite website will run on PORT_SHOP              | false                  *
 *      userClear           | Number        | Length (in milliseconds) of how long it will take for the database to | 3600000                *
 *                          |               |   clear unneeded users                                                |                        *
 * -------------------------|---------------|-----------------------------------------------------------------------|----------------------- *
 * ========================================================================================================================================= *
 */


new ShopSite({
    port: 12007,
    runBot: true,
    runSite: true,
    database: new Database('/databases/flexcrop'),
    cert: {
        key: fs.readFileSync('/cert/com/bug1312/private.key.pem'),
        cert: fs.readFileSync('/cert/com/bug1312/domain.cert.pem')
    }
}).run();

new API({
    port: 12006,
    cert: {
        key: fs.readFileSync('/cert/com/bug1312/private.key.pem'),
        cert: fs.readFileSync('/cert/com/bug1312/domain.cert.pem')
    }
}).run();