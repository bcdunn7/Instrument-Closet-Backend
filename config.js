'use strict';

// This is how you config/execute dotenv when using modules
import 'dotenv/config';

const SECRET_KEY = process.env.SECRET_KEY || "secret-dev-key";

const PORT = +process.env.PORT || 3001;

// to deal with invalid characters in db password
const URI_DB_PASSWORD = `${encodeURIComponent(process.env.DB_PASSWORD)}`

// Deciding betwee dev, testing, or production db
function getDatabaseUri() {
    return (process.env.NODE_ENV === 'test')
    ? `postgresql://${process.env.DB_USER}:${URI_DB_PASSWORD}@localhost:${process.env.DB_PORT}/instrument_closet_test`
    : process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${URI_DB_PASSWORD}@localhost:${process.env.DB_PORT}/instrument_closet`;
}

// Speeding up bcrypt during testing
const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === 'test' ? 1 : 12;

console.log('Instrument Closet config:');
console.log('SECRET_KEY:', SECRET_KEY);
console.log('PORT:', PORT);
console.log('BCRYPT_WORK_FACTOR:', BCRYPT_WORK_FACTOR);
console.log('NODE_ENV:', process.env.NODE_ENV || 'dev');
console.log('---');


export {
    SECRET_KEY, 
    PORT, 
    BCRYPT_WORK_FACTOR, 
    getDatabaseUri
};
