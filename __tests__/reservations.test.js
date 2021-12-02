'use strict';

import app from '../app';
import db from '../db';
import Reservation from '../models/reservation';
import { createToken } from '../helpers/tokens';
import { NotFoundError } from '../expressError';
import User from '../models/user';
import Instrument from '../models/instrument';
import Category from '../models/category';

const request = require('supertest');

const u1token = createToken({ username: 'testuser1', isAdmin: false});
const u2token = createToken({ username: 'testuser2', isAdmin: false});
const a1token = createToken({ username: 'testadmin1', isAdmin: true});

const testUserIds = [];
const testInstIds = [];
const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM categories');

    const user1 = await User.register({
        username: 'testuser1',
        password: 'password',
        firstName: 'u1first',
        lastName: 'u1last',
        email: 'u1@email.com',
        phone: '1112223333',
        isAdmin: false
    })

    testUserIds.push(user1.id);
    
    const admin1 = await User.register({
        username: 'testadmin1',
        password: 'password',
        firstName: 'a1first',
        lastName: 'a1last',
        email: 'a1@email.com',
        phone: '1112223333',
        isAdmin: true
    })

    testUserIds.push(admin1.id);
   
    const user2 = await User.register({
        username: 'testuser2',
        password: 'password',
        firstName: 'u2first',
        lastName: 'u21last',
        email: 'u2@email.com',
        phone: '1112223333',
        isAdmin: false
    })

    testUserIds.push(user2.id);

    const inst1 = await Instrument.create({
        name: 'inst1',
        quantity: 1,
        description: 'desc of inst1',
        imageURL: 'inst1.png'
    })
  
    testInstIds.push(inst1.id);

    const inst2 = await Instrument.create({
        name: 'inst2',
        quantity: 2,
        description: 'desc of inst2',
        imageURL: 'inst2.png'
    })
    
    testInstIds.push(inst2.id);

    const cat1 = await Category.create('cat1');

    testCatIds.push(cat1.id);

    await inst1.addCategory(cat1.id);
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('POST /reservations', () => {
    it('creates new reservation: admin', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01T17:00:00.000Z',
                endTime: '2022-01-01T19:00:00.000Z',
                notes: 'resv notes'
            }
        })
    })
   
    it('creates new reservation: admin, token via body', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                _token: a1token,
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            });
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01T17:00:00.000Z',
                endTime: '2022-01-01T19:00:00.000Z',
                notes: 'resv notes'
            }
        })
    })

    it('creates new reservation, correct user', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${u1token}`);
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01T17:00:00.000Z',
                endTime: '2022-01-01T19:00:00.000Z',
                notes: 'resv notes'
            }
        })    
    })
   
    it('unauth if other nonadmin user', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${u2token}`);
            
        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual('Must be admin or user trying to make a reservation.')   
    })
    
    it('unauth if anon', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            
        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual('Must be logged in.')
    })
    
    it('badrequet if missing data', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
    })
  
    it('badrequet if invalid data: quantity', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 0,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual("Quantity must be a positive integer.");
    })
    
    it('badrequet if invalid data: startTime', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: 'not a datetime',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('Not a valid beginning timestamp');
    })
    
    it('badrequet if invalid data: endTime', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                endTime: 'not a datetime',
                startTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('Not a valid ending timestamp');
    })
    
    it('badrequet if invalid data: endTime before startTime', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 13:00:00',
                endTime: '2022-01-01 11:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('End time cannot be before start time.');
    })
})

describe('GET /reservations', () => {
    it('returns arr of reservations', async () => {
        await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);

        const resp = await request(app)
            .get('/reservations');

        expect(resp.body).toEqual({
            reservations : [
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[0],
                    quantity: 1,
                    startTime: '2022-01-01T17:00:00.000Z',
                    endTime: '2022-01-01T19:00:00.000Z',
                    notes: 'resv notes'
                }
            ]
        })
    })
})

describe('GET /reservations/:resvId', () => {
    it('returns reservation: anon', async () => {
        const resvResp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 13:00:00',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);

        const resp = await request(app)
            .get(`/reservations/${resvResp.body.reservation.id}`);

        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: "2022-01-01T17:00:00.000Z",
                endTime: "2022-01-01T19:00:00.000Z",
                notes: "resv notes",
            }
        })
    })

    it('not found for no such reservation', async () => {
        const resp = await request(app)
            .get('/reservations/12341234');

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toEqual(`No Reservation with id: 12341234`);
    })
})


afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})