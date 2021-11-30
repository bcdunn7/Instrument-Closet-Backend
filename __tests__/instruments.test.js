'use strict';

import app from '../app';
import db from '../db';
import Instrument from '../models/instrument';
import Category from '../models/category';
import { createToken } from '../helpers/tokens';

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
})


afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})