'use strict';

import express from 'express';
import { ensureLoggedIn } from '../middleware/authMiddleware';
import Reservation from '../models/reservation';
import Instrument from '../models/instrument';
import User from '../models/user';
import jsonschema from 'jsonschema';
import newReservationSchema from '../schemas/newReservationSchema.json';
import updateReservationSchema from '../schemas/updateReservationSchema.json';
import { BadRequestError, UnauthorizedError } from '../expressError';
import convertToUnix from '../helpers/time';
import cors from 'cors';

const router = express.Router();
router.use(cors());

/** POST /reservations { reservation } => { reservation} 
 * 
 * Reservation should be: 
 *      {
 *      INT - userId,
 *      INT - instrumentId,
 *      INT - quantity,
 *      STRING - startTime,
 *      STRING - endTime,
 *      STRING - IANA Timezone,
 *      STRING - notes
 *      }
 * 
 * Times should be formated as an ISO 8601 date and time. Timezone is provided seperately.
 *      YYYY-MM-DD'T'HH:MM:SS
 *      2021-01-01T09:30:00
 * 
 * Timezone should be IANA format: 
 *      "America/New_York"; 
 *      "Asia/Tokyo"
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

        const unixStartTime = convertToUnix(req.body.startTime, req.body.timeZone);
        const unixEndTime = convertToUnix(req.body.endTime, req.body.timeZone);

        const user = await User.get(res.locals.user.username);

        if (!(res.locals.user && (res.locals.user.isAdmin || user.id === req.body.userId))) throw new UnauthorizedError("Must be admin or user trying to make a reservation.");

        const inst = await Instrument.get(req.body.instrumentId);
        const instResvs = await inst.getReservations({
            startTime: unixStartTime,
            endTime: unixEndTime
        });
        const currReserved = instResvs.reduce((sum, next) => {
            return sum += next.quantity
        }, 0);
        const available = inst.quantity - currReserved;
        
        if (req.body.quantity > available) throw new BadRequestError(`Quantity requested exceeds quantity available at intended reservation time. (Requested: ${req.body.quantity}. Quantity available at reservation time: ${available}).`);

        const reservation = await Reservation.create({
            userId: req.body.userId,
            instrumentId: req.body.instrumentId,
            quantity: req.body.quantity,
            startTime: unixStartTime,
            endTime: unixEndTime,
            notes: req.body.notes
        });
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
 *      { quantity, startTime, endTime, timeZone, notes}
 * 
 * Times should be formated as an ISO 8601 date and time. Timezone is provided seperately.
 *      YYYY-MM-DD'T'HH:MM:SS
 *      2021-01-01T09:30:00
 * 
 * Timezone should be IANA format: 
 *      "America/New_York"; 
 *      "Asia/Tokyo"
 * 
 * If either startTime or endTime is included, a timeZone must be included.
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
        };

        if (req.body.startTime && !req.body.timeZone) throw new BadRequestError("A startTime was supplied, but no timeZone was specified. TimeZone must be included when trying to adjust a time.");
        
        if (req.body.endTime && !req.body.timeZone) throw new BadRequestError("An endTime was supplied, but no timeZone was specified. TimeZone must be included when trying to adjust a time.");

        const unixStartTime = req.body.startTime && req.body.timeZone ? convertToUnix(req.body.startTime, req.body.timeZone) : null;
        const unixEndTime = req.body.endTime && req.body.timeZone ? convertToUnix(req.body.endTime, req.body.timeZone) : null;

        const reservation = await Reservation.get(req.params.resvId);
        const currUser = await User.get(res.locals.user.username);
        
        if (!(res.locals.user && (res.locals.user.isAdmin || currUser.id === reservation.userId))) throw new UnauthorizedError('Must be admin or user who made the reservation.');

        if (req.body.quantity) {
            const inst = await Instrument.get(reservation.instrumentId);
            const instResvs = await inst.getReservations({
                startTime: unixStartTime,
                endTime: unixEndTime
            });
            const currReserved = instResvs.reduce((sum, next) => {
                return sum += next.quantity
            }, 0);
            const available = inst.quantity - currReserved;
            
            if (req.body.quantity > (available+reservation.quantity)) throw new BadRequestError(`Quantity requested exceeds quantity available at intended reservation time. (Requested: ${req.body.quantity}. Quantity available at reservation time: ${available+reservation.quantity}).`);
        }
        
        const { quantity, notes } = req.body;
        if (quantity) reservation.quantity = quantity;
        if (unixStartTime) reservation.startTime = unixStartTime;
        if (unixEndTime) reservation.endTime = unixEndTime;
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

        const currUser = await User.get(res.locals.user.username);
        
        if (!(res.locals.user && (res.locals.user.isAdmin || currUser.id === reservation.userId))) throw new UnauthorizedError('Must be admin or user who made the  reservation.');

        await reservation.remove();
        return res.json({ deleted: reservation.id });
    } catch (e) {
        return next(e);
    }
})

export default router;