import { BadRequestError } from "../expressError";

/** Helper for update queries
 * 
 * @param {object} data - {field1: newVal, field2: new val, ...}
 * @param {object} jsToSql - converts js-style data to database column names (Camel to Snake): {firstName: "first_name"}
 * 
 * @return {object} {sqlSetCols, data}
 */
const sqlForUpdate = (data, jsToSql) => {
    const keys = Object.keys(data);
    if (keys.length === 0) throw new BadRequestError("No data provided");

    const columns = keys.map((colName, idx) => {
        return `"${jsToSql[colName] || colName}"=$${idx+1}`
    })

    return {
        sqlSetCols: columns.join(", "),
        data: Object.values(data)
    }
}

export default sqlForUpdate;