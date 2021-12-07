'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';
import Category from './category';
import Reservation from './reservation';

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
     * @return {Promise<array>} - promise when resolved bears instrumets array [{id, name, quantity, description, imageURL, categories: [{id, category}, ...]}, ...]
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

        const instruments = await Promise.all(res.rows.map(async (i) => {
            const inst = new Instrument(i);
            inst.categories = await inst.getCategories();
            return inst;
        }));
        return instruments;
    }

    /** Get Instrument
     * @static
     * @async
     * @param {int} id - instrument id
     * 
     * @return {Promise<Instrument>} - promise when resolved bears Instrument instance {id, name, quantity, description, image_url, categories: [{id, category}, ...]}
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
        instrument.categories = await instrument.getCategories();
        return instrument;
    }

    /** Get Categories
     * @async
     * 
     * Called on instance.
     * @return {Promise<Array>} array of categories that the instrument belongs to
     */
    async getCategories() {
        const res = await db.query(`
            SELECT c.id, c.category
            FROM categories c
            JOIN instrument_category n
            ON c.id = n.category_id
            WHERE n.instrument_id = $1`,
            [this.id])

        const cats = res.rows.map(c => new Category(c));
        return cats;
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
     * @throws {BadRequestError} if category already added to instrument
     */
    async addCategory(categoryId) {
        const checkForCategory = await db.query(`
            SELECT id
            FROM categories
            WHERE id = $1`,
            [categoryId]);

        if(!checkForCategory.rows[0]) throw new NotFoundError(`No Category with id: ${categoryId}`);

        const checkAlreadyAdded = await db.query(`
            SELECT instrument_id
            FROM instrument_category
            WHERE instrument_id = $1 AND category_id = $2`,
            [this.id, categoryId]);
        
        if (checkAlreadyAdded.rows[0]) throw new BadRequestError('Category already added to this instrument.')

        await db.query(`
            INSERT INTO instrument_category
                (instrument_id, category_id)
            VALUES ($1, $2)`,
            [this.id, categoryId]);
    }

    /** Remove category from instrument: deletes database entry in the instrument_category table
     * @async
     * @param {int} categoryId
     */
    async removeCategory(categoryId) {
        await db.query(`
            DELETE FROM instrument_category
            WHERE instrument_id = $1 AND category_id = $2`,
            [this.id, categoryId]);
    }

    /** Get reservations of this instrument. Optional timeframe params.
     * @async
     * @param {int} startTime - optional startTime which will filter results to only those reservations which include time after startTime
     * @param {int} endTime - optional endTime which will filter results to only those reservations which include time before endTime
     * ^ These params are unix seconds times
     * 
     * @return {Promies<Array>} - promise when resolved bears array with reservations: [{id, userId, instrumentId, quantity, startTime, endTime, notes}, ...]
     * 
     * @throws {BadRequestError} - if end time is before start time
     */
    async getReservations({ startTime, endTime } = {}) {
        if (startTime && endTime && startTime > endTime) {
            throw new BadRequestError('End time cannot be before start time.')
        }

        let query = `
            SELECT r.id,
                    r.user_id AS "userId",
                    r.instrument_id AS "instrumentId",
                    r.quantity,
                    r.start_time AS "startTime",
                    r.end_time AS "endTime",
                    r.notes
            FROM reservations r
            WHERE r.instrument_id = $1 `

        let whereExpressions = [];
        let queryValues = [this.id];

        if (endTime !== undefined) {
            queryValues.push(endTime);
            whereExpressions.push(`r.start_time < $${queryValues.length}`);
        }

        if (startTime !== undefined) {
            queryValues.push(startTime);
            whereExpressions.push(`r.end_time > $${queryValues.length}`);
        }

        if (whereExpressions.length > 0) {
            query += "AND " + whereExpressions.join(" AND ")
        }

        const res = await db.query(query, queryValues);

        const reservations = res.rows.map(r => new Reservation(r));
        return reservations;
    }
} 

export default Instrument;