'use strict';

import express from 'express';
import { ensureAdmin, ensureLoggedIn } from '../middleware/authMiddleware';
import Instrument from '../models/instrument';
import jsonschema from 'jsonschema';
import newInstrumentSchema from '../schemas/newInstrumentSchema.json';
import updateInstrumentSchema from '../schemas/updateInstrumentSchema.json';
import getReservationsSchema from '../schemas/getReservationsSchema.json';
import toggleCategorySchema from '../schemas/toggleCategorySchema.json';
import searchInstrumentsSchema from '../schemas/searchInstrumentsSchema.json';
import { BadRequestError } from '../expressError';
import convertToUnix from '../helpers/time';

const router = express.Router();

/** POST /instruments { instrument } => { instrument }
 * 
 * Instrument should be: {name, quantity, description, imageURL}
 * Description and imageURL are optional
 * 
 * @return Instrument instance => {id, name, quantity, description, imageURL, categories: [{id, name}, ...]}
 * 
 * AUTH: admin
 */
router.post('/', ensureAdmin, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, newInstrumentSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        // remove _token property possibly used for auth
        delete req.body._token;

        const instrument = await Instrument.create(req.body);
        return res.status(201).json({ instrument })
    } catch (e) {
        return next(e);
    }
})


/** GET /instruments => { instruments: [{id, name, quantity, description, imageURL, categories: [{id, name}, ...]}, ...]} 
 * @param {string} name - optional nameLike to find case insensitive partial matches
 * 
 * @return list of all instruments
 * 
 * AUTH: logged-in
*/
router.get('/', ensureLoggedIn, async (req, res, next) => {
    const q = req.query;

    try {
        const validator = jsonschema.validate(q, searchInstrumentsSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const instruments = await Instrument.findAll(q);
        return res.json({ instruments })
    } catch (e) {
        return next(e);
    }
})


/** GET /instruments/[instId] => { instrument }
 * 
 * @return Instrument instance => {id, name, quantity, description, imageURL, categories: [{id, name}, ...]}
 * 
 * AUTH: logged-in
*/
router.get('/:instId', ensureLoggedIn, async (req, res, next) => {
    try {
        const instrument = await Instrument.get(req.params.instId);
        return res.json({ instrument })
    } catch (e) {
        return next(e);
    }
})


/** PATCH /instruments/[instId] { instData } => { inst }
 * 
 * instData can include: 
 *      { name, quantity, description, imageURL }
 * 
 * @return Instrument instance => {id, name, quantity, description, imageURL, categories: [{id, name}, ...]}
 * 
 * AUTH: admin
*/
router.patch('/:instId', ensureAdmin, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, updateInstrumentSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const instrument = await Instrument.get(req.params.instId);

        const { name, quantity, description, imageURL } = req.body;
        if (name) instrument.name = name;
        if (quantity) instrument.quantity = quantity;
        if (description) instrument.description = description;
        if (imageURL) instrument.imageURL = imageURL;

        await instrument.save();

        return res.json({ instrument })
    } catch (e) {
        return next(e);
    }
})


/** DELETE /instruments/[instId] => { deleted: instName (ID: instId) }
 * 
 * @return => { deleted: instName (ID: instId)}
 * 
 * AUTH: admin
 */
router.delete('/:instId', ensureAdmin, async (req, res, next) => {
    try {
        const instrument = await Instrument.get(req.params.instId);
        await instrument.remove();
        return res.json({ deleted: `${instrument.name} (ID: ${req.params.instId})`});
    } catch (e) {
        return next(e);
    }
})

/** GET /instruments/[instId]/reservations 
 * optional { startTime, endTime, timeZone }=> { reservations: [{id, userId, instrumentId, startTime, endTime, notes}, ...]} 
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
 * @return => { reservations: [{id, userId, instrumentId, startTime, endTime, notes}, ...]}
 * 
 * AUTH: logged-in
*/
router.get('/:instId/reservations', ensureLoggedIn, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, getReservationsSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        };
        
        if (req.body.startTime && !req.body.timeZone) throw new BadRequestError("A startTime was supplied, but no timeZone was specified. TimeZone must be included when trying to query by time.");
        
        if (req.body.endTime && !req.body.timeZone) throw new BadRequestError("An endTime was supplied, but no timeZone was specified. TimeZone must be included when trying to query by time.");
        
        const unixStartTime = req.body.startTime && req.body.timeZone ? convertToUnix(req.body.startTime, req.body.timeZone) : null;
        const unixEndTime = req.body.endTime && req.body.timeZone ? convertToUnix(req.body.endTime, req.body.timeZone) : null;
        
        const instrument = await Instrument.get(req.params.instId);

        const queryParameters = {};
        if (unixStartTime) queryParameters['startTime'] = unixStartTime;
        if (unixEndTime) queryParameters['endTime'] = unixEndTime;
        
        const reservations = await instrument.getReservations(queryParameters);

        return res.json({ reservations })
    } catch (e) {
        return next(e);
    }
})

/** POST /instruments/[instId]/categories { categoryId } => { Added: 'category ([categoryId]) added to instrument ([instId])'}
 * 
 * @return message confirming addition
 * 
 * AUTH: admin 
 */
router.post('/:instId/categories', ensureAdmin, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, toggleCategorySchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        };

        const instrument = await Instrument.get(req.params.instId);

        await instrument.addCategory(req.body.categoryId);

        return res.json({ Added: `Category (${req.body.categoryId}) added to instrument (${req.params.instId})`})
    } catch (e) {
        return next(e);
    }
})

/** DELETE /instruments/[instId]/categories { categoryId }=> { Deleted: 'category ([categoryId]) removed from instrument ([instId])'}
 * 
 * @return message confirming deletion
 * 
 * AUTH: admin 
 */
router.delete('/:instId/categories', ensureAdmin, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, toggleCategorySchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        };

        const instrument = await Instrument.get(req.params.instId);

        await instrument.removeCategory(req.body.categoryId);

        return res.json({ Deleted: `Category (${req.body.categoryId}) removed from instrument (${req.params.instId})`})
    } catch (e) {
        return next(e);
    }
})

export default router;