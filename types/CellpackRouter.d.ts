import { Cellpack, Connection, Route } from "microb";
export default class CellpackRouter extends Cellpack {
    private routes;
    private routesByName;
    init(): void;
    request(connection: Connection): boolean;
    private initRoutes(routes);
    private add(routeDefinition);
    get(routeName: string): Route;
}
