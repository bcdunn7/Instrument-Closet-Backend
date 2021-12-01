'use strict';

import express from 'express';
import { ensureLoggedIn } from '../middleware/authMiddleware';
import Reservation from '../models/reservation';
import jsonschema from 'jsonschema';
import newReservationSchema from '../schemas/newReservationSchema.json';
import { BadRequestError } from '../expressError';

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
 * AUTH: 
*/
router.post('/', ensureLoggedIn, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, newReservationSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        // remove _token property possibly used for auth
        delete req.body._token;

        const reservation = await Reservation.create(req.body);
        return res.status(201).json({ reservation })
    } catch (e) {
        return next(e);
    }
})