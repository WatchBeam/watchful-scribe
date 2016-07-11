import { Hookable, Model, Query, Result, hookableDefault } from "./types";

export interface ModelConfig {
    /**
     * Name of the model in your data store.
     * @type {string}
     */
    name: string;

    /**
     * Name of the adapter to use, one of "influx" or "sql" currently.
     */
    adapter: string;

    /**
     * A map of field names to configuration.
     */
    fields: {
        [field: string]: {
            // Primitive type of this column:
            type: "integer" | "float" | "string",
            // Whether this feel belongs to an index (in SQL) or a tag (in Inlfux)
            indexed?: boolean,
        }
    };

    /**
     * Lifecycle hooks for the model:
     */
    hooks?: Hookable;
}

export class ModelImpl implements Model {

    private config : ModelConfig;

    constructor(config: ModelConfig) {
        this.config = Object.assign(
            { hooks: hookableDefault(config.hooks) },
            config
        );
    }

    adapter(): string {
        return this.config.adapter;
    }

    beforeQuery(query: Query, context: any): Promise<Query> | Query {
        return this.config.hooks.beforeQuery(query, context);
    }

    afterQuery(results: Result, context: any): Promise<Result> | Result {
        return this.config.hooks.afterQuery(results, context);
    }
}

