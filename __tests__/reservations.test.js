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
const testResvIds = [];

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

    const resv1 = await Reservation.create({
        userId: testUserIds[0],
        instrumentId: testInstIds[0],
        quantity: 1,
        startTime: 1641027600,
        endTime: 1641034800,
        notes: 'resv notes'
    });

    testResvIds.push(resv1.id);
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: 1641056400,
                endTime: 1641063600,
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            });
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: 1641056400,
                endTime: 1641063600,
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${u1token}`);
            
        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: 1641056400,
                endTime: 1641063600,
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZome: 'America/Chicago',
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
                endTime: '2022-01-01T13:00:00',
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
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
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
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('unparsable: the input \"not a datetime\" can\'t be parsed as ISO 8601');
    })
    
    it('badrequet if invalid data: endTime', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                endTime: 'not a datetime',
                startTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('unparsable: the input \"not a datetime\" can\'t be parsed as ISO 8601');
    })
    
    it('badrequet if invalid data: timeZone', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                endTime: 'not a datetime',
                startTime: '2022-01-01T13:00:00',
                timeZone: 'America/wrong',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('unsupported zone: the zone \"America/wrong\" is not supported');
    })
    
    it('badrequet if invalid data: endTime before startTime', async () => {
        const resp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01T13:00:00',
                endTime: '2022-01-01T11:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);
            
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('End time cannot be before start time.');
    })
})

describe('GET /reservations', () => {
    it('returns arr of reservations: user', async () => {
        const resp = await request(app)
            .get('/reservations')
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            reservations : [
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[0],
                    quantity: 1,
                    startTime: expect.any(Number),
                    endTime: expect.any(Number),
                    notes: 'resv notes'
                }
            ]
        })
    })
})

describe('GET /reservations/:resvId', () => {
    it('returns reservation: user', async () => {
        const resvResp = await request(app)
            .post('/reservations')
            .send({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01T11:00:00',
                endTime: '2022-01-01T13:00:00',
                timeZone: 'America/Chicago',
                notes: 'resv notes'
            })
            .set('authorization', `Bearer ${a1token}`);

        const resp = await request(app)
            .get(`/reservations/${resvResp.body.reservation.id}`)
            .set('authorization', `Bearer ${u2token}`);

        expect(resp.body).toEqual({
            reservation: {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: expect.any(Number),
                endTime: expect.any(Number),
                notes: "resv notes",
            }
        })
    })

    it('not found for no such reservation', async () => {
        const resp = await request(app)
            .get('/reservations/12341234')
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error.message).toEqual(`No Reservation with id: 12341234`);
    })
})

describe('PATCH /reservations/:resvId', () => {
    it('returns updated reservation: admin', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            reservation: {
                id: testResvIds[0],
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: expect.any(Number),
                endTime: expect.any(Number),
                notes: 'newnotes'
            }
        })

        const resvCheck = await Reservation.get(testResvIds[0]);

        expect(resvCheck.notes).toEqual('newnotes');
    })
   
    it('returns updated reservation: admin, token via body', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                _token: a1token,
                notes: 'newnotes'
            })

        expect(resp.body).toEqual({
            reservation: {
                id: testResvIds[0],
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: expect.any(Number),
                endTime: expect.any(Number),
                notes: 'newnotes'
            }
        })
    })
    
    it('returns updated reservation: correct user', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes'
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            reservation: {
                id: testResvIds[0],
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: expect.any(Number),
                endTime: expect.any(Number),
                notes: 'newnotes'
            }
        })
    })
    
    it('returns updated reservation, changes everything: correct user', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes',
                startTime: '2022-01-05T01:30:00',
                endTime: '2022-03-04T09:15:00',
                timeZone: 'America/Chicago',
                quantity: 2
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            reservation: {
                id: testResvIds[0],
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 2,
                startTime: 1641367800,
                endTime: 1646406900,
                notes: 'newnotes'
            }
        })
    })

    it('unauth if anon', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes'
            })

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual('Must be logged in.')
    })
    
    it('unauth if other nonadmin user', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes'
            })
            .set('authorization', `Bearer ${u2token}`);

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual('Must be admin or user who made the reservation.')
    })
    
    it('badrequest if invalid data: missing timeZone', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes',
                endTime: '2022-03-04T09:15:00',
                quantity: 2
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('An endTime was supplied, but no timeZone was specified. TimeZone must be included when trying to adjust a time.')
    })
   
    it('badrequest if invalid data: wrong timeZone', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes',
                endTime: '2022-03-04T09:15:00',
                timeZone: 'America/wrong',
                quantity: 2
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual("unsupported zone: the zone \"America/wrong\" is not supported")
    })
    
    it('badrequest if invalid data', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes',
                startTime: 'notatimestamp',
                endTime: '2022-03-04 09:15:00',
                timeZone: 'America/Chicago',
                quantity: 2
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('unparsable: the input \"notatimestamp\" can\'t be parsed as ISO 8601')
    })

    it('badrequest if extra data', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                notes: 'newnotes',
                quantity: 2,
                userId: 5
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch('instance is not allowed to have the additional')
    })
    
    it('badrequest if changing times so start is after end', async () => {
        const resp = await request(app)
            .patch(`/reservations/${testResvIds[0]}`)
            .send({
                // start is set at 2022-01-01T03:00:00
                endTime: '2022-01-01T01:00:00',
                timeZone: 'America/Chicago'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toMatch('End time cannot be before start time.')
    })

    it('notfound if reservation not found', async () => {
        const resp = await request(app)
            .patch(`/reservations/12341234`)
            .send({
                notes: 'newnotes'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(404);
    })
})

describe('DELETE /reservations/:resvId', () => {
    it('deleted reservatoin: admin', async () => {
        const resp = await request(app)
            .delete(`/reservations/${testResvIds[0]}`)
            .set('authorization', `Bearer ${a1token}`);
        
        expect(resp.body).toEqual({
            deleted: testResvIds[0]
        })

        await expect(async () => {
            await Reservation.get(testResvIds[0]);
        }).rejects.toThrow(NotFoundError);
    })
    
    it('deleted reservatoin: admin, token via body', async () => {
        const resp = await request(app)
            .delete(`/reservations/${testResvIds[0]}`)
            .send({
                _token: a1token
            });
        
        expect(resp.body).toEqual({
            deleted: testResvIds[0]
        })
    })
    
    it('deleted reservatoin: correct user', async () => {
        const resp = await request(app)
            .delete(`/reservations/${testResvIds[0]}`)
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            deleted: testResvIds[0]
        })
    })
    
    it('unauth if anon', async () => {
        const resp = await request(app)
            .delete(`/reservations/${testResvIds[0]}`);
        
        expect(resp.statusCode).toEqual(401);
    })
    
    it('unauth if nonadmin other user', async () => {
        const resp = await request(app)
            .delete(`/reservations/${testResvIds[0]}`)
            .set('authorization', `Bearer ${u2token}`);

        expect(resp.statusCode).toEqual(401);
    })

    it('notfound if reservation not found', async () => {
        const resp = await request(app)
            .delete('/reservations/12341234')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(404);
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})