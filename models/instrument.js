'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

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

    /** Create instrument
     * @static
     * @async
     * @param {obj} data - instrument data with:
     *      {string} name
     *      {integer} quantity
     *      {string} description - nullable
     *      {string} imageURL - nullable
     * 
     * @return {Promise<Instrument>} - promise when resolve 
     * @throws {BadRequestError} - if quantity is a negative number or non-integer
     */
    static async create({ name, quantity, description=null, imageURL=null }) {
        if (quantity < 0 || !Number.isInteger(quantity)) throw new BadRequestError("Quantity must be a positive integer.")

        const res = await db.query(`
            INSERT INTO instruments
                (name, quantity, description, image_url)
            VALUES ($1, $2, $3, $4)
            RETURNING id,
                    name,
                    quantity,
                    description,
                    image_url AS "imageURL"`,
            [name, quantity, description, imageURL]);

        const instrument = new Instrument(res.rows[0]);
        return instrument;
    }


    /** Find All Instruments
     * @static
     * @async
     * 
     * @return {Promise<array>} - promise when resolved bears instrumets array [{id, name, quantity, description, image_url}, ...]
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
     * @return {Promise<Instrument>} - promise when resolved bears Instrument instance {id, name, quantity, description, image_url}
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