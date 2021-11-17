'use strict';

import db from '../db';
import bcrypt from 'bcrypt';
import { ExpressError, UnauthorizedError, BadRequestError } from '../expressError';

import { BCRYPT_WORK_FACTOR } from '../config';

/** User database model */
class User {

    /** Constructor for User class
     * @constructor
     */
    constructor({ username, firstName, lastName, email, phone, isAdmin }) {
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.isAdmin = isAdmin;
    }

    /** Authenticate user with username, password.
     * @async
     * @static
     * @param {string} username - username
     * @param {string} password - hashed password
     * @return {User} - User Instance with { username, firstName, lastName, email, phone, isAdmin}
     * @throws {UnauthorizedError} if username or password is incorrect
     */
    static async authenticate(username, password) {
        // try to find user first
        const res = await db.query(`
            SELECT username,
                    password,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    email,
                    phone,
                    is_admin AS "isAdmin"
            FROM users
            WHERE username = $1`,
            [username],
        );

        const userData = res.rows[0];

        if (userData) {
            // validate password
            const isValid = await bcrypt.compare(password, userData.password);

            if (isValid === true) {
                delete userData.password;
                return new User(userData);
            } else if (isValid === false) {
                throw new UnauthorizedError("Invalid password");
            }
        } else if (!userData) {
            throw new UnauthorizedError("Username not recognized");
        }
    }

    /** Register user with data
     * 
     * @async
     * @static
     * @param {string} username - username
     * @param {string} password - password
     * @param {string} firstName - first name
     * @param {string} lastName - last name
     * @param {string} email - email
     * @param {string} phone - phone
     * @param {boolean} isAdmin - boolean for if user is admin
     * @return {User} - User Instance with { username, firstName, lastName, email, phone, isAdmin}     
     * @throws {BadRequestError} if duplicate username
     */
    static async register({ username, password, firstName, lastName, email, phone, isAdmin}) {
        // TODO
    }
}

export default User;