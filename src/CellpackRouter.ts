import * as Path from "path"
import * as appRoot from "app-root-path"
import * as Lodash from "lodash"
import * as Promise from "bluebird"
//
import { Cellpack, Connection, Transmitter, Route } from "microb"
//
import * as NamedJsRegexp from "named-js-regexp"

export default class CellpackRouter extends Cellpack {

    private routes: Array<Route> = []
    private routesByName: { [key: string]: Route } = {}

    // constructor(config: any, transmitter: Transmitter){
        // super(config,transmitter)
    // }

    init(){
        this.config = this.environment.get("cellpacks")["cellpack-router"]
        let routes = []

        if(Lodash.isString(this.config.routes)){
            if(!Path.isAbsolute(this.config.routes)) routes = require(`${appRoot}/config/${this.config.routes}`)
            else routes = require(this.config.routes)
        } else if(Lodash.isArray(this.config.routes)){
            routes = this.config.routes
        } else if(Lodash.isObject(this.config.routes)){
            routes.push(this.config.routes)
        } else if(Lodash.isFunction(this.config.routes)){
            routes = this.config.routes()
        } else {
            throw new Error("Bad routes config option")
        }

        if(Lodash.isArray(routes)) this.initRoutes(routes)
        else if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Routes are not array: ${routes}`)

        this.environment.add("template.functions",{
            name: "path",
            class: this,
            func: this.path
        })
        this.environment.add("template.functions",{
            name: "url",
            class: this,
            func: this.url
        })

        return Promise.resolve()
    }

    request(connection: Connection){
        this.routes.forEach((route,index,arr) => {
            if(Lodash.isUndefined(route.host) || route.host.test(connection.request.host)){
                if(Lodash.isUndefined(route.methods) || route.methods.indexOf(connection.request.method) >= 0){

                    let matched = NamedJsRegexp(route.options.get("_regex")).execGroups(connection.request.path)

                    if(!Lodash.isNull(matched)){ // Route found
                        // attributes
                        Object.keys(matched).forEach((match, index, arr) => {
                            // default attribute value
                            if(Lodash.isEmpty(matched[match]) && route.defaults.has(match)){
                                Lodash.set(matched,match,route.defaults.get(match))
                            }
                            if(!Lodash.isEmpty(matched[match])){ // empty attributes = false has() on ParameterBag
                                connection.request.attributes.set(match,matched[match])
                            }
                        })

                        /*
                        if(!Lodash.isUndefined(route.defaults)){ // else?
                            Object.keys(route.defaults.all()).forEach((defName: string, index: number, arr: Array<string>) => {

                                console.log(`LL1: ${Lodash.get(matched,defName)}`)

                                if(Lodash.isEmpty(Lodash.get(matched,defName)) || Lodash.isUndefined(Lodash.get(matched,defName))){
                                    Lodash.set(matched,defName,route.defaults.get(defName))
                                }

                                console.log(`LL2: ${Lodash.get(matched,defName)}`)

                                connection.request.attributes.set(defName,Lodash.get(matched,defName))
                            })
                        }*/

                        connection.environment.set('route',route)
                        // return Promise.resolve(true)
                    } else {
                        if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Route RegExp test failed: ${route.name} - ${connection.request.path} - ${route.options.get("_regex")}`)
                    }
                } else {
                    if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Route Method test failed: ${route.name} - ${connection.request.method}`)
                }
            } else {
                if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Route Host test failed: ${route.name} - ${connection.request.host}`)
            }
        })

        return Promise.resolve(true)
    }

    private initRoutes(routes: Array<any>): void {
        if(this.environment.get('debug')) this.transmitter.emit("log.cellpack.router",`Routes found: ${routes.length}`)
        routes.forEach((routeDefinition,index,arr) => {
            if(this.environment.get('debug')) this.transmitter.emit("log.cellpack.router",`\t+ ${routeDefinition.name}`)
            this.add(routeDefinition)
        })
    }

    private add(routeDefinition: any): void {
        // TODO: validation
        let r = routeDefinition
        // replace backslash before attribute
        // replace attribute name to named regexp
        // replace replace backslash
        r.options._regex = r.path.replace(/\/:/,"\/{0,1}:").replace(/:([a-z0-9_-]+)/gi,`:<$1>`).replace(/\//g,"\\/")
        r.options._regex = `^${r.options._regex}$`
        if(!Lodash.isUndefined(r.requirements)){
            Object.keys(r.requirements).forEach((name,index,len) => {
                r.options._regex = r.options._regex.replace(new RegExp(`:<(${name})>`,"g"),`(:<$1>${r.requirements[name]})`)
            })
        }
        r.host = new RegExp(`^(${r.host})$`)

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

    path(routeName: string, params?: any): string {
        if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Render path for ${routeName} with ${params}`)
        let error = ""
        params = params || {}
        let route = this.get(routeName)
        let path = route.path
        let items = path.match(/:([a-z0-9_-]+)/gi)
        if(!Lodash.isNull(items)){
            let cleaned = (<RegExpMatchArray>items).map(item => { return item.replace(':','') })
            cleaned.forEach((attributeName,index,arr) => {
                let requirement = route.requirements.get(attributeName)
                let value = params[attributeName] || route.defaults.get(attributeName)

                if(!Lodash.isUndefined(requirement)){
                    let reqtestRegExp = new RegExp(requirement,'gi')
                    if(Lodash.isUndefined(value)) value = ""
                    let reqtest = value.match(reqtestRegExp)
                    if(Lodash.isNull(reqtest)) error = `Bad route attribute '${attributeName}' for route: '${routeName}'`
                }

                if(value === "") path = path.replace(`:${attributeName}/`,value).replace(`:${attributeName}`,value)
                else path = path.replace(`:${attributeName}`,value)
            })
        }

        if(!Lodash.isEmpty(error)){
            if(this.environment.get("debug")){
                this.transmitter.emit("log.cellpack.router",error)
                path = error
            }
        }

        return path
    }

    url(uri: string, params?: any): string {
        if(this.environment.get("debug")) this.transmitter.emit("log.cellpack.router",`Render path for ${uri} with ${params}`)
        let error = ""
        params = params || {}
        let items = uri.match(/:([a-z0-9_-]+)/gi)
        if(!Lodash.isNull(items)){
            let cleaned = (<RegExpMatchArray>items).map(item => { return item.replace(':','') })
            cleaned.forEach((attributeName,index,arr) => {
                let value = params[attributeName] || ""
                uri = uri.replace(`:${attributeName}/`,value).replace(`:${attributeName}`,value)
            })
        }
        return uri
    }

    get(routeName: string): Route {
        if(Lodash.isUndefined(this.routesByName[routeName])) throw new Error(`Unknown route with name: ${routeName}`)
        return this.routesByName[routeName]
    }
}
