# watchful-scribe

watchful-scribe is a transcription module which converts untrusted Mongo-esque queries to time series queries against various storage engines (currently MySQL and Influx). Consumers instantiate a script instance and attach multiple "models" to it, which define what operations can be run on which resources.

### Demo

```js
import { Scribe, Query, Results } from "watchful-scribe";

// First, create a new Scribe instance. You can define adapters to connect
// to multiple data stores.
const scribe = new Scribe({
    adapters: {
        // connection details for the `mysql` module,
        or an instance of the mysql pool.
        sql: {
             host: 'localhost',
             user: 'me',
             password: 'secret',
             database: 'my_db',
        },
        // connection details for node-influx, or an instance
        // of node-influx
        influx: {
            username: 'dbuser',
            password: 'f4ncyp4ass',
            database: 'my_database',
        }
    }

    hooks: {
        // beforeQuery functions run before the query is transcribed.
        // Here you can do permission checks (rejecting the promise will
        // bubble back to the query-er) or modify the query pre-transcription.
        beforeQuery(query: Query, context: any): Promise<Query> {}

        // afterQuery allows you to modify the results, doing any necessary
        // sanitization before they're return to the queryer.
        afterQuery(results: Results, context: any): Promise<Results> {}
    }
});

// Next, define a resource (or metric) that can be queried
scribe.model({
    name: 'views',
    adapter: 'influx',

    // Fields is the list of attributes or columns that can be queried.
    // Using this information allows us to transcribe queries that we
    // are sure will not throw those nasty 500 errors:
    fields: {
        userID: { type: 'integer' },
        channelID: { type: 'integer' },
        ip: { type: 'string' },
    },

    // Hooks can be defined at the model-level too:
    hooks: {
        beforeQuery(query: Query, context: any): Promise<Query> {}
        afterQuery(results: Results, context: any): Promise<Results> {}
    }
});


// Finally, query it! You can run multiple queries at once against the
// scribe by passing an array of objects rather than a single object.
scribe.query([
    {
        series: 'views',
        fields: {
            channel: 'channelID',
            total: { $count: { $distinct: 'ip' } },
        },
        filter: {
            channel: { $in: [12, 34, 56] },
        },
        group: [
            { $column: 'channel' },
        ],
    }
]).then(results => {
    // Results are in a csv-like column format, presented
    // in the same order as the original query:
    // =>
    [
        [['channel', 'total'],
         [12, 3432],
         [34, 98966],
         [56, 5],
    ]
})
```

### Lifecycle

```
Query
  |> scribe.beforeQuery
  |> model.beforeQuery
  |> adapter.validate
  |> adapter.query --> database
  |> model.afterQuery
  |> scribe.afterQuery
```
