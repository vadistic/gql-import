declare class GqlImportCache {
    defaultSourcePath: string;
    defaultSourceCache: string | undefined;
    getSource: (sourcePath: string) => string;
    getCache(): string;
    resetCache(): void;
    changeDefaultSource(sourcePath: string): void;
}
export declare const gqlImportCache: GqlImportCache;
export declare const resetCache: () => void;
export declare const changeDefaultSource: (sourcePath: string) => void;
declare type GqlImportSelection = string | string[] | RegExp;
declare class GqlImport {
    typeName: string;
    sourcePath: string | undefined;
    private typeBody;
    readonly fields: string;
    readonly node: string;
    /** change type source */
    source(source: string): this;
    /**
     * Imports type by name
     */
    get(name: string): this;
    /**
     *  Pick fields from selected type using strings or RegExp
     */
    pick(names: GqlImportSelection): this;
    /**
     *  Omit fields from selected type using strings or RegExp
     */
    omit(names: string[] | string | RegExp): this;
    private validate;
    private clean;
    private getFields;
    private deconstruct;
}
export declare const gqlImport: GqlImport;
export {};
