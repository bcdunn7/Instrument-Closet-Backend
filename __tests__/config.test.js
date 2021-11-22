'use strict';

beforeAll(() => {
    process.env.SECRET_KEY = 'asecret';
    process.env.PORT = '1234';
    process.env.NODE_ENV = 'envtest';
    process.env.DB_USER = 'user'
    process.env.DB_PASSWORD = 'password';
    process.env.DB_PORT = '5678';
})

describe('config gathers variables from env', () => {

    it('works with static variables', () => {

        const { SECRET_KEY, PORT } = require('../config');
        expect(SECRET_KEY).toEqual('asecret');
        expect(PORT).toEqual(1234);
        expect(process.env.NODE_ENV).toEqual('envtest');

        delete process.env.SECRET_KEY
        delete process.env.PORT      
        delete process.env.NODE_ENV 
    });

    it('correctly runs getDatabaseUrl', () => {
        const { getDatabaseUri } = require('../config');
        expect(getDatabaseUri()).toEqual('postgresql://user:password@localhost:5678/instrument_closet')

        process.env.NODE_ENV = 'test';

        expect(getDatabaseUri()).toEqual('postgresql://user:password@localhost:5678/instrument_closet_test')

        delete process.env.DB_USER
        delete process.env.DB_PASSWORD
        delete process.env.DB_PORT
    });
});
