'use strict';

import app from './app';
import { PORT } from './config';

app.listen(PORT, () => {
    console.log(`Started on port: ${PORT}`)
})