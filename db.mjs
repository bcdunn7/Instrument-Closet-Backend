'use strict';

/** Database setup for Instrument Closet. */

import pgPKG from 'pg';
const { Client } = pgPKG;
import { getDatabaseUri } from './config';

let db;

if (process.env.NODE_ENV === 'production') {
    db = new Client({
        connectionString: getDatabaseUri(),
        ssl: {
            rejectUnauthorized: false
        }
    });
} else {
    db = new Client({
        connectionString: getDatabaseUri()
    })
}

db.connect();

export default db;
