import app from '../app';
import db from '../db';
const request = require('supertest');

describe('404', () => {
    it('throws not found if no such path', async () => {
        const resp = await request(app).get('/not-a-real-path');
        expect(resp.statusCode).toEqual(404);
    })
})

afterAll(function () {
    db.end();
});