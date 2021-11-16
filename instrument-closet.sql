\echo 'Delete and recreate instrument_closet database?'
\prompt 'Return for yes or control-C to cancel > '

DROP DATABASE instrument_closet;
CREATE DATABASE instrument_closet;
\connect instrument_closet

\i instrument-closet-schema.sql

\echo 'Delete and recreate instrument_closet_test database?'
\prompt 'Return for yes or control-C to cancel > '

DROP DATABASE instrument_closet_test;
CREATE DATABASE instrument_closet_test;
\connect instrument_closet_test

\i instrument-closet-schema.sql
