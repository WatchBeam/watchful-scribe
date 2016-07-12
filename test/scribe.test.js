const QueryError = require('../lib/errors').QueryValidationError;
const Results = require('../lib/result').ResultImpl;
const Scribe = require('../lib/index').Scribe;

describe('scribe', () => {
    let scribe;
    let model;
    let adapter;
    let results;

    beforeEach(() => {
        scribe = new Scribe();
        adapter = scribe.adapters.foo = {
            validate: sinon.stub(),
            execute: sinon.stub(),
        };

        model = scribe.model({ name: 'model', adapter: 'foo' });
        results = new Results(model, [['foo'], [42]]);
        adapter.execute.returns(Promise.resolve(results));
    });

    it('throws an error if instantiating with an unknown adapter', () => {
        expect(() => new Scribe({ adapters: { foo: 'bar' }})).to.throw;
    });

    it('works when trying to query', () => {
        return scribe.query([{ series: 'model', fields: { col: 'alias' }}])
        .then(r => expect(r).to.deep.equal([results]));
    });

    describe('query validation', () => {
        const tt = [
            {
                query: 'asdf',
                message: 'Your query should be an object',
                path: 'query',
            },
            {
                query: null,
                message: 'Your query should be an object',
                path: 'query',
            },
            {
                query: { series: 'model', fields: {} },
            },
            {
                query: { series: null, fields: {} },
                message: 'The series name must be a string',
                path: 'query.series',
            },
            {
                query: { series: 'unknown', fields: {} },
                message: '\'unknown\' cannot be queried',
                path: 'query.series',
            },
            {
                query: { series: 'model', fields: null },
                message: 'The query fields must be an object',
                path: 'query.fields',
            },
            {
                query: { series: 'model', fields: { name: null } },
                message: 'The query fields must be an object or string',
                path: 'query.fields.name',
            },
            {
                query: { series: 'model', fields: { name: { $fn: null } } },
                message: 'The query fields must be an object or string',
                path: 'query.fields.name.$fn',
            },
            {
                query: { series: 'model', fields: { name: { $fn: undefined } } },
                message: 'The field should be a string',
                path: 'query.fields.name.$fn',
            },
            {
                query: { series: 'model', fields: { name: 'yay' } },
            },
            {
                query: { series: 'model', fields: { name: { $fn: 'yay' } } },
            },
            {
                query: { series: 'model', fields: {}, group: null },
                message: 'The query group must be an array',
                path: 'query.group',
            },
            {
                query: { series: 'model', fields: {}, group: {} },
                message: 'The query group must be an array',
                path: 'query.group',
            },
            {
                query: { series: 'model', fields: {}, filter: {} },
            },
            {
                query: { series: 'model', fields: {}, filter: null },
                message: 'The query filter must be an object',
                path: 'query.filter',
            },
        ];

        tt.forEach(test => {
            if (test.message) {
                it(`invalidates ${JSON.stringify(test.query)}`, () => {
                    return scribe.query(test.query)
                    .then(() => assert.fail('expected to have thrown'))
                    .catch(err => {
                        if (!(err instanceof QueryError)) throw err;
                        expect(err.message).to.equal(test.message);
                        expect(err.details[0].path).to.equal(test.path);
                    });
                });
            } else {
                it(`validates ${JSON.stringify(test.query)}`, () => {
                    return scribe.query(test.query);
                });
            }
        });

    });

    describe('hooks', () => {
        const addHooksTo = (obj, ctx) => {
            obj.beforeQuery = (query, c) => {
                expect(c).to.equal(ctx);
                query.filter.channel = 42;
                return query;
            };
            obj.afterQuery = (results, c) => {
                expect(c).to.equal(ctx);
                return results.map(row => {
                    row.foo *= 2;
                    return row;
                });
            };
        };

        it('applies scribe-level hooks', () => {
            const ctx = {};
            addHooksTo(scribe.config.hooks, ctx);

            return scribe.query([{ series: 'model', fields: { col: 'alias' }}], ctx)
            .then(r => {
                expect(r).to.deep.equal([new Results(model, [['foo'], [84]])]);
                expect(adapter.execute.args[0][0].filter).to.deep.equal({ channel: 42 });
            });
        });

        it('applies model-level hooks', () => {
            const ctx = {};
            addHooksTo(scribe.config.hooks, ctx);

            return scribe.query([{ series: 'model', fields: { col: 'alias' }}], ctx)
            .then(r => {
                expect(r).to.deep.equal([new Results(model, [['foo'], [84]])]);
                expect(adapter.execute.args[0][0].filter).to.deep.equal({ channel: 42 });
            });
        });
    });
});
