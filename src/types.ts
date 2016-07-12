import { QueryValidationError } from "./errors";

export interface Hookable {
    /**
     * beforeQuery is invoked prior to a query being run. It should return
     * a (potentially modified) query.
     */
    beforeQuery?(query: Query, context: any): Promise<Query> | Query;

    /**
     * afterQuery is invoked after a query is run. It should return the
     * potentially modified results of that query.
     */
    afterQuery?(results: Result, context: any): Promise<Result> | Result;
}

/**
 * Applies default filler functions to the hookable object, returning a
 * new hookable object.
 */
export function hookableDefault(obj: Hookable={}): Hookable {
    return {
        beforeQuery: obj.beforeQuery || ((q) => q),
        afterQuery: obj.afterQuery || ((r) => r),
    };
}

export interface Model extends Hookable {
    /**
     * Returns the name of the adapter this model is associated with.
     */
    adapter(): string;

    // Required implementations of hookable methods:
    beforeQuery(query: Query, context: any): Promise<Query> | Query;
    afterQuery(results: Result, context: any): Promise<Result> | Result;
}

export interface Result {
    /**
     * returns the model this result list is associated with.
     */
    model(): Model;

    /**
     * Returns an ordered list of the column names in the result.
     */
    columns(): string[];

    /**
     * Returns a two-dimensional list of rows. Each row will be a list of
     * values that correspond to the column name.
     */
    rows(): any[][];

    /**
     * filter creates a new result instance formed by applying the
     * predicate to each row in the set. Only rows which the predicate
     * returns truthy for will be included in the result.
     */
    filter(predicate: (row: { [field: string]: any }, index: number) => boolean): Result;

    /**
     * map creates a new Result instance using the transformed rows in
     * the set.
     */
    map(iterator: (row: { [field: string]: any }, index: number) => { [field: string]: any }): Result;

    /**
     * forEach iterates over all rows in the set. It is not possible to modify
     * the result set using this function.
     */
    forEach(iterator: (row: { [field: string]: any }, index: number) => void): void;
}


/**
 * A fieldsQuery runs a function on a field, like `{ $count: 'users' }`. It
 * may also be nested, such as in `{ $count: { $distinct: 'userID' } }`
 */
export interface FieldQuery {
    [fn: string]: FieldQuery | string;
}

/**
 * A (very) loosely typed interface used to call function, such as
 * `{ $in: [1, 3] }`. Like the FieldQuery, you can nest function builders.
 */
export interface QueryFunctionBuilder {
    [fn: string]: QueryFunctionBuilder | any;
}

export interface Query {
    /**
     * The series name this query targets.
     */
    series: string;

    /**
     * The model which is being queries. This will be filled in when the
     * query is passed to .query() on the scribe.
     */
    model?: Model;

    /**
     * Fields is a map of aliases to the underlying field names.
     */
    fields: { [alias: string]: FieldQuery | string };

    /**
     * A list of filters to apply to the query.
     */
    filter?: QueryFunctionBuilder;

    /**
     * A list of query functions to apply grouping to the time series
     * query. It's expected that each query function contains exactly
     * one key -- grouping is ordered.
     */
    group?: QueryFunctionBuilder[];
}


/**
 * Validates that a query appears to be well-formed, throws an error if
 * it's not.
 * @throws {QueryValidationError}
 */
export function validateQuery(query: Query): Query {
    if (!query || typeof query !== "object") {
        throw new QueryValidationError("query", "Your query should be an object");
    }

    query = Object.assign({ filter: {}, group: [] }, query);

    if (typeof query.series !== "string") {
        throw new QueryValidationError("query.series", "The series name must be a string");
    }

    if (!query.fields || typeof query.fields !== "object") {
        throw new QueryValidationError("query.fields", "The query fields must be an object");
    }

    if (!query.filter || typeof query.filter !== "object") {
        throw new QueryValidationError("query.filter", "The query filter must be an object");
    }

    if (!query.group || !Array.isArray(query.group)) {
        throw new QueryValidationError("query.group", "The query group must be an array");
    }

    (function validateFields(obj: { [prop: string]: FieldQuery | string }, path: string) {
        if (obj == null) {
            throw new QueryValidationError(path, "The query fields must be an object or string")
        }

        Object.keys(obj).forEach(key => {
            switch (typeof obj[key]) {
            case "string": return;
            case "object": return validateFields(<FieldQuery>obj[key], `${path}.${key}`);
            default: throw new QueryValidationError(`${path}.${key}`, "The field should be a string");
            }
        });
    })(query.fields, "query.fields");

    return query;
}
