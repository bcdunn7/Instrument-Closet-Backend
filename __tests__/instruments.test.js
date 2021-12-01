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

const testInstIds = [];
const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM categories');

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
    
    it('returns list of instruments: anon', async () => {
        const resp = await request(app)
            .get('/instruments');

        expect(resp.body).toEqual({
            instruments: instArr})
    })
})

describe('GET /instruments/:instId', () => {
    it('returns instrument: anon', async () => {
        const resp = await request(app)
            .get(`/instruments/${testInstIds[0]}`);

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

    it('not found for no such instrument', async () => {
        const resp = await request(app)
            .get('/instruments/12341234');
    
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

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})