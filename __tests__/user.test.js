'use strict';

import User from '../models/user';
import db from '../db';
import bcrypt from 'bcrypt';
import { 
    NotFoundError, 
    BadRequestError, 
    UnauthorizedError
} from '../expressError';
import { BCRYPT_WORK_FACTOR } from '../config';

beforeAll(async () => {
    await db.query('DELETE FROM users');

    await db.query(`
    INSERT INTO users (username, password, first_name, last_name, email, phone, is_admin) 
    VALUES ('user1', $1, 'u1first', 'u1last', 'u1@email.com', '1005559999', 'FALSE'),
    ('user2', $2, 'u2first', 'u2last', 'u2@email.com', '2005559999', 'FALSE'),
    ('admin1', $3, 'a1first', 'a1last', 'a1@email.com', '1115559999', 'TRUE')
    `,
    [
        await bcrypt.hash('password1', BCRYPT_WORK_FACTOR),
        await bcrypt.hash('password2', BCRYPT_WORK_FACTOR),
        await bcrypt.hash('passworda1', BCRYPT_WORK_FACTOR)
    ])
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('authenticate', () => {
    it('correctly authenticates', async () => {
        const user = await User.authenticate('user1', 'password1');

        expect(user).toEqual({
            username: 'user1',
            firstName: 'u1first',
            lastName: 'u1last',
            email: 'u1@email.com',
            phone: '1005559999',
            isAdmin: false
        })
    })

    it('returns a User instance', async () => {
        const user = await User.authenticate('user1', 'password1');

        expect(user).toBeInstanceOf(User);
    })

    it('throws unauth if no such user', async () => {
        try {
            await User.authenticate('notauser', 'password');
        } catch (e) {
            expect(e).toBeInstanceOf(UnauthorizedError);
            expect(e.message).toEqual('Username not recognized')
        }
    })

    it('throws unauth if wrong pasword', async () => {
        try {
            await User.authenticate('user1', 'wrongpass');
        } catch (e) {
            expect(e).toBeInstanceOf(UnauthorizedError);
            expect(e.message).toEqual('Invalid password');
        }
    })
})

describe('register', () => {
    it('registers user', async () => {
        const newUser = await User.register({
            username: 'newuser',
            password: 'password',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        })

        expect(newUser).toEqual({
            username: 'newuser',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        });
    })

    it('returns new User instance', async () => {
        const newUser = await User.register({
            username: 'newuser',
            password: 'password',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        })

        expect(newUser).toBeInstanceOf(User);
    })

    it('throws badrequest if duplicate username', async () => {
        try {
            await User.register({
                username: 'user1',
                password: 'password',
                firstName: 'first',
                lastName: 'last',
                email: 'email@emai.com',
                phone: '1112223333',
                isAdmin: false
            });
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('Duplicate username: user1');
        }
    })
})


afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})