'use strict';

import app from '../app';
import db from '../db';
import User from '../models/user';
import { createToken } from '../helpers/tokens';

const request = require('supertest');

const u1token = createToken({ username: 'testuser1', isAdmin: false});
const u2token = createToken({ username: 'testuser2', isAdmin: false});
const a1token = createToken({ username: 'testadmin1', isAdmin: true});

const testInstIds = [];
const testUserIds = [];
const testResvIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM reservations');

    const u1 = await User.register({
        username: 'testuser1',
        password: 'password',
        firstName: 'u1first',
        lastName: 'u1last',
        email: 'u1@email.com',
        phone: '1112223333',
        isAdmin: false
    })

    testUserIds.push(u1.id);

    const u2 = await User.register({
        username: 'testuser2',
        password: 'password',
        firstName: 'u2first',
        lastName: 'u2last',
        email: 'u2@email.com',
        phone: '2223334444',
        isAdmin: false
    })

    testUserIds.push(u2.id);
 
    const a1 = await User.register({
        username: 'testadmin1',
        password: 'password',
        firstName: 'a1first',
        lastName: 'a1last',
        email: 'a1@email.com',
        phone: '2112223333',
        isAdmin: true
    })

    testUserIds.push(a1.id);

    const resultsInsts = await db.query(`
    INSERT INTO instruments (name, quantity, description, image_url) 
        VALUES ('inst1', 1, 'desc of inst1', 'inst1.png'),
        ('inst2', 2, 'desc of inst2', 'inst2.png'),
        ('inst3', 3, 'desc of inst3', 'inst3.png')
        RETURNING id`)

    testInstIds.splice(0, 0, ...resultsInsts.rows.map(i => i.id));

    const resultsResvs = await db.query(`
        INSERT INTO reservations
            (user_id, instrument_id, quantity, start_time, end_time, notes)
        VALUES
            ($1, $2, 1, 1641027600, 1641034800, 'somenotes'),
            ($3, $4, 2, 1641117600, 1641121200, 'somenotes2')
        RETURNING id`,
        [testUserIds[0], testInstIds[0], testUserIds[0], testInstIds[2]]);

    testResvIds.splice(0, 0, ...resultsResvs.rows.map(r => r.id));
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('GET /users', () => {
    it('gets all users: admin', async () => {
        const resp = await request(app)
            .get('/users')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            users: [
                {
                    id: testUserIds[2],
                    username: 'testadmin1',
                    firstName: 'a1first',
                    lastName: 'a1last',
                    email: 'a1@email.com',
                    phone: '2112223333',
                    isAdmin: true
                },
                {
                    id: testUserIds[0],
                    username: 'testuser1',
                    firstName: 'u1first',
                    lastName: 'u1last',
                    email: 'u1@email.com',
                    phone: '1112223333',
                    isAdmin: false
                },
                {
                    id: testUserIds[1],
                    username: 'testuser2',
                    firstName: 'u2first',
                    lastName: 'u2last',
                    email: 'u2@email.com',
                    phone: '2223334444',
                    isAdmin: false
                }
            ]
        })
    })
    
    it('gets all users: admin, token via body', async () => {
        const resp = await request(app)
            .get('/users')
            .send({
                _token: a1token
            });

        expect(resp.body).toEqual({
            users: [
                {
                    id: testUserIds[2],
                    username: 'testadmin1',
                    firstName: 'a1first',
                    lastName: 'a1last',
                    email: 'a1@email.com',
                    phone: '2112223333',
                    isAdmin: true
                },
                {
                    id: testUserIds[0],
                    username: 'testuser1',
                    firstName: 'u1first',
                    lastName: 'u1last',
                    email: 'u1@email.com',
                    phone: '1112223333',
                    isAdmin: false
                },
                {
                    id: testUserIds[1],
                    username: 'testuser2',
                    firstName: 'u2first',
                    lastName: 'u2last',
                    email: 'u2@email.com',
                    phone: '2223334444',
                    isAdmin: false
                }
            ]
        })
    })

    it('unauth for nonadmin', async () => {
        const resp = await request(app)
            .get('/users')
            .set('authorization', `Bearer ${u1token}`);
        
        expect(resp.statusCode).toEqual(401);
    })

    it('unauth for anon user', async () => {
        const resp = await request(app)
            .get('/users')

        expect(resp.statusCode).toEqual(401);
    })
})

describe('GET /users/:username', () => {
    it('gets user: admin', async () => {
        const resp = await request(app)
            .get('/users/testuser1')
            .set('authorization', `Bearer ${a1token}`);
    
        expect(resp.body).toEqual({
            user: {
                id: testUserIds[0],
                username: 'testuser1',
                firstName: 'u1first',
                lastName: 'u1last',
                email: 'u1@email.com',
                phone: '1112223333',
                isAdmin: false
            }
        })
    })
    
    it('gets user: same user', async () => {
        const resp = await request(app)
            .get('/users/testuser1')
            .set('authorization', `Bearer ${u1token}`);
    
        expect(resp.body).toEqual({
            user: {
                id: testUserIds[0],
                username: 'testuser1',
                firstName: 'u1first',
                lastName: 'u1last',
                email: 'u1@email.com',
                phone: '1112223333',
                isAdmin: false
            }
        })
    })

    it('unauth for nonadmin other user', async () => {
        const resp = await request(app)
            .get('/users/testuser1')
            .set('authorization', `Bearer ${u2token}`);

        expect(resp.statusCode).toEqual(401);
    })

    it('unauth for anon', async () => {
        const resp = await request(app)
            .get('/users/testuser1')

        expect(resp.statusCode).toEqual(401);
    })
 
    it('not found if not found', async () => {
        const resp = await request(app)
            .get('/users/notarealuser')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(404);
    })
})

describe('GET /users/:username/reservations', () => {
    it('gets user reservations: admin', async () => {
        const resp = await request(app)
            .get('/users/testuser1/reservations')
            .set('authorization', `Bearer ${a1token}`);
    
        expect(resp.body).toEqual({
            reservations: [
                    {
                    endTime: 1641034800,
                    id: testResvIds[0],
                    instrumentId: testInstIds[0],
                    notes: 'somenotes',
                    quantity: 1,
                    startTime: 1641027600,
                    userId: testUserIds[0],
                    },
                    {
                    endTime: 1641121200,
                    id: testResvIds[1],
                    instrumentId: testInstIds[2],
                    notes: 'somenotes2',
                    quantity: 2,
                    startTime: 1641117600,
                    userId: testUserIds[0],
                    },
                ]
        })
    })
})

describe('PATCH /users/:username', () => {
    it('updates user: admin', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                firstName: "newfirstname",
                lastName: "newlastname",
                email: "new@email.com",
                phone: '9998887777'
            })
            .set('authorization', `Bearer ${a1token}`);
    
        const userCheck = await User.get('testuser1');
        
        expect(resp.body).toEqual({
            user: {
                id: testUserIds[0],
                username: 'testuser1',
                firstName: 'newfirstname',
                lastName: 'newlastname',
                email: 'new@email.com',
                phone: '9998887777',
                isAdmin: false
            }
        })

        expect(userCheck).toEqual({
            id: testUserIds[0],
            username: 'testuser1',
            firstName: 'newfirstname',
            lastName: 'newlastname',
            email: 'new@email.com',
            phone: '9998887777',
            isAdmin: false
        })
    })
    
    it('updates user: admin, token via body', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                _token: a1token,
                firstName: "newfirstname",
                lastName: "newlastname",
                email: "new@email.com",
                phone: '9998887777'
            });
    
        const userCheck = await User.get('testuser1');
        
        expect(resp.body).toEqual({
            user: {
                id: testUserIds[0],
                username: 'testuser1',
                firstName: 'newfirstname',
                lastName: 'newlastname',
                email: 'new@email.com',
                phone: '9998887777',
                isAdmin: false
            }
        })

        expect(userCheck).toEqual({
            id: testUserIds[0],
            username: 'testuser1',
            firstName: 'newfirstname',
            lastName: 'newlastname',
            email: 'new@email.com',
            phone: '9998887777',
            isAdmin: false
        })
    })
    
    it('updates user: same user', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                firstName: "newfirstname",
                lastName: "newlastname",
                email: "new@email.com",
                phone: '9998887777'
            })
            .set('authorization', `Bearer ${u1token}`);
            
        expect(resp.body).toEqual({
            user: {
                id: testUserIds[0],
                username: 'testuser1',
                firstName: 'newfirstname',
                lastName: 'newlastname',
                email: 'new@email.com',
                phone: '9998887777',
                isAdmin: false
            }
        })
    })

    it('unauth for nonadmin other user', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                firstName: "newfirstname",
                lastName: "newlastname",
                email: "new@email.com",
                phone: '9998887777'
            })
            .set('authorization', `Bearer ${u2token}`);
            
        expect(resp.statusCode).toEqual(401);
    })
  
    it('unauth for anon', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                firstName: "newfirstname",
                lastName: "newlastname",
                email: "new@email.com",
                phone: '9998887777'
            })
            
        expect(resp.statusCode).toEqual(401);
    })
    
    it('not found if not found', async () => {
        const resp = await request(app)
            .patch('/users/notarealuser')
            .send({
                firstName: "newfirstname"
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(404);
    })

    it('responds badrequest if invalid email', async () => {
        const resp = await request(app)
            .patch('/users/testuser1')
            .send({
                email: 'notanemail'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400)
        expect(resp.body.error.message[0]).toMatch(/email does not conform/)
    })
})

describe('DELETE /users/:username', () => {
    it('removes user: admin', async () => {
        const resp = await request(app)
            .delete('/users/testuser1')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({deleted: "testuser1"})
    })

    it("works for same user", async function () {
        const resp = await request(app)
            .delete('/users/testuser1')
            .set("authorization", `Bearer ${u1token}`);
        expect(resp.body).toEqual({ deleted: "testuser1" });
    });
    
    it("unauth for nonadmin other user", async function () {
        const resp = await request(app)
            .delete('/users/testuser1')
            .set("authorization", `Bearer ${u2token}`);
        expect(resp.statusCode).toEqual(401);
    });

    it("unauth for anon", async function () {
        const resp = await request(app)
            .delete('/users/testuser1');
        expect(resp.statusCode).toEqual(401);
    });

    it("not found if user not found", async function () {
        const resp = await request(app)
            .delete('/users/notauser')
            .set("authorization", `Bearer ${a1token}`);
        expect(resp.statusCode).toEqual(404);
    });
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})