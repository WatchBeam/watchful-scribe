import { Adapter } from "./adapter";
import { Query, Result } from "../types";

export class InfluxAdapter implements Adapter {
    /**
     * Validate should ensure that the query is grammatical in the target
     * language. It may throw a Joi exception.
     */
    validate(query: Query): void {
        return undefined; // todo
    }

    /**
     * Execute should dispatch the query to the adapter and return the
     * results of that query.
     */
    execute(query: Query): Promise<Result> {
        return undefined; // todo
    }
}
