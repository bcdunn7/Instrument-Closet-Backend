'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

/** Instrument database model */
class Instrument {

    /** Constructor for Instrument class
     * @construtor
     */
    constructor({ id, name, quantity, description, imageURL, categories=[] }) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
        this.description = description;
        this.imageURL = imageURL;
        this.categories = categories;
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
     * @return {Promise<Instrument>} - promise when resolved bears instrumet {id, name, quantity, description, image_url}
     * @throws {BadRequestError} if quantity is a negative number or non-integer
     */
    static async create({ name, quantity, description=null, imageURL=null }) {
        if (quantity < 0 || !Number.isInteger(quantity)) throw new BadRequestError("Quantity must be a nonnegative integer.")

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
     * @param {int} id - instrument id
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

        const instCatRes = await db.query(`
            SELECT i.category_id
            FROM instrument_category AS i
            WHERE i.instrument_id = $1`,
            [id]);

        const instrument = new Instrument(res.rows[0]);
        instrument.categories = instCatRes.rows.map(c => c.category_id);
        return instrument;
    }

    /** Save Instrument
     * @async
     * 
     * Since these are instantiated models, the instance can be updated programatically and then simply saved to the database: 
     * const inst = Instrumnet.get(1);
     * inst.name = 'newname'; 
     * inst.save();
     */
    async save() {
        if (this.quantity < 0 || !Number.isInteger(this.quantity)) throw new BadRequestError("Quantity must be a nonnegative integer.")


        await db.query(`
            UPDATE instruments
            SET name=$1, quantity=$2, description=$3, image_url=$4
            WHERE id = $5`,
            [this.name, this.quantity, this.description, this.imageURL, this.id]);
    }

    /** Delete instrument 
     * @async
     * 
     * Deletes instrument from database, called on instance.
     */
    async remove() {
        await db.query(`
            DELETE FROM instruments
            WHERE id = $1`,
            [this.id]);
    }

    /** Add category to instrument: creates a database entry in the instrument_category table
     * @async
     * @param {int} categoryId
     * 
     * @throws {NotFoundError} if category with id not found
     */
    async addCategory(categoryId) {
        const checkForCategory = await db.query(`
            SELECT id
            FROM categories
            WHERE id = $1`,
            [categoryId]);

        if(!checkForCategory.rows[0]) throw new NotFoundError(`No Category with id: ${categoryId}`);

        await db.query(`
            INSERT INTO instrument_category
                (instrument_id, category_id)
            VALUES ($1, $2)`,
            [this.id, categoryId]);
    }
}

export default Instrument;