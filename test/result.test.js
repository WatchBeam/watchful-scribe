'use strict';

const Result = require('../lib/result').ResultImpl;

describe('result', () => {
    let result;

    beforeEach(() => {
        result = new Result({}, [
            ['number'],
            [2],
            [3],
            [4],
        ]);
    });

    it('throws on invalid results', () => {
        expect(() => new Result({}, [])).to.throw; // on no columns
        expect(() => new Result({}, [[42]])).to.throw; // on non-string columns
        expect(() => new Result({}, [['x'], []])).to.throw; // on mismatched rows
    });

    it('gets rows and columns', () => {
        expect(result.columns()).to.deep.equal(['number']);
        expect(result.rows()).to.deep.equal([[2], [3], [4]]);
    });

    it('filters rows', () => {
        const r = result.filter((x) => x.number % 2 === 0);
        expect(r.rows()).to.deep.equal([[2], [4]]);
    });

    it('maps rows', () => {
        const r = result.map((x) => {
            x.number *= 2;
            return x;
        });
        expect(r.rows()).to.deep.equal([[4], [6], [8]]);
    });
});
