'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';
import { DateTime } from 'luxon';

/** Reservation database model */
class Reservation {
    /** Constructor for Reservation class
     * @constructor
     */
    constructor({ id, userId, instrumentId, quantity, startTime, endTime, notes=null }) {
        this.id = id;
        this.userId = userId;
        this.instrumentId = instrumentId;
        this.quantity = quantity;
        this.startTime = startTime;
        this.endTime = endTime;
        this.notes = notes;
    }

    /** Create reservation
     * @static
     * @async
     * @param {obj} data - reservation data with:
     *      {int} userId
     *      {int} instrumentId
     *      {int} quantity
     *      {int} startTime (unix)
     *      {int} endTime (unix)
     *      {string} notes
     * 
     * @return {Promise<Reservation>} - promise when resolved bears reservation {id, userId, instrumentId, quantity, startTime, endTime, notes}
     * @throws {BadRequestError} if quantity is a negative or non-integer number; if endTime is before startTime
     * @throws {NotFoundError} if user of instrument not found
     */
    static async create({ userId, instrumentId, quantity, startTime, endTime, notes }) {
        if (startTime > endTime) {
            throw new BadRequestError('End time cannot be before start time.')
        }

        if (quantity <= 0 || !Number.isInteger(quantity)) throw new BadRequestError('Quantity must be a positive integer.')

        const checkUser = await db.query(`
            SELECT id
            FROM users
            WHERE id = $1`,
            [userId]);

        if (!checkUser.rows[0]) throw new NotFoundError(`No User with id: ${userId}`)

        const checkInst = await db.query(`
            SELECT id, quantity
            FROM instruments
            WHERE id = $1`,
            [instrumentId]);

            
        if (!checkInst.rows[0]) throw new NotFoundError(`No Instrument with id: ${instrumentId}`)
            
        // const instReservations = await Reservation.getallreservationsforinstrument()

        // check if intended quantity is < than quantity - quantities of current reservations.

        const res = await db.query(`
            INSERT INTO reservations
                (user_id, instrument_id, quantity, start_time, end_time, notes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id,
                    user_id AS "userId",
                    instrument_id AS "instrumentId",
                    quantity,
                    start_time AS "startTime",
                    end_time AS "endTime",
                    notes`,
            [userId, instrumentId, quantity, startTime, endTime, notes]);

        const reservation = new Reservation(res.rows[0]);
        return reservation;
    }

    /** Find all Reservations
     * @static
     * @async
     * 
     * @return {Promise<Array>} - promise when resolved bears reservations array [{userId, instrumentId, quantity, startTime, endTime, notes}, ...]
     */
    static async findAll() {
        const res = await db.query(`
            SELECT id, user_id AS "userId", instrument_id AS "instrumentId", quantity, start_time AS "startTime", end_time AS "endTime", notes
            FROM reservations    
        `);

        const reservations = res.rows.map(r => new Reservation(r));
        return reservations;
    }

    /** Get Reservation
     * @static
     * @async
     * @param {int} id - reservation id
     * 
     * @return {Promise<Reservation>} - promise when resolved bears Reservation instance {userId, instrumentId, quantity, startTime, endTime, notes}
     * @throws {NotFoundError} if reservation with id not found
     */
    static async get(id) {
        const res = await db.query(`
            SELECT id, user_id AS "userId", instrument_id AS "instrumentId", quantity, start_time AS "startTime", end_time AS "endTime", notes
            FROM reservations
            WHERE id = $1`,
            [id]);

        if (!res.rows[0]) throw new NotFoundError(`No Reservation with id: ${id}`);

        const reservation = new Reservation(res.rows[0]);
        return reservation;
    }

    /** Save Reservation
     * @async
     * 
     * Can only change quantity, startTime, endTime, and notes with this method
     * 
     *  Since these are instantiated models, the instance can be updated programatically and then simply saved to the database: 
     * const resv = Reservation.get(1);
     * resv.notes = 'newnotes'; 
     * resv.save();
     */
    async save() {
        if (this.startTime > this.endTime) {
            throw new BadRequestError('End time cannot be before start time.')
        }

        if (this.quantity <= 0 || !Number.isInteger(this.quantity)) throw new BadRequestError('Quantity must be a positive integer.')

        await db.query(`
            UPDATE reservations
            SET quantity=$1, start_time=$2, end_time=$3, notes=$4`,
            [this.quantity, this.startTime, this.endTime, this.notes]);
    }

    /** Deletes Reservation
     * @async
     * 
     * Delets reservation from database, called on instance
     */
    async remove() {
        await db.query(`
            DELETE
            FROM reservations
            WHERE id = $1`,
            [this.id]);
    }
}

export default Reservation;