
declare module "named-js-regexp" {

    interface RegExp {
        execGroups: (text: string, all?: boolean) => { mapper: any, regexText: string } // | null
    }

    function NamedJsRegexp(pattern: string): RegExp

    namespace NamedJsRegexp {

    }

    export = NamedJsRegexp
}
