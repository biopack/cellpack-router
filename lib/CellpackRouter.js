"use strict";
const Path = require("path");
const appRoot = require("app-root-path");
const Lodash = require("lodash");
const Promise = require("bluebird");
const microb_1 = require("microb");
const NamedJsRegexp = require("named-js-regexp");
class CellpackRouter extends microb_1.Cellpack {
    constructor() {
        super(...arguments);
        this.routes = [];
        this.routesByName = {};
    }
    init() {
        this.config = this.environment.get("cellpacks")["cellpack-router"];
        let routes = [];
        if (Lodash.isString(this.config.routes)) {
            if (!Path.isAbsolute(this.config.routes))
                routes = require(`${appRoot}/config/${this.config.routes}`);
            else
                routes = require(this.config.routes);
        }
        else if (Lodash.isArray(this.config.routes)) {
            routes = this.config.routes;
        }
        else if (Lodash.isObject(this.config.routes)) {
            routes.push(this.config.routes);
        }
        else if (Lodash.isFunction(this.config.routes)) {
            routes = this.config.routes();
        }
        else {
            throw new Error("Bad routes config option");
        }
        if (Lodash.isArray(routes))
            this.initRoutes(routes);
        else if (this.environment.get("debug"))
            this.transmitter.emit("log.cellpack.router", `Routes are not array: ${routes}`);
        return Promise.resolve();
    }
    request(connection) {
        this.routes.forEach((route, index, arr) => {
            if (Lodash.isUndefined(route.host) || route.host.test(connection.request.host)) {
                if (Lodash.isUndefined(route.methods) || route.methods.indexOf(connection.request.method) >= 0) {
                    let matched = NamedJsRegexp(route.options.get("_regex")).execGroups(connection.request.path);
                    if (!Lodash.isNull(matched)) {
                        Object.keys(matched).forEach((match, index, arr) => {
                            console.log(`AAAAAAA: ${match}`);
                            console.log(Lodash.isEmpty(matched[match]));
                            console.log(route.defaults.has(match));
                            console.log(route.defaults.get(match));
                            if (Lodash.isEmpty(matched[match]) && route.defaults.has(match)) {
                                Lodash.set(matched, match, route.defaults.get(match));
                            }
                            if (!Lodash.isEmpty(matched[match])) {
                                connection.request.attributes.set(match, matched[match]);
                            }
                        });
                        connection.environment.set('route', route);
                    }
                    else {
                        if (this.environment.get("debug"))
                            this.transmitter.emit("log.cellpack.router", `Route RegExp test failed: ${route.name} - ${connection.request.path} - ${route.options.get("_regex")}`);
                    }
                }
                else {
                    if (this.environment.get("debug"))
                        this.transmitter.emit("log.cellpack.router", `Route Method test failed: ${route.name} - ${connection.request.method}`);
                }
            }
            else {
                if (this.environment.get("debug"))
                    this.transmitter.emit("log.cellpack.router", `Route Host test failed: ${route.name} - ${connection.request.host}`);
            }
        });
        return Promise.resolve(true);
    }
    initRoutes(routes) {
        if (this.environment.get('debug'))
            this.transmitter.emit("log.cellpack.router", `Routes found: ${routes.length}`);
        routes.forEach((routeDefinition, index, arr) => {
            if (this.environment.get('debug'))
                this.transmitter.emit("log.cellpack.router", `\t+ ${routeDefinition.name}`);
            this.add(routeDefinition);
        });
    }
    add(routeDefinition) {
        let r = routeDefinition;
        r.options._regex = r.path.replace(/\/:/, "\/{0,1}:").replace(/:([a-z0-9_-]+)/gi, `:<$1>`).replace(/\//g, "\\/");
        r.options._regex = `^${r.options._regex}$`;
        if (!Lodash.isUndefined(r.requirements)) {
            Object.keys(r.requirements).forEach((name, index, len) => {
                r.options._regex = r.options._regex.replace(new RegExp(`:<(${name})>`, "g"), `(:<$1>${r.requirements[name]})`);
            });
        }
        r.host = new RegExp(`^(${r.host})$`);
        let route = new microb_1.Route(r.name, new RegExp(r.host), r.path, r.methods, r.requirements, r.defaults, r.options);
        this.routes.push(route);
        this.routesByName[route.name] = route;
    }
    get(routeName) {
        if (Lodash.isUndefined(this.routesByName[routeName]))
            throw new Error(`Unknown route with name: ${routeName}`);
        return this.routesByName[routeName];
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CellpackRouter;
