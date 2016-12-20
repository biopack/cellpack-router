/// <reference types="bluebird" />
import * as Promise from "bluebird";
import { Cellpack, Connection, Route } from "microb";
export default class CellpackRouter extends Cellpack {
    private routes;
    private routesByName;
    init(): Promise<void>;
    request(connection: Connection): Promise<boolean>;
    private initRoutes(routes);
    private add(routeDefinition);
    get(routeName: string): Route;
}
