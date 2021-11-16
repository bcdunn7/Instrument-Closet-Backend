'use strict';

import { SECRET_KEY, PORT, getDatabaseUri } from '../config';

describe('config gathers variables from env', () => {
    it('works with static variables', () => {

        expect(SECRET_KEY).toEqual('asecret');
        expect(PORT).toEqual(1234);
        expect(process.env.NODE_ENV).toEqual('envtest');

        delete process.env.SECRET_KEY
        delete process.env.PORT      
        delete process.env.NODE_ENV 
    });

    it('correctly runs getDatabaseUrl', () => {
        expect(getDatabaseUri()).toEqual('postgresql://user:password@localhost:5678/instrument_closet')

        process.env.NODE_ENV = 'test';

        expect(getDatabaseUri()).toEqual('postgresql://user:password@localhost:5678/instrument_closet_test')

        delete process.env.DB_USER
        delete process.env.DB_PASSWORD
        delete process.env.DB_PORT
    });
});



