'use strict';

/** Express application for Instrument Closet */

import express from 'express';
import { NotFoundError } from './expressError';

const morgan = require('morgan');

const app = express();

app.use(morgan('tiny'));


/** 404 Error */
app.use((req, res, next) => {
    return next(new NotFoundError());
});

/** Error Handler */
app.use((err, req, res, next) => {
    //Default statusis 500 Iternal Server Error
    let status = err.status || 500;
    let message = err.message;

    return res.status(status).json({
        error: {message, status}
    });
});

export default app;