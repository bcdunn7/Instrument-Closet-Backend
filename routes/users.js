'use strict';

import express from 'express';
import { ensureCorrectUserOrAdmin, ensureAdmin } from '../middleware/authMiddleware';
import User from '../models/user';
import jsonschema from 'jsonschema';
import updateUserSchema from '../schemas/updateUserSchema.json';
import { BadRequestError } from '../expressError';

const router = express.Router();

/** GET /users => { users: [{username, firstName, lastName, email, phone, isAdmin}, ...]} 
 * 
 * @return list of all users
 * 
 * AUTH: admin
*/
router.get('/', ensureAdmin, async (req, res, next) => {
    try {
        const users = await User.findAll();
        return res.json({ users });
    } catch (e) {
        return next(e);
    }
})


/** GET /users/[username] => { user }
 * 
 * @return User instance => {username, firstName, lastName, email, phone, isAdmin}
 * 
 * AUTH: admin or same user as [username]
 */
router.get('/:username', ensureCorrectUserOrAdmin, async (req, res, next) => {
    try {
        const user = await User.get(req.params.username);
        return res.json({ user })
    } catch (e) {
        return next(e);
    }
})


/** PATCH /users/username  { userData } => { user }
 * 
 * userData can include:
 *      { firstName, lastName, email, phone }
 * 
 * @return User instance => {username, firstName, lastName, email, phone, isAdmin}
 * 
 * AUTH: admin or same user as [username]
 */
router.patch('/:username', ensureCorrectUserOrAdmin, async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, updateUserSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const user = await User.get(req.params.username);

        const { firstName, lastName, email, phone } = req.body;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) user.email = email;
        if (phone) user.phone = phone;

        await user.save();

        return res.json({ user })
    } catch (e) {
        return next(e);
    }
})

/** DELETE /users/[username]
 *  
 * AUTH: admin or same user as [username]
 */
router.delete('/:username', ensureCorrectUserOrAdmin, async (req, res, next) => {
    try {
        const user = await User.get(req.params.username);
        await user.remove();
        return res.json({ deleted: req.params.username })
    } catch (e) {
        return next(e);
    }
})

export default router;