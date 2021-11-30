'use strict';

import app from '../app';
import db from '../db';
import User from '../models/user';

const request = require('supertest');

beforeAll(async () => {
    await db.query('DELETE FROM users');

    const u1 = await User.register({
        username: 'testuser1',
        password: 'password',
        firstName: 'u1first',
        lastName: 'u1last',
        email: 'u1@email.com',
        phone: '1112223333',
        isAdmin: false
    })
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('POST /auth/token', () => {
    it('returns token', async () => {
        const resp = await request(app)
            .post('/auth/token')
            .send({
                username: 'testuser1',
                password: 'password'
            })

        expect(resp.body).toEqual({
            "token": expect.any(String)
        })
    })
   
    it('unauth for non-existent user', async () => {
        const resp = await request(app)
            .post('/auth/token')
            .send({
                username: 'notauser',
                password: 'password'
            })

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toMatch(/Username not recognized/);
    })
    
    it('unauth for wrong password user', async () => {
        const resp = await request(app)
            .post('/auth/token')
            .send({
                username: 'testuser1',
                password: 'wrong'
            })

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toMatch(/Invalid password/);
    })
   
    it('bad request with missing data', async () => {
        const resp = await request(app)
            .post('/auth/token')
            .send({
                username: 'testuser1'
            })

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/requires property \"password\"/);
    })
    
    it('bad request with invalid data', async () => {
        const resp = await request(app)
            .post('/auth/token')
            .send({
                username: 'testuser1',
                password: 44
            })

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/password is not of a type\(s\) string/);
    })
})

describe('POST /auth/register', () => {
    it('returns token for anon', async () => {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                username: 'newuser',
                password: 'password',
                firstName: 'first',
                lastName: "last",
                email: 'user@email.com',
                phone: '1112223333'
            });
        
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            "token": expect.any(String)
        });
    });
 
    it('bad request with missing data', async () => {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                username: 'newuser',
                password: 'password',
                firstName: 'first',
                lastName: "last",
            });
        
        expect(resp.statusCode).toEqual(400);
    });
 
    it('bad request with invalid data', async () => {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                username: 'newuser',
                password: 'password',
                firstName: 'first',
                lastName: "last",
                email: "notanemail",
                phone: "1112223333"
            });
        
        expect(resp.statusCode).toEqual(400);
    });

    it('cannot overide isAdmin=false', async () => {
        const resp = await request(app)
            .post('/auth/register')
            .send({
                username: 'newuser',
                password: 'password',
                firstName: 'first',
                lastName: "last",
                email: "user@email.com",
                phone: "1112223333",
                isAdmin: true                
            })

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/not allowed to/);
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})