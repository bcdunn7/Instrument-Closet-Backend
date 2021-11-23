'use strict';

import jwt from 'jsonwebtoken';
import { createToken } from "../helpers/tokens";
import User from '../models/user';
import db from '../db';
import { SECRET_KEY } from '../config';

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('createToken', () => {
    it('creates token for nonadmin', () => {
        const newUser = new User({
            username: 'newuser',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        })
        const token = createToken(newUser);

        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            username: 'newuser',
            isAdmin: false
        })
    })

    it('creates token for admin', () => {
        const newUser = new User({
            username: 'newuser',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: true
        })
        const token = createToken(newUser);

        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            username: 'newuser',
            isAdmin: true
        })
    })

    it('defaults false if no isAdmin on User', () => {
        const newUser = new User({
            username: 'newuser',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333'
        })
        const token = createToken(newUser);

        const payload = jwt.verify(token, SECRET_KEY);
        expect(payload).toEqual({
            iat: expect.any(Number),
            username: 'newuser',
            isAdmin: false
        })
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})