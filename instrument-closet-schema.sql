CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(128) UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" VARCHAR(128) NOT NULL,
    "last_name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(128) NOT NULL
            CHECK (position('@' IN email) > 1),
    "phone" VARCHAR(64) NOT NULL,
    "is_admin" BOOLEAN DEFAULT false NOT NULL
);

CREATE TABLE "instruments" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(128) NOT NULL,
    "quantity" INT NOT NULL,
    "description" TEXT NULL,
    "image_url" TEXT NOT NULL
);

CREATE TABLE "categories" (
    "id" SERIAL PRIMARY KEY,
    "category" VARCHAR(128) UNIQUE NOT NULL
);

CREATE TABLE "instrument_category" (
    "instrument_id" INT NOT NULL
        REFERENCES instruments ON DELETE CASCADE,
    "category_id" INT NOT NULL
        REFERENCES categories ON DELETE CASCADE,
    CONSTRAINT "pk_instrument_category" PRIMARY KEY (
        "instrument_id","category_id"
     )
);

CREATE TABLE "reservations" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INT NOT NULL
        REFERENCES users ON DELETE CASCADE,
    "instrument_id" INT NOT NULL
        REFERENCES instruments ON DELETE CASCADE,
    "quantity" INT NOT NULL CHECK (quantity >= 1),
    "start_time" TIMESTAMP NOT NULL,
    "end_time" TIMESTAMP NOT NULL,
    "notes" TEXT NULL
);
