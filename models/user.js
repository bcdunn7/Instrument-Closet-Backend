'use strict';

import db from '../db';
import bcrypt from 'bcrypt';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../expressError';

import { BCRYPT_WORK_FACTOR } from '../config';

/** User database model */
class User {

    /** Constructor for User class
     * @constructor
     */
    constructor({ id, username, firstName, lastName, email, phone, isAdmin }) {
        this.id = id;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.isAdmin = isAdmin;
    }

    /** Authenticate user with username, password.
     * @static
     * @async
     * @param {string} username - username
     * @param {string} password - hashed password
     * 
     * @return {Promise<User>} - Promise when resolved bears User Instance with { username, firstName, lastName, email, phone, isAdmin}
     * @throws {UnauthorizedError} if username or password is incorrect
     */
    static async authenticate(username, password) {
        // try to find user first
        const res = await db.query(`
            SELECT id,
                    username,
                    password,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    email,
                    phone,
                    is_admin AS "isAdmin"
            FROM users
            WHERE username = $1`,
            [username]
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
     * @static
     * @async
     * @param {obj} userData - object of user data with:
     *      {string} username - username
     *      {string} password - password
     *      {string} firstName - first name
     *      {string} lastName - last name
     *      {string} email - email
     *      {string} phone - phone
     *      {boolean} isAdmin - boolean for if user is admin
     * 
     * @return {Promise<User>} - Promise when resolved bears User Instance with { username, firstName, lastName, email, phone, isAdmin}     
     * @throws {BadRequestError} if duplicate username
     */
    static async register({ username, password, firstName, lastName, email, phone, isAdmin }) {
        // Duplicate check
        const usernameTaken = await db.query(`
            SELECT username
            FROM users
            WHERE username = $1`, 
            [username]);

        if (usernameTaken.rows[0]) throw new BadRequestError(`Duplicate username: ${username}`);

        const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

        const res = await db.query(`
            INSERT INTO users
                (username, password, first_name, last_name, email, phone, is_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, username, first_name AS "firstName", last_name AS "lastName", email, phone, is_admin AS "isAdmin"`,
            [
                username,
                hashedPassword,
                firstName,
                lastName,
                email,
                phone,
                isAdmin
        ]);

        return new User(res.rows[0])
    }

    /** Find all users
     * @static
     * @async
     * 
     * @return {Promise<Array>} - promise when resolved bears array of User instances: [{ username, firstName, lastName, email, phone, isAdmin}, ...]
     */
    static async findAll() {
        const res = await db.query(`
            SELECT id,
                    username,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    email,
                    phone,
                    is_admin AS "isAdmin"
            FROM users
            ORDER BY username
        `)

        const users = res.rows.map(u => new User(u));
        return users;
    }

    /** Get a user
     * @static
     * @async
     * @param {string} username - username of intended user
     * 
     * @returns {Promise<User>} - promise when resolved bears User instance
     * @throws {NotFoundError} - if username not found
     */
    static async get(username) {
        const res = await db.query(`
            SELECT id,
                    username,
                    first_name AS "firstName",
                    last_name AS "lastName",
                    email,
                    phone,
                    is_admin AS "isAdmin"
            FROM users
            WHERE username = $1`,
            [username]);

        if (!res.rows[0]) throw new NotFoundError(`User not found: ${username}`);

        const user = new User(res.rows[0]);
        return user;
    }

    /** Save Instrument
     * @async
     * 
     * Can only change firstName, lastName, email, and phone with this method
     * 
     * Since these are instantiated models, the instance can be updated programatically and then simply saved to the database:
     * const user = User.get('user1');
     * user.firstName = 'newname';
     * user.save();
     */
    async save() {
        await db.query(`
            UPDATE users
            SET first_name=$1, last_name=$2, email=$3, phone=$4
            WHERE id=$5`,
            [this.firstName, this.lastName, this.email, this.phone, this.id]);
    }

    /** Deletes user
     * @async
     * 
     * Deletes user from database, called on instance.
     */
    async remove() {
        await db.query(`
            DELETE
            FROM users
            WHERE id = $1`,
            [this.id]);
    }
}

export default User;