CREATE TABLE users (
    username VARCHAR(128) PRIMARY KEY,
    password TEXT NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128) NOT NULL,
    email TEXT NOT NULL
        CHECK (position('@' IN email) > 1),
    phone VARCHAR(128) NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE
);