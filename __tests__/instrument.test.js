'use strict';

import Instrument from '../models/instrument';
import db from '../db';
import { 
    NotFoundError, 
    BadRequestError, 
    UnauthorizedError
} from '../expressError';

const testInstIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM instruments');

    const resultsInsts = await db.query(`
    INSERT INTO instruments (name, quantity, description, image_url) 
    VALUES ('inst1', 1, 'desc of inst1', 'inst1.png'),
    ('inst2', 2, 'desc of inst2', 'inst2.png'),
    ('inst3', 3, 'desc of inst3', 'inst3.png')
    RETURNING id
    `)

    testInstIds.splice(0, 0, ...resultsInsts.rows.map(i => i.id));
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('findAll', () => {
    it('returns array of all instruments', async () => {
        const instruments = await Instrument.findAll();

        expect(instruments).toEqual([
            { 
                id: testInstIds[0],
                name: 'inst1',
                quantity: 1,
                description: 'desc of inst1',
                imageURL: 'inst1.png' 
            },
            { 
                id: testInstIds[1],
                name: 'inst2',
                quantity: 2,
                description: 'desc of inst2',
                imageURL: 'inst2.png' 
            },
            { 
                id: testInstIds[2],
                name: 'inst3',
                quantity: 3,
                description: 'desc of inst3',
                imageURL: 'inst3.png' 
            }
        ])
    })

    it('returns array of Instrument instances', async () => {
        const instruments = await Instrument.findAll();

        expect(instruments[0]).toBeInstanceOf(Instrument);
    })
});

describe('get', () => {
    it('returns an instrument', async () => {
        const instrument = await Instrument.get(testInstIds[0]);

        expect(instrument).toEqual({ 
            id: testInstIds[0],
            name: 'inst1',
            quantity: 1,
            description: 'desc of inst1',
            imageURL: 'inst1.png' 
        })
    })

    it('returns Instrument instance', async () => {
        const instrument = await Instrument.get(testInstIds[0]);

        expect(instrument).toBeInstanceOf(Instrument);
    })

    it('throws notfound if id not found', async () => {
        try {
            await Instrument.get(9999);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
            expect(e.message).toEqual('No Instrument with id: 9999')
        }
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})