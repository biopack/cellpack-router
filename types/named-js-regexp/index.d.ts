
declare module "named-js-regexp" {

    interface Bag {
        [key: string]: string
    }

    interface RegExp {
        execGroups: (text: string, all?: boolean) => Bag //{ mapper: any, regexText: string } // | null
    }

    function NamedJsRegexp(pattern: string): RegExp

    namespace NamedJsRegexp {

    }

    export = NamedJsRegexp
}
