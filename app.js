'use strict';

/** Express application for Instrument Closet */

import express from 'express';
import { NotFoundError } from './expressError';
import { authenticateJWT } from './middleware/authMiddleware';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import instRoutes from './routes/instruments';
import resvRoutes from './routes/reservations';

const morgan = require('morgan');

const app = express();


app.use(express.json());
app.use(morgan('tiny'));
app.use(authenticateJWT);

app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/instruments', instRoutes);
app.use('/reservations', resvRoutes);


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