import { Hookable, Model, Query, Result, hookableDefault, validateQuery } from "./types";
import { IConnectionConfig, IQueryFunction } from "mysql";
import { ModelImpl, ModelConfig } from "./model";
import { QueryValidationError } from "./errors";
import { Adapter } from "./adapters/adapter";

const influx = require("influx");

/**
 * ScribeConfig is used to instantiate a Scribe instance.
 */
export interface ScribeConfig {
    adapters: {
        sql?: (IConnectionConfig | { query(): IQueryFunction }),
        influx?: any, // no compatible typings, yet...
    };

    /**
     * hooks can be used to provide global hooks that are run before any
     * transcription takes place:
     */
    hooks: Hookable;
}

export class Scribe {

    private models : { [name: string]: Model } = {};
    private adapters : { [name: string]: Adapter } = {};
    private config : ScribeConfig;

    constructor(config: ScribeConfig) {
        config = this.config = Object.assign({
            adapters: {},
            hooks: hookableDefault(config),
        }, config);

        Object.keys(config.adapters).forEach(adapter => {
            switch (adapter) {
            case "influx": /* todo */ break;
            case "sql": /* todo */ break;
            default: throw new Error(`Unknown adapter ${adapter}`);
            }
        });
    }

    /**
     * mode defines a new model on the scribe, and returns it.
     * @param  {ModelConfig} config
     * @return {Model}
     */
    model(config: ModelConfig): Model {
        if (!this.adapters.hasOwnProperty(config.adapter)) {
            throw new Error(`Unknown adapter '${config.adapter}'`);
        }

        const model = new ModelImpl(config);
        this.models[config.name] = model;
        return model;
    }

    /**
     * QuerySingle runes a single query against the database.
     */
    querySingle(query: Query, context: any): Promise<Result> {
        return this.queryAll([query], context).then(result => result[0]);
    }

    /**
     * QueryAll runs multiple queries against the the database and returns
     * an ordered array of their results.
     */
    queryAll(queries: Query[], context?: any): Promise<Result[]> {
        let fulfilled : Query[];
        try {
            fulfilled = queries.map((q, i) => {
                validateQuery(q);

                if (!this.models.hasOwnProperty(q.series)) {
                    throw new QueryValidationError(
                        `query[${i}].series`,
                        `'${q.series}' cannot be queried`
                    );
                }

                return Object.assign({ model: this.models[q.series] }, q);
            });
        } catch (e) {
            if (e instanceof QueryValidationError) {
                return new Promise((resolve, reject) => reject(e));
            }
            throw e;
        }

        return Promise.all(fulfilled.map((q, i) => {
            return Promise.resolve(this.config.hooks.beforeQuery(q, context))
            .then(q => q.model.beforeQuery(q, context));
        }))
        .then(queries => {
            const todo : Array<() => Promise<Result>> = queries.map(q => {
                const query = <Query>q;
                const adapter = this.adapters[query.model.adapter()];
                adapter.validate(query);
                return () => adapter.execute(query);
            });

            return Promise.all(todo.map((fn, i) => {
                return fn()
                .then(result => queries[i].model.afterQuery(result, context))
                .then(result => this.config.hooks.afterQuery(result, context));
            }));
        });
    }

    /**
     * Query runs one or more queries against the scribe. If an array is passed
     * in, the promise will result to an array of results, otherwise it'll
     * resolve to a single result.
     *
     * It also takes a context object, which is passed into the lifecycle
     * hooks. This may carry metadata for operations such as permissions
     * checks against the query.
     */
    query(queries: Query | Query[], context?: any): Promise<Result | Result[]> {
        if (!Array.isArray(queries)) {
            return this.querySingle(queries, context);
        } else {
            return this.queryAll(queries, context);
        }
    }
}
