'use strict';

import { DateTime } from 'luxon';
import { BadRequestError } from '../expressError';

export default function convertToUnix(time, timeZone) {

    const dt = DateTime.fromISO(time, { zone: timeZone });

    if (!dt.isValid) {
        throw new BadRequestError(`${dt.invalidReason}: ${dt.invalidExplanation}`)
    }

    const unixTime = dt.toSeconds();

    return unixTime;
} 