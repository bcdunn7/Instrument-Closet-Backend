'use strict';

import Instrument from '../models/instrument';
import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

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

    await db.query(`
        INSERT INTO reservations
            (user_id, instrument_id, quantity, start_time, end_time, notes)
        VALUES
            ($1, $2, 1, 1641027600, 1641034800, 'somenotes'),
            ($3, $4, 2, 1641117600, 1641121200, 'somenotes2')
        RETURNING id`,
        [testUserIds[0], testInstIds[2], testUserIds[0], testInstIds[2]]);
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

    it('filters by name', async () => {
        const instruments = await Instrument.findAll({name: 'st1'});

        expect(instruments).toEqual([{
            categories: [], 
            description: "desc of inst1", 
            id: testInstIds[0], 
            imageURL: "inst1.png", 
            name: "inst1", 
            quantity: 1
        }])
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

describe('removeCategory', () => {
    it('removes category', async () => {
        const inst = await Instrument.get(testInstIds[0]);
        await inst.addCategory(testCatIds[0]);

        await inst.removeCategory(testCatIds[0]);

        const instCheck = await Instrument.get(testInstIds[0]);

        expect(instCheck.categories).toEqual([]);
    })
})


describe('getReservations', () => {
    it('gets reservatins for instrument', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations();

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 1,
                startTime: 1641027600,
                endTime: 1641034800,
                notes: 'somenotes'
            },
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 2,
                startTime: 1641117600,
                endTime: 1641121200,
                notes: 'somenotes2'
            }
        ])
    })
    
    it('gets reservatins for instrument, filter by end', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ endTime: 1641031200});

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 1,
                startTime: 1641027600, 
                endTime: 1641034800,
                notes: 'somenotes'
            }
        ])
        expect(reservations.length).toEqual(1);
    })
    
    it('gets reservatins for instrument, filter by end', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ endTime: 1641131200});

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 1,
                startTime: 1641027600, 
                endTime: 1641034800,
                notes: 'somenotes'
            },
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 2,
                startTime: 1641117600, 
                endTime: 1641121200,
                notes: 'somenotes2'
            }
        ])
        expect(reservations.length).toEqual(2);
    })

    it('gets reservatins for instrument, filter by start', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ startTime: 1641085200 });

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 2,
                startTime: 1641117600,
                endTime: 1641121200,
                notes: 'somenotes2'
            }
        ])
    })
    
    it('gets reservatins for instrument, filter by start', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ startTime: 1641185200 });

        expect(reservations).toEqual([])
    })
    
    it('gets reservatins for instrument, filter by both', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ startTime: 1641029200, endTime: 1641118090 });

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 1,
                startTime: 1641027600, 
                endTime: 1641034800,
                notes: 'somenotes'
            },
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 2,
                startTime: 1641117600, 
                endTime: 1641121200,
                notes: 'somenotes2'
            }
        ])
    })
    
    it('gets reservatins for instrument, filter by both', async () => {
        const inst = await Instrument.get(testInstIds[2]);

        const reservations = await inst.getReservations({ startTime: 1641109200, endTime: 1641112090 });

        expect(reservations).toEqual([])
    })
    
    it('badrequest if endtime is earlier than starttime', async () => {
        const inst = await Instrument.get(testInstIds[2]);
        expect.assertions(2);
        try {
            await inst.getReservations({ startTime: 1641085200, endTime: 1541121201 });
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('End time cannot be before start time.')
        }
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})