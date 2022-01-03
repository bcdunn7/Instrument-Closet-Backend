'use strict';

import express from 'express';
import User from '../models/user';
import jsonschema from 'jsonschema';
import userAuthSchema from '../schemas/userAuthSchema.json';
import userRegisterSchema from '../schemas/userRegisterSchema.json';
import { BadRequestError } from '../expressError';
import { createToken } from '../helpers/tokens';
// import cors from 'cors';
// 
const router = express.Router();
// router.use(cors());

/** POST /auth/token { username, password} => { token } 
 * 
 * @return JWT token which can be used to authenticate further requests
 * 
 * AUTH: none
*/
router.post('/token', async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, userAuthSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const { username, password } = req.body;
        const user = await User.authenticate(username, password);
        const token = createToken(user);
        return res.json({ token })
    } catch (e) {
        return next(e);
    }
})

/** POST /auth/register { user } => { token } 
 * 
 * user must include: { username, password, firstName, lastName, email, phone}
 * 
 * AUTH: none
*/
router.post('/register', async (req, res, next) => {
    try {
        const validator = jsonschema.validate(req.body, userRegisterSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const newUser = await User.register({ ...req.body, isAdmin: false });
        const token = createToken(newUser);
        return res.status(201).json({ token });
    } catch (e) {
        return next(e);
    }
})

export default router;