'use strict';

import express from 'express';
import { ensureLoggedIn } from '../middleware/authMiddleware';
import Reservation from '../models/reservation';
import User from '../models/user';
import jsonschema from 'jsonschema';
import newReservationSchema from '../schemas/newReservationSchema.json';
import { BadRequestError, UnauthorizedError } from '../expressError';

const router = express.Router();

/** POST /reservations { reservation } => { reservation} 
 * 
 * Reservation should be: 
 *      {
 *      INT - userId,
 *      INT - instrumentId,
 *      INT - quantity,
 *      DATETIME - startTime,
 *      DATETIME - endTime,
 *      STRING - notes
 *      }
 * 
 * @return Reservation instance => {id, userId, instrumentId, quantity, startTime, endTime, notes}
 * 
 * AUTH: admin or correct user
*/
router.post('/', ensureLoggedIn, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, newReservationSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const user = await User.get(res.locals.user.username);

        if (!(res.locals.user && (res.locals.user.isAdmin || user.id === req.body.userId))) throw new UnauthorizedError("Must be admin or user trying to make a reservation.");

        // remove _token property possibly used for auth
        delete req.body._token;

        const reservation = await Reservation.create(req.body);
        return res.status(201).json({ reservation })
    } catch (e) {
        return next(e);
    }
})


/** GET /reservations => { reservations: [{id, userId, instrumentId, quantity, startTime, endTime, notes}, ...]} 
 * 
 * @return list of all reservations
 * 
 * AUTH: none
*/
router.get('/', async (req, res,next) => {
    try {
        const reservations = await Reservation.findAll();
        return res.json({ reservations })
    } catch (e) {
        return next(e);
    }
})


/** GET /reservations/[resvId] => { reservation }
 * 
 * @return Reservation instance => {id, userId, instrumentId, quantity, startTime, endTime, notes}
 * 
 * AUTH: none
 */
router.get('/:resvId', async (req, res, next) => {
    try {
        const reservation = await Reservation.get(req.params.resvId);
        return res.json({ reservation })
    } catch (e) {
        return next(e);
    }
})


/** PATCH /reservations/[resvId] { resvData } => { resv }
 * 
 * resvData can include:
 *      { quantity, startTime, endTime, notes}
 * 
 * @return Reservation instance => {id, userId, instrumentId, quantity, startTime, endTime, notes}
 * 
 * AUTH: admin or correct user
 */
router.patch('/:resvId', ensureLoggedIn, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, 
        //TODO: write schema
            );
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const reservation = await Reservation.get(req.params.resvId);

        // maybe i just write middleware for this if possible
        //check if userId on reservation is same user as one on request or admin

        const { quantity, startTime, endTime, notes } = req.body;
        if (quantity) reservation.quantity = quantity;
        if (startTime) reservation.startTime = startTime;
        if (endTime) reservation.endTime = endTime;
        if (notes) reservation.notes = notes;

        await reservation.save();

        return res.json({ reservation })
    } catch (e) {
        return next(e);
    }
})


/** DELETE /reservations/[resvId] => { deleted: resvId }
 * 
 * @return => { deleted: resvId }
 * 
 * AUTH: admin or correct user
 */
router.delete('/:resvId', ensureLoggedIn, async (req, res, next) => {
    try {
        const reservation = await Reservation.get(req.params.resvId);
        await reservation.remove();
        return res.json({ deleted: reservation.id });
    } catch (e) {
        return next(e);
    }
})

export default router;