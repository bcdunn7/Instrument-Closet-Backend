'use strict';

import db from '../db';
import { BadRequestError, NotFoundError } from '../expressError';

/** Category database model */
class Category {
    /** Constructor for Category class
     * @constructor
     */
    constructor({ id, category }) {
        this.id = id;
        this.category = category;
    }

    /** Create category
     * @static
     * @async
     * @param {string} category - name of category
     * 
     * @return {Promise<Category>} - promise when reolves bears Category {id, category}
     * @throws {BadRequestError} if category is already taken
     */
    static async create(category) {
        const categoryTaken = await db.query(`
            SELECT category
            FROM categories
            WHERE category = $1`,
            [category]);

        if (categoryTaken.rows[0]) throw new BadRequestError(`Duplicate category: ${category}`);

        const res = await db.query(`
            INSERT INTO categories
                (category)
            VALUES ($1)
            RETURNING id, category`,
            [category]);

        return new Category(res.rows[0])
    }

    /** Find all Categories
     * @static
     * @async
     * 
     * @return {Promise<Array>} - promise when resolved bears categories array [{id, category}, ...]
     */
    static async findAll() {
        const res = await db.query(`
            SELECT id, category
            FROM categories`);
            
        const categories = res.rows.map(c => new Category(c));
        return categories;
    }

    /** Get Category
     * @static
     * @async
     * @param {int} id - category id
     * 
     * @return {Promise<Category>} - promise when resolved bears Category instance {id, category}
     * @throws {NotFoundError} if category with id not found
     */
    static async get(id) {
        const res = await db.query(`
            SELECT id, category
            FROM categories
            WHERE id = $1`,
            [id]);

        if (!res.rows[0]) throw new NotFoundError(`No Category with id: ${id}`);

        const category = new Category(res.rows[0]);
        return category;
    }

    /** Save Category
     * @async
     * 
     * Since these are instantiated models, the instance can be updated programatically and the simply saved to the database:
     * const cat = Category.get(1);
     * cat.category = 'updatedname';
     * cat.save();
     */
    async save() {
        await db.query(`
            UPDATE categories
            SET category=$1
            WHERE id = $2`,
            [this.category, this.id]);
    }

    /** Delete Category
     * @async
     * 
     * Deletes category from database, called on instance.
     */
    async remove() {
        await db.query(`
            DELETE FROM categories
            WHERE id = $1`,
            [this.id]);
    }
}

export default Category;