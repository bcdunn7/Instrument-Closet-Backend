'use strict';

import jwt from 'jsonwebtoken';
import { 
    authenticateJWT,
    ensureLoggedIn,
    ensureAdmin,
    ensureCorrectUserOrAdmin
} from '../middleware/authMiddleware';
import { SECRET_KEY } from '../config';
import { UnauthorizedError } from '../expressError';

const testUserJWT = jwt.sign({ username: 'testuser', isAdmin: false}, SECRET_KEY);
const testAdminJWT = jwt.sign({ username: 'testadmin', isAdmin: true}, SECRET_KEY);
const wrongJWT = jwt.sign({ username: 'testuser', isAdmin: false}, 'invalid');

describe('authenticateJWT', () => {
    it('authenticates user via header', () => {
        const req = { headers: { authorization: `Bearer ${testUserJWT}` } };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                username: 'testuser',
                isAdmin: false
            }
        })
    });

    it('authenticates admin via header', () => {
        const req = { headers: { authorization: `Bearer ${testAdminJWT}` } };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                username: 'testadmin',
                isAdmin: true
            }
        })
    });

    it('authenticates via body', () => {
        const req = { body: { _token: testUserJWT} };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                username: 'testuser',
                isAdmin: false
            }
        })
    });

    it('works with no token', () => {
        const req = {};
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({})
    });

    it('works with invalid token via header', () => {
        const req = { headers: { authorization: `Bearer ${wrongJWT}` } };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({})
    });

    it('works with invalid token via body', () => {
        const req = { body: { _token: wrongJWT} };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({})
    });

    it('accepts token from header before body', () => {
        const req = {
            headers: { authorization: `Bearer ${testUserJWT}` },
            body: { _token: testAdminJWT}
        };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({
            user: {
                iat: expect.any(Number),
                username: 'testuser',
                isAdmin: false
            }
        })    
    });

    it('does not use body token if header token invalid', () => {
        const req = {
            headers: { authorization: `Bearer ${wrongJWT}` },
            body: { _token: testAdminJWT}
        };
        const res = { locals: {} };
        const next = (err) => {
            expect(err).toBeFalsy();
        };

        authenticateJWT(req, res, next);
        expect(res.locals).toEqual({})    
    });
});

describe('ensureLoggedIn', () => {
    it('works', () => {
        const req = {};
        const res = { locals: { user: {
            username: 'testuser',
            isAdmin: false
        }}};
        const next = (err) => {
            expect(err).toBeFalsy();
        }

        ensureLoggedIn(req, res, next);
    });

    it('throws unauth if no user', () => {
        const req = {};
        const res = { locals: {}};
        const next = (err) => {
            expect(err).toBeInstanceOf(UnauthorizedError);
            expect(err.message).toEqual('Must be logged in.')
        }

        ensureLoggedIn(req, res, next);
    });
});

describe('ensureAdmin', () => {
    it('works', () => {
        const req = {};
        const res = { locals: { user: {
            username: 'testadmin',
            isAdmin: true
        }}};
        const next = (err) => {
            expect(err).toBeFalsy();
        }

        ensureAdmin(req, res, next);
    })

    it('throws unauth if not admin', () => {
        const req = {};
        const res = { locals: { user: {
            username: 'testuser',
            isAdmin: false
        }}};
        const next = (err) => {
            expect(err).toBeInstanceOf(UnauthorizedError);
            expect(err.message).toEqual('Must be admin.')
        }

        ensureAdmin(req, res, next);
    })

    it('throws unauth if no user', () => {
        const req = {};
        const res = { locals: {}};
        const next = (err) => {
            expect(err).toBeInstanceOf(UnauthorizedError);
            expect(err.message).toEqual('Must be admin.')
        }

        ensureAdmin(req, res, next);
    });
})

describe('ensureCorrectUserOrAdmin', () => {
    it('works with admin', () => {
        const req = { params: { username: 'testuser'}};
        const res = { locals: { user: {
            username: 'testadmin', 
            isAdmin: true 
        }}};
        const next = (err) => {
            expect(err).toBeFalsy();
        }

        ensureCorrectUserOrAdmin(req, res, next);
    })

    it('works with correct user', () => {
        const req = { params: { username: 'testuser'}};
        const res = { locals: { user: {
            username: 'testuser', 
            isAdmin: false 
        }}};
        const next = (err) => {
            expect(err).toBeFalsy();
        }

        ensureCorrectUserOrAdmin(req, res, next);
    })

    it('throws unauth if not correct user or admin', () => {
        const req = { params: { username: 'wrong'}};
        const res = { locals: { user: {
            username: 'testuser', 
            isAdmin: false 
        }}};
        const next = (err) => {
            expect(err).toBeInstanceOf(UnauthorizedError);
        }

        ensureCorrectUserOrAdmin(req, res, next);
    })

    it('throws unauth if anon', () => {
        const req = { params: { username: 'wrong'}};
        const res = { locals: {}};
        const next = (err) => {
            expect(err).toBeInstanceOf(UnauthorizedError);
        }

        ensureCorrectUserOrAdmin(req, res, next);
    })
})
