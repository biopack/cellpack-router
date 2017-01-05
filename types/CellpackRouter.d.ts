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
    path(routeName: string, params?: any): string;
    url(uri: string, params?: any): string;
    get(routeName: string): Route;
}
