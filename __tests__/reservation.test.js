'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';
import Reservation from "../models/reservation";

const testInstIds = [];
const testUserIds = [];
const testResvIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM reservations');

    const resultsInsts = await db.query(`
        INSERT INTO instruments (name, quantity, description, image_url) 
        VALUES ('inst1', 1, 'desc of inst1', 'inst1.png'),
        ('inst2', 2, 'desc of inst2', 'inst2.png'),
        ('inst3', 3, 'desc of inst3', 'inst3.png')
        RETURNING id`);
    
    testInstIds.splice(0, 0, ...resultsInsts.rows.map(i => i.id));

    const resultsUsers = await db.query(`
        INSERT INTO users (username, password, first_name, last_name, email, phone, is_admin)
        VALUES ('user1', 'password', 'u1first', 'u1last', 'u1@email.com', '1115559999', false)
        RETURNING id`);

    testUserIds.splice(0, 0, ...resultsUsers.rows.map(u => u.id));

    const resultsResvs = await db.query(`
        INSERT INTO reservations
            (user_id, instrument_id, quantity, start_time, end_time, notes)
        VALUES
            ($1, $2, 1, '2022-01-01 11:00:00', '2022-01-02 13:00:00', 'somenotes'),
            ($3, $4, 2, '2023-01-01 11:00:00', '2023-01-02 13:00:00', 'somenotes2')
        RETURNING id`,
        [testUserIds[0], testInstIds[0], testUserIds[0], testInstIds[2]]);

    testResvIds.splice(0, 0, ...resultsResvs.rows.map(r => r.id));
})


beforeEach(async () => {
    await db.query('BEGIN');
})

describe('create', () => {
    it('creates reservation', async () => {
        const reserv = await Reservation.create({
            userId: testUserIds[0],
            instrumentId: testInstIds[0],
            quantity: 1,
            startTime: '2022-01-01 10:00:00',
            endTime: '2022-01-02 11:00:00',
            notes: 'reservation notes'
        });

        const startExpected = new Date('2022-01-01T16:00:00.000z');
        const endExpected = new Date('2022-01-02T17:00:00.000z');

        expect(reserv).toEqual({
            id: expect.any(Number),
            userId: testUserIds[0],
            instrumentId: testInstIds[0],
            quantity: 1,
            startTime: startExpected,
            endTime: endExpected,
            notes: 'reservation notes'
        })
    })

    it('throws notfound if no user with id', async () => {
        await expect(async () => {
            await Reservation.create({
                userId: 9999,
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 10:00:00',
                endTime: '2022-01-02 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('No User with id: 9999')
    })

    it('throws notfound if no instrument with id', async () => {
        await expect(async () => {
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: 9999,
                quantity: 1,
                startTime: '2022-01-01 10:00:00',
                endTime: '2022-01-02 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('No Instrument with id: 9999')
    })

    it('throws badrequest if startdate is invalid', async () => {
        await expect(async () => {            
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: 'notatimestamp',
                endTime: '2022-01-01 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('Not a valid beginning timestamp')
    })

    it('throws badrequest if enddate is invalid', async () => {
        await expect(async () => {            
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 10:00:00',
                endTime: 'notatimestamp',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('Not a valid ending timestamp')
    })

    it('throws badrequest if end is before start: date', async () => {
        await expect(async () => {            
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-02 11:00:00',
                endTime: '2022-01-01 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow(BadRequestError)
    })

    it('throws badrequest if end is before start: time', async () => {
        await expect(async () => {            
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-01 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow(BadRequestError)
    })

    it('throws badrequest if quantity is a negative number', async () => {
        await expect(async () => {
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: -2,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-03 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('Quantity must be a positive integer.')
    })

    it('throws badrequest if quantity is 0', async () => {
        await expect(async () => {
            await Reservation.create({
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 0,
                startTime: '2022-01-01 11:00:00',
                endTime: '2022-01-03 10:00:00',
                notes: 'reservation notes'
            })
        }).rejects.toThrow('Quantity must be a positive integer.')
    })
})

describe('findAll', () => {
    it('returns array of all reservations', async () => {
        const reservations = await Reservation.findAll();

        expect(reservations).toEqual([
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[0],
                quantity: 1,
                startTime: expect.any(Date),
                endTime: expect.any(Date),
                notes: 'somenotes'
            },
            {
                id: expect.any(Number),
                userId: testUserIds[0],
                instrumentId: testInstIds[2],
                quantity: 2,
                startTime: expect.any(Date),
                endTime: expect.any(Date),
                notes: 'somenotes2'
            }
        ])

        expect(reservations[0]).toBeInstanceOf(Reservation);
    })
})

describe('get', () => {
    it('returns a reservation', async () => {
        const reservation = await Reservation.get(testResvIds[0]);

        expect(reservation).toEqual({
            id: testResvIds[0],
            userId: testUserIds[0],
            instrumentId: testInstIds[0],
            quantity: 1,
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            notes: 'somenotes'
        })
    })

    it('returns Reservation instance', async () => {
        const reservation = await Reservation.get(testResvIds[0]);

        expect(reservation).toBeInstanceOf(Reservation);
    })

    it('throws notfound if id not found', async () => {
        await expect(async () => {
            await Reservation.get(9999);
        }).rejects.toThrow('No Reservation with id: 9999')
    })
})

describe('save', () => {
    it('saves reservation changes', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.notes = 'newnoteshere!';
        resv.quantity = 2;

        await resv.save();

        const resvCheck = await Reservation.get(testResvIds[0]);

        expect(resvCheck).toEqual({
            id: testResvIds[0],
            userId: testUserIds[0],
            instrumentId: testInstIds[0],
            quantity: 2,
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            notes: 'newnoteshere!'
        })

        expect(resvCheck).toBeInstanceOf(Reservation);
    })

    it('works even if no change', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        await resv.save();

        const resvCheck = await Reservation.get(testResvIds[0]);

        expect(resvCheck).toEqual({
            id: testResvIds[0],
            userId: testUserIds[0],
            instrumentId: testInstIds[0],
            quantity: 1,
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            notes: 'somenotes'
        })

        expect(resvCheck).toBeInstanceOf(Reservation);
    })

    it('throws badrequest if startDate is invalid', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.startTime = 'not a valid timestamp';

        await expect(async () => {
            await resv.save();
        }).rejects.toThrow('Not a valid beginning timestamp')
    })

    it('throws badrequest if enddate is invalid', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.endTime = 'not a valid timestamp';

        await expect(async () => {
            await resv.save();
        }).rejects.toThrow('Not a valid ending timestamp')
    })
    
    it('throws badrequest if end is before start', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.endTime = '2022-01-01 09:00:00';

        await expect(async () => {
            await resv.save();
        }).rejects.toThrow('End time cannot be before start time.')
    })
    
    it('throws badrequest if quantity is a negative number', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.quantity = -1;

        await expect(async () => {
            await resv.save();
        }).rejects.toThrow('Quantity must be a positive integer')
    })
   
    it('throws badrequest if quantity is 0', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        resv.quantity = 0;

        await expect(async () => {
            await resv.save();
        }).rejects.toThrow('Quantity must be a positive integer')
    })
})

describe('remove', () => {
    it('removes instrument', async () => {
        const resv = await Reservation.get(testResvIds[0]);

        await resv.remove();

        await expect(async () => {
            await Reservation.get(testResvIds[0]);
        }).rejects.toThrow(NotFoundError);
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})