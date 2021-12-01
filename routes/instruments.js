'use strict';

import express from 'express';
import { ensureAdmin } from '../middleware/authMiddleware';
import Instrument from '../models/instrument';
import jsonschema from 'jsonschema';
import newInstrumentSchema from '../schemas/newInstrumentSchema.json';
import updateInstrumentSchema from '../schemas/updateInstrumentSchema.json';
import { BadRequestError } from '../expressError';

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
 * 
 * @return list of all instruments
 * 
 * AUTH: none
*/
router.get('/', async (req, res, next) => {
    try {
        const instruments = await Instrument.findAll();
        return res.json({ instruments })
    } catch (e) {
        return next(e);
    }
})


/** GET /instruments/[instId] => { instrument }
 * 
 * @return Instrument instance => {id, name, quantity, description, imageURL, categories: [{id, name}, ...]}
 * 
 * AUTH: none
*/
router.get('/:instId', async (req, res, next) => {
    try {
        const instrument = await Instrument.get(req.params.instId);
        return res.json({ instrument })
    } catch (e) {
        return next(e);
    }
})


/** PATCH /instrument/[instId] { instData } => { inst }
 * 
 * instData can include: 
 *      { name, quantity, description, imageURL }
 * 
 * @return Instrument instance => { name, quantity, description, imageURL }
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


/** DELETE /instruments/[instId] => { deleted: instId }
 * 
 * @return => { deleted: instName (ID: instId)}
 * 
 * AUTH: admin
 */
router.delete('/:instId', ensureAdmin, async (req, res, next) => {
    try {
        const instrument = await Instrument.get(req.params.instId);
        await instrument.remove();
        return res.json({ deleted: `${instrument.name} (ID: ${req.params.instId})`})
    } catch (e) {
        return next(e);
    }
})

export default router;