'use strict';

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

    it('rejects with an error on an invalid query', () => {
        return scribe.query('asdf')
        .then(() => assert.fail('expected to have thrown'))
        .catch(err => expect(err).to.be.an.instanceof(QueryError));
    });

    it('rejects with an error on unknown models', () => {
        return scribe.query([{ series: 'unknown', fields: { col: 'alias' }}])
        .then(() => assert.fail('expected to have thrown'))
        .catch(err => expect(err).to.be.an.instanceof(QueryError));
    });

    it('works otherwise', () => {
        return scribe.query([{ series: 'model', fields: { col: 'alias' }}])
        .then(r => expect(r).to.deep.equal([results]));
    });
});
