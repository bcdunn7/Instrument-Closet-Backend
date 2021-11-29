'use strict';

import Category from '../models/category';
import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

const testCatIds = [];

beforeAll(async () => {
    await db.query('DELETE FROM categories');

    const resultsCats = await db.query(`
    INSERT INTO categories (category)
    VALUES ('cat1'), ('cat2')
    RETURNING id`);

    testCatIds.splice(0, 0, ...resultsCats.rows.map(c => c.id));
})

beforeEach(async () => {
    await db.query('BEGIN');
})

describe('create', () => {
    it('creates new category', async () => {
        const cat = await Category.create('newcat');

        expect(cat).toEqual({
            id: expect.any(Number),
            category: 'newcat'
        })
    })

    it('returns Category instance', async () => {
        const cat = await Category.create('newcat');

        expect(cat).toBeInstanceOf(Category);
    })

    it('throws badrequest if duplicate category', async () => {
        expect.assertions(2);
        try {
            await Category.create('cat1')
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('Duplicate category: cat1')
        }
    })
})

describe('findAll', () => {
    it('returns array of all categories', async () => {
        const categories = await Category.findAll();

        expect(categories).toEqual([
            {
                id: expect.any(Number),
                category: 'cat1'
            },
            {
                id: expect.any(Number),
                category: 'cat2'
            }
        ])
    })

    it('returns array of category instances', async () => {
        const categories = await Category.findAll();

        expect(categories[0]).toBeInstanceOf(Category)
    })
})

describe('get', () => {
    it('returns a category', async () => {
        const category = await Category.get(testCatIds[0]);

        expect(category).toEqual({
            id: testCatIds[0],
            category: 'cat1'
        })
    })

    it('returns Category instance', async () => {
        const category = await Category.get(testCatIds[0]);

        expect(category).toBeInstanceOf(Category);
    })

    it('throws notfound if id not found', async () => {
        expect.assertions(2);
        try {
            await Category.get(9999)
        } catch (e) {
            expect(e).toBeInstanceOf(NotFoundError);
            expect(e.message).toEqual('No Category with id: 9999')
        }
    })
})

describe('save', () => {
    it('saves category changes', async () => {
        const cat = await Category.get(testCatIds[0]);

        cat.category = 'newname';

        await cat.save();

        const catCheck = await Category.get(testCatIds[0]);

        expect(catCheck).toEqual({
            id: testCatIds[0],
            category: 'newname'
        })

        expect(catCheck).toBeInstanceOf(Category);
    })

    it('woprks even if no change', async () => {
        const cat = await Category.get(testCatIds[0]);

        await cat.save();

        const catCheck = await Category.get(testCatIds[0]);

        expect(catCheck).toEqual({
            id: testCatIds[0],
            category: 'cat1'
        })
    })
})

describe('remove', () => {
    it('removes instrument', async () => {
        const cat = await Category.get(testCatIds[0]);

        await cat.remove();

        try {
            await Category.get(testCatIds[0]);
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
