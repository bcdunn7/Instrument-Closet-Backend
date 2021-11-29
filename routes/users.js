'use strict';

import express from 'express';
import { ensureCorrectUserOrAdmin, ensureAdmin } from '../middleware/authMiddleware';
import User from '../models/user';
import { createToken } from '../helpers/tokens';
import { BadRequestError } from '../expressError';

const router = express.Router();

/** GET / => { users: [{username, firstName, lastName, email, phone, isAdmin}, ...]} 
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

export default router;