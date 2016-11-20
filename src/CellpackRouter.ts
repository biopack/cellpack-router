
import * as Path from "path"
import * as appRoot from "app-root-path"
import * as Lodash from "lodash"

import { Cellpack, Connection, Transmitter, Route } from "microb"

import * as NamedJsRegexp from "named-js-regexp"

export default class CellpackRouter extends Cellpack {

    private routes: Array<Route> = []
    private routesByName: { [key: string]: Route } = {}

    // constructor(config: any, transmitter: Transmitter){
        // super(config,transmitter)
    // }

    init(){
        let routes = null

        if(Lodash.isString(this.config.routes)){
            if(!Path.isAbsolute(this.config.routes)) routes = require(`${appRoot}/config/${this.config.routes}`)
            else routes = require(this.config.routes)
        } else if(Lodash.isArray(this.config.routes)){

        } else if(Lodash.isObject(this.config.routes)){

        } else {
            throw new Error("Bad routes config option")
        }

        if(Lodash.isArray(routes)) this.initRoutes(routes)
    }

    request(connection: Connection){
        this.routes.forEach((route,index,arr) => {
            if(Lodash.isUndefined(route.host) || route.host.test(connection.request.host)){
                if(Lodash.isUndefined(route.methods) || route.methods.indexOf(connection.request.method) >= 0){

                    let matched = NamedJsRegexp(route.options.get("_regex")).execGroups(connection.request.path)

                    if(!Lodash.isNull(matched)){ // Route found
                        if(!Lodash.isUndefined(route.defaults)){
                            Object.keys(route.defaults).forEach((defName: string, index: number, arr: Array<string>) => {
                                if(Lodash.get(matched,defName) === ""){
                                    Lodash.set(matched,defName,route.defaults.get(defName))
                                }
                                connection.request.attributes.set(defName,Lodash.get(matched,defName))
                                // if(matched[defName] === ""){

                                // }
                                /*if(matched[defName] === ""){
                                    matched[defName] = route.defaults[defName]
                                }
                                connection.request.attributes.set(defName,matched[defName])*/
                            })
                        }
                        connection.environment.set('route',route)
                    }
                }
            }
        })
        return true
    }

    private initRoutes(routes: Array<any>): void {
        routes.forEach((routeDefinition,index,arr) => {
            this.add(routeDefinition)
        })
    }

    private add(routeDefinition: any): void {
        // TODO: validation
        let r = routeDefinition
        r.options._regex = r.path.replace(/:([a-z0-9_-]+)/gi,`:<$1>`).replace("\/","\\/")
        r.options._regex = `^${r.options._regex}$`
        if(!Lodash.isUndefined(r.requirements)){
            Object.keys(r.requirements).forEach((name,index,len) => {
                r.options._regex = r.options._regex.replace(new RegExp(`:<(${name})>`,"g"),`(:<$1>${r.requirements[name]})`)
            })
        }
        r.host = new RegExp(`^${r.host}$`)

        let route = new Route(
            r.name,
            new RegExp(r.host),
            r.path,
            r.methods,
            r.requirements,
            r.defaults,
            r.options
        )

        this.routes.push(route)
        this.routesByName[route.name] = route
    }

    get(routeName: string): Route {
        if(Lodash.isUndefined(this.routesByName[routeName])) throw new Error(`Unknown route with name: ${routeName}`)
        return this.routesByName[routeName]
    }
}
