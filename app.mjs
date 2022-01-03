'use strict';

/** Express application for Instrument Closet */

import express from 'express';
import { NotFoundError } from './expressError';
import { authenticateJWT } from './middleware/authMiddleware';
import userRoutes from './routes/users';
import authRoutes from './routes/auth';
import instRoutes from './routes/instruments';
import resvRoutes from './routes/reservations';
import morgan from 'morgan';
import cors from 'cors';

const app = express();

const options = {
    origin: ['https://the-instrument-closet.surge.sh/']
}

app.use(cors(options));
app.use(express.json());
app.use(morgan('tiny'));
app.use(authenticateJWT);

app.use('/users', cors(), userRoutes);
app.use('/auth', cors(), authRoutes);
app.use('/instruments', cors(), instRoutes);
app.use('/reservations', cors(), resvRoutes);


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