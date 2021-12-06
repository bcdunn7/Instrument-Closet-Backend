'use strict';

import { BadRequestError } from "../expressError";
import convertToUnix from "../helpers/time";

describe('convertToUnix', () => {
    it('converts time', async () => {
        const unixStartTime  = convertToUnix('2021-01-01T09:00:00', 'America/Chicago');

        expect(unixStartTime).toEqual(1609513200);
    })

    it('converts time, timezone does effect time', async () => {
        const unixEndTime = convertToUnix('2021-01-02T11:00:00', 'America/New_York');

        expect(unixEndTime).toEqual(1609603200);
    })

    it('throws error if invalid IANA', async () => {
        expect.assertions(2);
        try {
            convertToUnix('2021-01-02T11:00:00', 'America/bogus');
        } catch (e) {
            expect(e).toBeInstanceOf(BadRequestError);
            expect(e.message).toEqual('unsupported zone: the zone \"America/bogus\" is not supported')   
        }
    })
    
    it('throws error if invalid ISO 8601', async () => {
        expect.assertions(1);
        try {
            convertToUnix('20211-01-01T09:00:00', 'America/Chicago');
        } catch (e) {
            expect(e.message).toEqual('unparsable: the input \"20211-01-01T09:00:00\" can\'t be parsed as ISO 8601')   
        }
    })
})
