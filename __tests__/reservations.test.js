'use strict';

import app from '../app';
import db from '../db';
import Reservation from '../models/reservation';
import { createToken } from '../helpers/tokens';
import { NotFoundError } from '../expressError';
import User from '../models/user';

const request = require('supertest');

const u1token = createToken({ username: 'testuser1', isAdmin: false});
const a1token = createToken({ username: 'testadmin1', isAdmin: true});

const testUserIds = [];
const testInstIds = [];
const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM categories');

    const user1 = await User.create({
        username: 'testuser1',
        password: 'password',
        firstName: 'u1first',
        lastName: 'u1last',
        email: 'u1@email.com',
        phone: '1112223333'
    })

    testUserIds.push(user1.id);

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
            .send({})
            .set('authorization', `Bearer ${a1token}`);
            
    })
})


afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})