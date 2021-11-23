'use strict';

/** Middleware to consolidate and abstract authenticate in routes */

import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../expressError';
import { SECRET_KEY } from '../config';

/** MIDDLEWARE: authenticate jwt from user
 * 
 * Can accept token from header via authorization bearer or in request body under "_token"
 * 
 * If token was provided via header, verify and store payload if valid on res.locals. Return next() regardless of validity.
 *     payload: {
 *          username: string,
 *          isAdmin: boolean
 *      }
 * 
 * If no header token provided, check for _token in body and do the same.
 * 
 * If neither, simply return next()
 */
function authenticateJWT(req, res, next) {
    try {
        // Check for token in header
        const authBearer = req.headers && req.headers.authorization;
        if (authBearer) {
            const tokenFromHeader = authBearer.replace(/^[Bb]earer /,"").trim();
            res.locals.user = jwt.verify(tokenFromHeader, SECRET_KEY);
            return next();
        }

        // Check for token in body
        const tokenFromBody = req.body._token;
        if (tokenFromBody) {
            res.locals.user = jwt.verify(tokenFromBody, SECRET_KEY);
        }
        return next();
    } catch (e) {
        return next();
    }
}

/** MIDDLEWARE: ensure a user is logged in
 * 
 * @throws {UnauthorizedError} - if not logged in
 */
function ensureLoggedIn(req, res, next) {
    try {
        if (!res.locals.user) throw new UnauthorizedError('Must be logged in.')
        return next();
    } catch (e) {
        return next(e);
    }
}


/** MIDDLEWARE: ensure a user is admin 
 * 
 * @throws {UnauthorizedError} - if not admin
*/
function ensureAdmin(req, res, next) {
    try {
        if (!res.locals.user || !res.locals.user.isAdmin) throw new UnauthorizedError('Must be admin.')
        return next();
    } catch (e) {
        return next(e);
    }
}

/** MIDDLEWARE: ensure correct user or admin 
 * 
 * @throws {UnauthorizedError} - if neither correct user or admin
*/
function ensureCorrectUserOrAdmin(req, res, next) {
    try {
        if (!(res.locals.user && (res.locals.user.isAdmin || res.locals.user.username === req.params.username))) throw new UnauthorizedError();
        return next();
    } catch (e) {
        return next(e);
    }
}

export {
    authenticateJWT,
    ensureLoggedIn,
    ensureAdmin,
    ensureCorrectUserOrAdmin
}