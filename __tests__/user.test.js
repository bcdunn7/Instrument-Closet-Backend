'use strict';

import User from '../models/user';
import db from '../db';
import bcrypt from 'bcrypt';
import { 
    NotFoundError, 
    BadRequestError, 
    UnauthorizedError
} from '../expressError';
import { BCRYPT_WORK_FACTOR } from '../config';

const testInstIds = [];
const testUserIds = [];
const testResvIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM users');
    await db.query('DELETE FROM instruments');
    await db.query('DELETE FROM reservations');

    const resultsUsers = await db.query(`
    INSERT INTO users (username, password, first_name, last_name, email, phone, is_admin) 
        VALUES ('user1', $1, 'u1first', 'u1last', 'u1@email.com', '1005559999', 'FALSE'),
        ('user2', $2, 'u2first', 'u2last', 'u2@email.com', '2005559999', 'FALSE'),
        ('admin1', $3, 'a1first', 'a1last', 'a1@email.com', '1115559999', 'TRUE')
        RETURNING id
    `,
    [
        await bcrypt.hash('password1', BCRYPT_WORK_FACTOR),
        await bcrypt.hash('password2', BCRYPT_WORK_FACTOR),
        await bcrypt.hash('passworda1', BCRYPT_WORK_FACTOR)
    ])

    testUserIds.splice(0, 0, ...resultsUsers.rows.map(u => u.id))

    const resultsInsts = await db.query(`
    INSERT INTO instruments (name, quantity, description, image_url) 
        VALUES ('inst1', 1, 'desc of inst1', 'inst1.png'),
        ('inst2', 2, 'desc of inst2', 'inst2.png'),
        ('inst3', 3, 'desc of inst3', 'inst3.png')
        RETURNING id`)

    testInstIds.splice(0, 0, ...resultsInsts.rows.map(i => i.id));

    const resultsResvs = await db.query(`
        INSERT INTO reservations
            (user_id, instrument_id, quantity, start_time, end_time, notes)
        VALUES
            ($1, $2, 1, 1641027600, 1641034800, 'somenotes'),
            ($3, $4, 2, 1641117600, 1641121200, 'somenotes2')
        RETURNING id`,
        [testUserIds[0], testInstIds[0], testUserIds[0], testInstIds[2]]);

    testResvIds.splice(0, 0, ...resultsResvs.rows.map(r => r.id));

})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('authenticate', () => {
    it('correctly authenticates', async () => {
        const user = await User.authenticate('user1', 'password1');

        expect(user).toEqual({
            id: expect.any(Number),
            username: 'user1',
            firstName: 'u1first',
            lastName: 'u1last',
            email: 'u1@email.com',
            phone: '1005559999',
            isAdmin: false
        })
    })

    it('returns a User instance', async () => {
        const user = await User.authenticate('user1', 'password1');

        expect(user).toBeInstanceOf(User);
    })

    it('throws unauth if no such user', async () => {
        expect.assertions(2);
        try {
            await User.authenticate('notauser', 'password');
        } catch (e) {
            expect(e).toBeInstanceOf(UnauthorizedError);
            expect(e.message).toEqual('Username not recognized')
        }
    })

    it('throws unauth if wrong pasword', async () => {
        expect.assertions(2);
        try {
            await User.authenticate('user1', 'wrongpass');
        } catch (e) {
            expect(e).toBeInstanceOf(UnauthorizedError);
            expect(e.message).toEqual('Invalid password');
        }
    })
})

describe('register', () => {
    it('registers user', async () => {
        const newUser = await User.register({
            username: 'newuser',
            password: 'password',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        })

        expect(newUser).toEqual({
            id: expect.any(Number),
            username: 'newuser',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        });
    })

    it('returns new User instance', async () => {
        const newUser = await User.register({
            username: 'newuser',
            password: 'password',
            firstName: 'newfirst',
            lastName: 'newlast',
            email: 'new@email.com',
            phone: '1112223333',
            isAdmin: false
        })

        expect(newUser).toBeInstanceOf(User);
    })

    it('throws badrequest if duplicate username', async () => {
        expect.assertions(2);
        try {
            await User.register({
                username: 'user1',
                password: 'password',
                firstName: 'first',
                lastName: 'last',
                email: 'email@emai.com',
                phone: '1112223333',
                isAdmin: false
            });
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('Duplicate username: user1');
        }
    })
})

describe('findAll', () => {
    it('finds all users', async () => {
        const users = await User.findAll();

        expect(users[0]).toEqual({
            id: expect.any(Number),
            username: 'admin1',
            firstName: 'a1first',
            lastName: 'a1last',
            email: 'a1@email.com',
            phone: '1115559999',
            isAdmin: true
        })

        expect(users.length).toEqual(3);
    })

    it('returns array of User isntances', async () => {
        const users = await User.findAll();

        expect(users).toBeInstanceOf(Array);

        expect(users[0]).toBeInstanceOf(User);
    })
})

describe('get', () => {
    it('gets user', async () => {
        const user = await User.get('user1');

        expect(user).toEqual({
            id: expect.any(Number),
            username: 'user1',
            firstName: 'u1first',
            lastName: 'u1last',
            email: 'u1@email.com',
            phone: '1005559999',
            isAdmin: false
        })
    })

    it('returns User instance', async () => {
        const user = await User.get('user1');

        expect(user).toBeInstanceOf(User);
    })
    
    it('throws notfound if user not found', async () => {
        expect.assertions(2);
        try {            
            await User.get('notauser');
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
            expect(e.message).toEqual('User not found: notauser')
        }
    })
})

describe('get reservations', () => {
    it('returns array of reservations', async () => {
        const user = await User.get('user1');

        const resvs = await user.getReservations();

        expect(resvs).toEqual([
            {
                endTime: 1641121200,
                id: testResvIds[1],
                instrumentId: testInstIds[2],
                instrumentName: 'inst3',
                notes: 'somenotes2',
                quantity: 2,
                startTime: 1641117600,
                userId: testUserIds[0],
            },
            {
                endTime: 1641034800,
                id: testResvIds[0],
                instrumentId: testInstIds[0],
                instrumentName: 'inst1',
                notes: 'somenotes',
                quantity: 1,
                startTime: 1641027600,
                userId: testUserIds[0],
            },
        ])
    })

    it('returns empty array if no reservations', async () => {
        const user = await User.get('user2');

        const resvs = await user.getReservations();

        expect(resvs).toEqual([]);
    })
})

describe('save', () => {
    it('saves user changes', async () => {
        const user = await User.get('user1');

        user.firstName = 'newName!';
        user.email = 'new@email.com';

        await user.save()

        const userCheck = await User.get('user1');

        expect(userCheck).toEqual({
            id: expect.any(Number),
            username: 'user1',
            firstName: 'newName!',
            lastName: 'u1last',
            email: 'new@email.com',
            phone: '1005559999',
            isAdmin: false         
        })

        expect(userCheck).toBeInstanceOf(User);
    })

    it('works even if no change', async () => {
        const user = await User.get('user1');

        await user.save();

        const userCheck = await User.get('user1');

        expect(userCheck).toEqual({ 
            id: expect.any(Number),
            username: 'user1',
            firstName: 'u1first',
            lastName: 'u1last',
            email: 'u1@email.com',
            phone: '1005559999',
            isAdmin: false   
        })
    })
})

describe('remove', () => {
    it('removes user', async () => {
        const user1 = await User.get('user1');
        await user1.remove();

        try {
            await User.get('user1')
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
        }
    })
})

afterEach(async () => {
    await db.query('ROLLBACK');
})

afterAll(async () => {
    await db.end();
})