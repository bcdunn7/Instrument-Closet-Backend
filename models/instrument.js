'use strict';

import db from '../db';
import { NotFoundError } from '../expressError';

/** Instrument database model */
class Instrument {

    /** Constructor for Instrument class
     * @construtor
     */
    constructor({ id, name, quantity, description, imageURL }) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
        this.description = description;
        this.imageURL = imageURL;
    }

    /** Find All Instruments
     * @static
     * @async
     * 
     * @return {Promise<array>} - promise when once resolved bears instrumets array [{id, name, quantity, description, image_url}, ...]
     */
    static async findAll() {
        const res = await db.query(`
            SELECT id,
                    name,
                    quantity,
                    description,
                    image_url AS "imageURL"
            FROM instruments
        `)

        const instruments = res.rows.map(i => new Instrument(i));
        return instruments;
    }

    /** Get Instrument
     * @static
     * @async
     * @param {int} - instrument id
     * 
     * @return {Promise<Instrument>} - promise when once resolved bears Instrument instance {id, name, quantity, description, image_url}
     * @throws {NotFoundError} if instrument with id not found
     */
    static async get(id) {
        const res = await db.query(`
            SELECT id,
                    name,
                    quantity,
                    description,
                    image_url AS "imageURL"
            FROM instruments
            WHERE id = $1`,
            [id]);

        if (!res.rows[0]) throw new NotFoundError(`No Instrument with id: ${id}`);

        const instrument = new Instrument(res.rows[0]);
        return instrument;
    }
}

export default Instrument;