import { Result } from "../types";
import { Query } from "../types";

export interface Adapter {
    /**
     * Validate should ensure that the query is grammatical in the target
     * language. It may throw a query exception. This method may
     * assume that all basic data types on the query are correct.
     */
    validate(query: Query): void;

    /**
     * Execute should dispatch the query to the adapter and return the
     * results of that query.
     */
    execute(query: Query): Promise<Result>;
}
