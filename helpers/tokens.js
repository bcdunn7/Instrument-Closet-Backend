'use strict';

import jwt from 'jsonwebtoken';
import { SECRET_KEY } from '../config';

/** Generate signed JWT from User
 * @param {User} user - User instance
 * 
 * @return JWT
 */
function createToken(user) {
    return jwt.sign({
        username: user.username, 
        isAdmin: user.isAdmin || false
    }, SECRET_KEY)
}

export { createToken };
