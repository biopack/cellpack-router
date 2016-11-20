"use strict";
const microb_1 = require("microb");
const Restify = require("restify");
const CookieParser = require("restify-cookies");
class CellpackRestify extends microb_1.Cellpack {
    init() {
        this.server = Restify.createServer();
        this.server.use(Restify.pre.sanitizePath());
        this.server.use(Restify.bodyParser({
            mapParams: false
        }));
        this.server.use(Restify.queryParser());
        this.server.use(CookieParser.parse);
        this.server.use((req, res, next) => {
            this.rawRequest.call(this, req, res, next);
        });
        this.transmitter.on("microb.response", this.response);
        this.server.get(".*", (req, res, next) => { });
        this.server.post(".*", (req, res, next) => { });
        this.server.head(".*", (req, res, next) => { });
        this.server.del(".*", (req, res, next) => { });
        this.server.put(".*", (req, res, next) => { });
        this.server.opts(".*", (req, res, next) => { });
        this.server.listen(this.config.port);
    }
    rawRequest(req, res, next) {
        let connection = new microb_1.Connection();
        connection.request.raw = req;
        let [hostname, port] = req.headers.host.split(':');
        connection.request.host = hostname;
        connection.request.port = port;
        connection.request.path = req.getPath();
        if (req.method === "GET")
            connection.request.method = microb_1.Request.Method.GET;
        else if (req.method === "POST")
            connection.request.method = microb_1.Request.Method.POST;
        else if (req.method === "HEAD")
            connection.request.method = microb_1.Request.Method.HEAD;
        else if (req.method === "PUT")
            connection.request.method = microb_1.Request.Method.PUT;
        else if (req.method === "DELETE")
            connection.request.method = microb_1.Request.Method.DELETE;
        else if (req.method === "OPTIONS")
            connection.request.method = microb_1.Request.Method.OPTIONS;
        Object.keys(req.headers).forEach((key, index, arr) => {
            connection.request.headers.set(key.toLowerCase(), req.headers[key]);
        });
        Object.keys(req.params).forEach((key, index, arr) => {
            connection.request.query.set(key, req.params[key]);
        });
        if (req.body) {
            Object.keys(req.body).forEach((key, index, arr) => {
                connection.request.request.set(key, req.body[key]);
            });
        }
        if (req.cookies) {
            Object.keys(req.cookies).forEach((key, index, arr) => {
                connection.request.cookies.set(key, req.cookies[key]);
            });
        }
        this.transmitter.emit("microb.request", connection);
    }
    response(connection) {
        let response = connection.response.raw;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CellpackRestify;
