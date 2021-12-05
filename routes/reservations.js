'use strict';

import express from 'express';
import { ensureLoggedIn } from '../middleware/authMiddleware';
import Reservation from '../models/reservation';
import User from '../models/user';
import jsonschema from 'jsonschema';
import newReservationSchema from '../schemas/newReservationSchema.json';
import updateReservationSchema from '../schemas/updateReservationSchema.json';
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
 * AUTH: logged-in
*/
router.get('/', ensureLoggedIn, async (req, res,next) => {
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
 * AUTH: logged-in
 */
router.get('/:resvId', ensureLoggedIn, async (req, res, next) => {
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
        const validator = jsonschema.validate(req.body, updateReservationSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const reservation = await Reservation.get(req.params.resvId);
        const currUser = await User.get(res.locals.user.username);
        
        if (!(res.locals.user && (res.locals.user.isAdmin || currUser.id === reservation.userId))) throw new UnauthorizedError('Must be admin or user who made the reservation.');
        
        const { quantity, startTime, endTime, notes } = req.body;
        if (quantity) reservation.quantity = quantity;
        if (startTime) reservation.startTime = startTime;
        if (endTime) reservation.endTime = endTime;
        if (notes) reservation.notes = notes;

        await reservation.save();

        // "Need" this step - can't just return reservation since timestamp is formatted differently when coming out of database
        const updatedResv = await Reservation.get(req.params.resvId)

        return res.json({ reservation: updatedResv })
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

        const currUser = await User.get(res.locals.user.username);
        
        if (!(res.locals.user && (res.locals.user.isAdmin || currUser.id === reservation.userId))) throw new UnauthorizedError('Must be admin or user who made the  reservation.');

        await reservation.remove();
        return res.json({ deleted: reservation.id });
    } catch (e) {
        return next(e);
    }
})

export default router;