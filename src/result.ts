import { Model, Result } from "./types";
import * as assert from "assert";

export class ResultImpl implements Result {

    /**
     * Creates a new result interface attached the the model and with
     * the provided csv-style data -- the first element of the array
     * should be a list of strings, the following rows may be mixed
     * data corresponding to those columns
     */
    constructor(private parentModel: Model, private rawResult: any[][]) {
        assert(rawResult.length > 0, "Expected at least one column in Results, got 0");
        rawResult[0].forEach(value => {
            assert(typeof value === 'string', "Expected first row in result to " +
                "be strings, but '" + value + "' isn't");
        });

        rawResult.forEach(row => {
            assert(row.length === rawResult[0].length, "Expected length of rows " +
                "to equal the column count");
        });
    }

    model(): Model {
        return this.parentModel;
    }

    columns(): string[] {
        return this.rawResult[0];
    }

    rows(): any[][] {
        return this.rawResult.slice(1);
    }

    private rowToObject(values: any[]): { [column: string]: any } {
        const out : { [column: string]: any } = {};
        for (let i = 0; i < values.length; i++) {
            out[this.rawResult[0][i]] = values[i];
        }

        return out;
    }

    filter(predicate: (row: { [column: string]: any }, index: number) => boolean): Result {
        const updated = this.rawResult.slice();
        for (let i = 1; i < updated.length; i++) {
            if (!predicate(this.rowToObject(updated[i]), i)) {
                updated.splice(i, 1);
                i--;
            }
        }
        return new ResultImpl(this.parentModel, updated);
    }

    map(iterator: (row: { [column: string]: any }, index: number) => { [column: string]: any }): Result {
        const updated = this.rawResult.slice();
        const columns = this.columns();

        for (let i = 1; i < updated.length; i++) {
            const mapped = iterator(this.rowToObject(updated[i]), i);
            const newRow = updated[i].slice();
            for (let k = 0; k < columns.length; k++) {
                newRow[k] = mapped[columns[k]];
            }

            updated[i] = newRow;
        }

        return new ResultImpl(this.parentModel, updated);
    }

    forEach(iterator: (row: { [column: string]: any }, index: number) => void) {
        for (let i = 1; i < this.rawResult.length; i++) {
            iterator(this.rowToObject(this.rawResult[i]), i);
        }
    }

    toJSON(): any {
        return this.rawResult;
    }
}
