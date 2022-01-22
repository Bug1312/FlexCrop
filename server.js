const Database = require("fs-database"),
    fs = require('fs');

const ShopSite = require(__dirname + "/shop.js");


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
 *  ShopSite                |               |                                                                       |                        *
 *      cert                | Object        | Object used to hold SSL Certificate information of ShopSite           | null                   *
 *          cert            | String        | Domain certification for SSL Certificate of ShopSite                  | null                   *
 *          key             | String        | Private key for SSL Certificate of ShopSite                           | null                   *
 *      database            | fs-database   | Database used for ShopSite                                            | fs-database()          *
 *      name                | String        | Used to prefix console logs                                           | "ShopSite"             *
 *      port                | Number        | Port number for ShopSite's website                                    | 80                     *
 *      runBot              | Boolean       | Determines if the Discord bot using TOKEN_SHOP will run for ShopSite  | false                  *
 *      runSite             | Boolean       | Determines if the ShopSite website will run on PORT_SHOP              | false                  *
 *      userClear           | Number        | Length (in milliseconds) of how long it will take for the database to | 3600000                *
 *                          |               |   clear unneeded users                                                |                        *
 * -------------------------|---------------|-----------------------------------------------------------------------|----------------------- *
 * ========================================================================================================================================= *
 */


new ShopSite({
    port: 12002,
    runBot: true,
    runSite: true,
    database: new Database("/databases/flexcrop"),
    cert: {
        key: fs.readFileSync('/cert/net/flexcrop/private.key.pem'),
        cert: fs.readFileSync('/cert/net/flexcrop/domain.cert.pem')
    }
});