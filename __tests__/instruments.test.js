'use strict';

import app from '../app';
import db from '../db';
import Instrument from '../models/instrument';
import Category from '../models/category';
import { createToken } from '../helpers/tokens';
import { NotFoundError } from '../expressError';

const request = require('supertest');

const u1token = createToken({ username: 'testuser1', isAdmin: false});
const a1token = createToken({ username: 'testadmin1', isAdmin: true});

const testUserIds = [];
const testInstIds = [];
const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM reservations');
    await db.query('DELETE FROM categories');

    const resultsUsers = await db.query(`
        INSERT INTO users (username, password, first_name, last_name, email, phone, is_admin)
        VALUES ('user1', 'password', 'u1first', 'u1last', 'u1@email.com', '1115559999', false)
        RETURNING id`);

    testUserIds.splice(0, 0, ...resultsUsers.rows.map(u => u.id));

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

    await db.query(`
        INSERT INTO reservations
            (user_id, instrument_id, quantity, start_time, end_time, notes)
        VALUES
            ($1, $2, 1, 1641027600, 1641034800, 'somenotes'),
            ($3, $4, 2, 1641117600, 1641121200, 'somenotes2')
        RETURNING id`,
        [testUserIds[0], testInstIds[1], testUserIds[0], testInstIds[1]]);
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('POST /instruments', () => {
    it('creates instrument: admin', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: 'newinst.png'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            instrument: {
                id: expect.any(Number),
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: 'newinst.png',
                categories: []
            }
        })
    })
    
    it('creates instrument: admin, token via body', async () => {
        const resp = await request(app)
        .post('/instruments')
        .send({
            _token: a1token,
            name: 'newinst',
            quantity: 5,
            description: 'desc',
            imageURL: 'newinst.png'
        });
        
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            instrument: {
                id: expect.any(Number),
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: 'newinst.png',
                categories: []
            }
        })
    })

    it('creates instrument: admin, no desc', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5,
                imageURL: 'newinst.png'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            instrument: {
                id: expect.any(Number),
                name: 'newinst',
                quantity: 5,
                description: null,
                imageURL: 'newinst.png',
                categories: []
            }
        })
    })
    
    it('creates instrument: admin, no imageURL', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5,
                description: 'desc'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            instrument: {
                id: expect.any(Number),
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: null,
                categories: []
            }
        })
    })
    
    it('creates instrument: admin, no desc or imageURL', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            instrument: {
                id: expect.any(Number),
                name: 'newinst',
                quantity: 5,
                description: null,
                imageURL: null,
                categories: []
            }
        })
    })
    
    it('unauth if not nonadmin user', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: 'newinst.png'
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toMatch(/Must be admin/)
    })
   
    it('unauth if anon', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 5,
                description: 'desc',
                imageURL: 'newinst.png'
            })

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toMatch(/Must be admin/)
    })
    
    it('bqdrequest if missing data', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                description: 'desc',
                imageURL: 'newinst.png'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/instance requires property \"quantity\"/)
    })
    
    it('bqdrequest if invalid data', async () => {
        const resp = await request(app)
            .post('/instruments')
            .send({
                name: 'newinst',
                quantity: 'string',
                description: 'desc',
                imageURL: 'newinst.png'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/quantity is not of a type\(s\) integer/)
    })
})

describe('GET /instruments', () => {
    const instArr = [
        {
            id: expect.any(Number),
            name: 'inst1',
            quantity: 1,                
            description: 'desc of inst1',
            imageURL: 'inst1.png',
            categories: [
                {
                    id: expect.any(Number),
                    category: 'cat1'
                }
            ]
        },
        {
            id: expect.any(Number),
            name: 'inst2',
            quantity: 2,
            description: 'desc of inst2',
            imageURL: 'inst2.png',
            categories: []
        }
    ]

    it('returns list of instruments: admin', async () => {
        const resp = await request(app)
            .get('/instruments')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            instruments: instArr})
    })
    
    it('returns list of instruments: admin, token via body', async () => {
        const resp = await request(app)
            .get('/instruments')
            .send({
                _token: a1token
            });

        expect(resp.body).toEqual({
            instruments: instArr})
    })

    it('returns list of instruments: user', async () => {
        const resp = await request(app)
            .get('/instruments')
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            instruments: instArr})
    })

    it('returns list of filtered instruments: admin', async () => {
        const resp = await request(app)
            .get('/instruments?name=st1')
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body.instruments).toEqual([{
            id: testInstIds[0],
            name: 'inst1',
            quantity: 1,
            description: 'desc of inst1',
            imageURL: 'inst1.png',
            categories: [{
                id: testCatIds[0],
                category: 'cat1'
            }]

        }])
    })
    
    it('unauth if anon', async () => {
        const resp = await request(app)
            .get('/instruments');

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual("Must be logged in.")
    })
})

describe('GET /instruments/:instId', () => {
    it('returns instrument: user', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[0]}`)
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.body).toEqual({
            instrument: {
                id: testInstIds[0],
                name: 'inst1',
                quantity: 1,
                description: 'desc of inst1',
                imageURL: 'inst1.png',
                categories: [{
                    id: expect.any(Number),
                    category: 'cat1'
                }]
            }
        })
    })

    it('unauth if anon', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[0]}`);

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual("Must be logged in.")
    })

    it('not found for no such instrument', async () => {
        const resp = await request(app)
            .get('/instruments/12341234')
            .set('authorization', `Bearer ${u1token}`);
    
        expect(resp.statusCode).toEqual(404);
    })
})

describe('PATCH /instruments/:instId', () => {
    it('updates instrument: admin', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                name: 'newname'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            instrument: {
                id: testInstIds[0],
                name: 'newname',
                quantity: 1,
                description: 'desc of inst1',
                imageURL: 'inst1.png',
                categories: [{
                    id: expect.any(Number),
                    category: 'cat1'
                }]
            }
        })
    })

    it('updates instrument: admin, token via body', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                _token: a1token,
                name: 'newname'
            });

        expect(resp.body).toEqual({
            instrument: {
                id: testInstIds[0],
                name: 'newname',
                quantity: 1,
                description: 'desc of inst1',
                imageURL: 'inst1.png',
                categories: [{
                    id: expect.any(Number),
                    category: 'cat1'
                }]
            }
        })
    })

    it('updates instrument all fields', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                name: 'newname',
                quantity: 5,
                description: 'newdesc',
                imageURL: 'newURL'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            instrument: {
                id: testInstIds[0],
                name: 'newname',
                quantity: 5,
                description: 'newdesc',
                imageURL: 'newURL',
                categories: [{
                    id: expect.any(Number),
                    category: 'cat1'
                }]
            }
        })
    })

    it('unauth for nonadmin user', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                name: 'newname'
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(401);
    })
   
    it('unauth for anon', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                name: 'newname'
            });

        expect(resp.statusCode).toEqual(401);
    })

    it('badrequest for invalid data', async () => {
        const resp = await request(app)
            .patch(`/instruments/${testInstIds[0]}`)
            .send({
                name: 3,
                quantity: 5,
                description: 'newdesc',
                imageURL: 'newURL'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch("instance.name is not of a type(s) string")
    })

    it('not found if no such instrument', async () => {
        const resp = await request(app)
            .patch('/instruments/12341234')
            .send({
                name: 'newname'
            })
            .set('authorization', `Bearer ${a1token}`);
    
        expect(resp.statusCode).toEqual(404);
    })
    
    it('badrequest if attempt category change', async () => {
        const resp = await request(app)
            .patch('/instruments/12341234')
            .send({
                categories: [{
                    id: 1,
                    category: 'new'
                }]
            })
            .set('authorization', `Bearer ${a1token}`);
    
        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message[0]).toMatch(/not allowed to have the additional/);
    })
})

describe('DELETE /instrumnets/:instId', () => {
    it('removes instrument: admin', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}`)
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            deleted: `inst1 (ID: ${testInstIds[0]})`
        })

        await expect(async () => {
            await Instrument.get(testInstIds[0]);
        }).rejects.toThrow(NotFoundError);  
    })
    
    it('unauth for nonadmin user', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}`)
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(401); 
    })
    
    it('unauth for anon', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}`);

        expect(resp.statusCode).toEqual(401); 
    })
    
    it('notfound for no such inst', async () => {
        const resp = await request(app)
            .delete(`/instruments/12341234`)
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(404); 
    })
})

describe('GET /instruments/[instId]/reservations', () => {
    it('returns reservations for inst', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`)
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            reservations: [
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[1],
                    quantity: 1,
                    startTime: 1641027600,
                    endTime: 1641034800,
                    notes: 'somenotes'
                },
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[1],
                    quantity: 2,
                    startTime: 1641117600,
                    endTime: 1641121200,
                    notes: 'somenotes2'
                }
            ]
        })
    })
   
    it('returns reservations for inst, with starttime parametrs', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`)
            .send({
                startTime: '2022-01-01T11:00:00',
                timeZone: 'America/Chicago'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            reservations: [
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[1],
                    quantity: 2,
                    startTime: 1641117600,
                    endTime: 1641121200,
                    notes: 'somenotes2'
                }
            ]
        })
    })
    
    it('returns reservations for inst, with endtime parametrs', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`)
            .send({
                endTime: '2022-01-01T11:00:00',
                timeZone: 'America/Chicago'
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            reservations: [
                {
                    id: expect.any(Number),
                    userId: testUserIds[0],
                    instrumentId: testInstIds[1],
                    quantity: 1,
                    startTime: 1641027600,
                    endTime: 1641034800,
                    notes: 'somenotes'
                }
            ]
        })
    })
    
    it('badrequest for no timeZone if specifying start or end time', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`)
            .send({
                endTime: '2022-01-01T11:00:00'            
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('An endTime was supplied, but no timeZone was specified. TimeZone must be included when trying to query by time.')
    })
    
    it('badrequest for invalid data', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`)
            .send({
                //no 'T'
                endTime: '2022-01-01 11:00:00',
                timeZone: 'America/Chicago'            
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('unparsable: the input \"2022-01-01 11:00:00\" can\'t be parsed as ISO 8601')
    })
    
    it('unauth for anon', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[1]}/reservations`);
            

        expect(resp.statusCode).toEqual(401);
        expect(resp.body.error.message).toEqual('Must be logged in.')
    })
})

describe('POST /instruments/:instId/categories', () => {
    it('adds category to instrument: admin', async () => {
        const resp = await request(app)
            .post(`/instruments/${testInstIds[1]}/categories`)
            .send({
                categoryId: testCatIds[0]
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            Added: `Category (${testCatIds[0]}) added to instrument (${testInstIds[1]})`
        })
    })
   
    it('unauth for nonadmin user', async () => {
        const resp = await request(app)
            .post(`/instruments/${testInstIds[1]}/categories`)
            .send({
                categoryId: testCatIds[0]
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(401);
    })
    
    it('unauth for anon', async () => {
        const resp = await request(app)
            .post(`/instruments/${testInstIds[1]}/categories`)
            .send({
                categoryId: testCatIds[0]
            });

        expect(resp.statusCode).toEqual(401);
    })
    
    it('badrequest for category already added', async () => {
        const resp = await request(app)
            .post(`/instruments/${testInstIds[0]}/categories`)
            .send({
                categoryId: testCatIds[0]
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error.message).toEqual('Category already added to this instrument.');
    })
})

describe('DELETE /instruments/:instId/categories', () => {
    it('removes category from instrument: admin', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}/categories`)
            .send({
                categoryId: testCatIds[0]
            })
            .set('authorization', `Bearer ${a1token}`);

        expect(resp.body).toEqual({
            Deleted: `Category (${testCatIds[0]}) removed from instrument (${testInstIds[0]})`
        })
    })
   
    it('unauth for nonadmin user', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}/categories`)
            .send({
                categoryId: testCatIds[0]
            })
            .set('authorization', `Bearer ${u1token}`);

        expect(resp.statusCode).toEqual(401);
    })
    
    it('unauth for anon', async () => {
        const resp = await request(app)
            .delete(`/instruments/${testInstIds[0]}/categories`)
            .send({
                categoryId: testCatIds[0]
            });

        expect(resp.statusCode).toEqual(401);
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})