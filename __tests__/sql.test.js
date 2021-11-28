import { BadRequestError } from "../expressError";
import sqlForUpdate from "../helpers/sql";

describe('sqlForUpdate', () => {
    it('works', () => {
        const result = sqlForUpdate(
            {f1: 'v1'},
            {f1: 'f1'}
        )

        expect(result.sqlSetCols).toEqual("\"f1\"=$1");
        expect(result.data).toEqual(['v1']);
    })

    it('works with jsToSql conversion', () => {
        const result = sqlForUpdate(
            {f1: 'v1'},
            {f1: 'field1'}
        )

        expect(result.sqlSetCols).toEqual("\"field1\"=$1");
        expect(result.data).toEqual(['v1']);
    })

    it('works with multiple changes', () => {
        const result = sqlForUpdate(
            {f1: 'v1', f2: 'v2'},
            {f1: 'field1'}
        )

        expect(result.sqlSetCols).toEqual("\"field1\"=$1, \"f2\"=$2");
        expect(result.data).toEqual(['v1', 'v2']);
    })

    it('throws badrequest if no data', () => {
        try {
            sqlForUpdate({}, {});
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError)
        }
    })
})
