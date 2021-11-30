'use strict';

import Instrument from '../models/instrument';
import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

const testInstIds = [];
const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM categories');

    const resultsInsts = await db.query(`
        INSERT INTO instruments (name, quantity, description, image_url) 
        VALUES ('inst1', 1, 'desc of inst1', 'inst1.png'),
        ('inst2', 2, 'desc of inst2', 'inst2.png'),
        ('inst3', 3, 'desc of inst3', 'inst3.png')
        RETURNING id
        `);

    testInstIds.splice(0, 0, ...resultsInsts.rows.map(i => i.id));

    const resultsCats = await db.query(`
        INSERT INTO categories (category)
        VALUES ('catForInstTest'), ('catForInstTest2')
        RETURNING id`);

    testCatIds.splice(0, 0, ...resultsCats.rows.map(c => c.id));

    await db.query(`
        INSERT INTO instrument_category
            (instrument_id, category_id)
        VALUES ($1, $2), ($3, $4)`,
        [testInstIds[2], testCatIds[0], testInstIds[2], testCatIds[1]])
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('create', () => {
    it('creates instrument', async () => {
        const instrument = await Instrument.create({
            name: 'instname',
            quantity: 5,
            description: 'this is the inst desc',
            imageURL: 'image.png'
        })

        expect(instrument).toEqual({
            id: expect.any(Number),
            name: 'instname',
            quantity: 5,
            description: 'this is the inst desc',
            imageURL: 'image.png',
            categories: []
        })
    })

    it('returns Instrument instance', async () => {
        const instrument = await Instrument.create({
            name: 'instname',
            quantity: 5,
            description: 'this is the inst desc',
            imageURL: 'image.png'
        })

        expect(instrument).toBeInstanceOf(Instrument);
    })

    it('works without desc', async () => {
        const instrument = await Instrument.create({
            name: 'instname',
            quantity: 5,
            imageURL: 'image.png'
        })

        expect(instrument).toEqual({
            id: expect.any(Number),
            name: 'instname',
            quantity: 5,
            description: null,
            imageURL: 'image.png',
            categories: []
        })
    })
   
    it('works without imageURL', async () => {
        const instrument = await Instrument.create({
            name: 'instname',
            quantity: 5,
            description: 'this is the inst desc',
        })

        expect(instrument).toEqual({
            id: expect.any(Number),
            name: 'instname',
            quantity: 5,
            description: 'this is the inst desc',
            imageURL: null,
            categories: []
        })
    })

    it('works without desc or imageURL', async () => {
        const instrument = await Instrument.create({
            name: 'instname',
            quantity: 5
        })

        expect(instrument).toEqual({
            id: expect.any(Number),
            name: 'instname',
            quantity: 5,
            description: null,
            imageURL: null,
            categories: []
        })
    })

    it('throws badrequest if quantity is negative', async () => {
        await expect(async () => {
            await Instrument.create({
                name: 'someinst',
                quantity: -5
            })
        }).rejects.toThrow('Quantity must be a nonnegative integer.')
    })
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
                imageURL: 'inst1.png',
                categories: [] 
            },
            { 
                id: testInstIds[1],
                name: 'inst2',
                quantity: 2,
                description: 'desc of inst2',
                imageURL: 'inst2.png',
                categories: [] 
            },
            { 
                id: testInstIds[2],
                name: 'inst3',
                quantity: 3,
                description: 'desc of inst3',
                imageURL: 'inst3.png',
                categories: [
                    {
                        id: testCatIds[0],
                        category: 'catForInstTest'
                    },
                    {
                        id: testCatIds[1],
                        category: 'catForInstTest2'
                    }
                ] 
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
            imageURL: 'inst1.png',
            categories: [] 
        })
    })

    it('returns Instrument instance', async () => {
        const instrument = await Instrument.get(testInstIds[0]);

        expect(instrument).toBeInstanceOf(Instrument);
    })

    it('returns with categories if avail', async () => {
        const instrument = await Instrument.get(testInstIds[2]);
        
        expect(instrument).toEqual({
            id: testInstIds[2],
            name: 'inst3',
            quantity: 3,
            description: 'desc of inst3',
            imageURL: 'inst3.png',
            categories: [
                {
                    id: testCatIds[0],
                    category: 'catForInstTest'
                },
                {
                    id: testCatIds[1],
                    category: 'catForInstTest2'
                }
            ] 
        })
    })

    it('throws notfound if id not found', async () => {
        expect.assertions(2);
        try {
            await Instrument.get(9999);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
            expect(e.message).toEqual('No Instrument with id: 9999')
        }
    })
})

describe('getCategories', () => {
    it('returns array of categories', async () => {
        const inst = await Instrument.get(testInstIds[2]);
        const cats = await inst.getCategories();

        expect(cats).toEqual([
            {
                id: testCatIds[0],
                category: 'catForInstTest'
            },
            {
                id: testCatIds[1],
                category: 'catForInstTest2'
            }
        ])
    })
    
    it('returns empty array if no categories', async () => {
        const inst = await Instrument.get(testInstIds[0]);
        const cats = await inst.getCategories();

        expect(cats).toEqual([])
    })
})

describe('save', () => {
    it('saves instrument changes', async () => {
        const inst = await Instrument.get(testInstIds[0]);

        inst.name = 'newName!';
        inst.imageURL = 'newimage.png';

        await inst.save()

        const instCheck = await Instrument.get(testInstIds[0]);

        expect(instCheck).toEqual({
            id: testInstIds[0],
            name: 'newName!',
            quantity: 1,
            description: 'desc of inst1',
            imageURL: 'newimage.png',
            categories: []         
        })

        expect(instCheck).toBeInstanceOf(Instrument);
    })

    it('works even if no change', async () => {
        const inst = await Instrument.get(testInstIds[0]);

        await inst.save();

        const instCheck = await Instrument.get(testInstIds[0]);

        expect(instCheck).toEqual({ 
            id: testInstIds[0],
            name: 'inst1',
            quantity: 1,
            description: 'desc of inst1',
            imageURL: 'inst1.png',
            categories: [] 
        })
    })

    it('throws badrequest if quantity is negative', async () => {
        expect.assertions(2);
        try {
            const inst = await Instrument.get(testInstIds[0]);

            inst.quantity = -5;

            await inst.save();
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('Quantity must be a nonnegative integer.')
        }
    })
})

describe('remove', () => {
    it('removes instrument', async () => {
        const inst = await Instrument.get(testInstIds[0]);

        await inst.remove();

        try {
            await Instrument.get(testInstIds[0]);
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
        }
    })
})

describe('addCategory', () => {
    it('adds instrument_category', async () => {
        const inst = await Instrument.get(testInstIds[0]);

        await inst.addCategory(testCatIds[0]);

        const instCheck = await Instrument.get(testInstIds[0]);

        expect(instCheck).toEqual({ 
            id: testInstIds[0],
            name: 'inst1',
            quantity: 1,
            description: 'desc of inst1',
            imageURL: 'inst1.png',
            categories: [{
                id: testCatIds[0],
                category: 'catForInstTest'
            }] 
        })
    })

    it('throws notfound if category not found', async () => {
        expect.assertions(2);
        try {
            const inst = await Instrument.get(testInstIds[1]);

            await inst.addCategory(9999)
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
            expect(e.message).toEqual('No Category with id: 9999');
        }
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})