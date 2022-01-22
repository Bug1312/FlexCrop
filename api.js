const express = require("express"),
    app = express(),
    dataJSON = require(__dirname + "/public/data/data.json"),
    https = require('https'),
    fs = require('fs'),
    cors = require('cors');

class API {
    constructor(options = {}) {
        // Defaults
        this.name = "API";
        this.port = 8000;
        this.corsOptions = {
            origin: ["*"]
        }
        this.cert;

        this.#setupSite;
        this.#setupAPI;

        Object.keys(options).forEach(key => {
            this[key] = options[key];
        });
    }

    run() {
        this.#setupSite();
        this.#setupAPI();
    }

    #setupSite() {
        app.use(express.json());
        app.use(express.urlencoded({
            extended: true
        }));
        app.use(cors());

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

    #setupAPI() {
        app.get("/LICENSE", (req, res) => {
            res.send(fs.readFileSync(__dirname + "/LICENSE"))
        });

        app.get("/fcs", cors(this.corsOptions), (req, res) => {
            res.send(dataJSON.FCS);
        });
    }
}

module.exports = API;