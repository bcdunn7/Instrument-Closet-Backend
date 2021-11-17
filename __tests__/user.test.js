'use strict';

import User from '../models/user';
import db from '../db';
import bcrypt from 'bcrypt';
import { 
    NotFoundError, 
    BadRequestError, 
    UnauthorizationError 
} from '../expressError';
import { BCRYPT_WORK_FACTOR } from '../config';

beforeAll(async () => {
    await db.query('DELETE FROM users');

    await db.query(`
    INSERT INTO users (username, password, first_name, last_name, email, phone, is_admin) 
    VALUES ('user1', $1, 'u1firt', 'u1last', 'u1@email.com', '1005559999', 'FALSE'),
    ('user2', $2, 'u2firt', 'u2last', 'u2@email.com', '2005559999', 'FALSE')
    `,
    [
        await bcrypt.hash('password1', BCRYPT_WORK_FACTOR),
        await bcrypt.hash('password2', BCRYPT_WORK_FACTOR)
    ])
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('authenticate', () => {
    it('correctly authenticates', async () => {
        const user = await User.authenticate('user1', 'password');

        expect(user).toBe(1)
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})