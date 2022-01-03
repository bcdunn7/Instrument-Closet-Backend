/** ExpressError extends the normal JS error so we can add additioinal information when instantiating an error 
 * 
 * Additional specific errors then extend ExpressError
*/

class ExpressError extends Error {
    constructor(message, status) {
        super();
        this.message = message;
        this.status = status;
    }
}

// 404 NOT FOUND

class NotFoundError extends ExpressError {
    constructor(message = 'Not Found') {
        super(message, 404);
    }
}

// 401 UNAUTHORIZED

class UnauthorizedError extends ExpressError {
    constructor(message = 'Unauthorized') {
        super(message, 401)
    }
}

// 400 UNAUTHORIZED

class BadRequestError extends ExpressError {
    constructor(message = 'Bad Request') {
        super(message, 400)
    }
}

export default ExpressError
export {
    NotFoundError,
    UnauthorizedError,
    BadRequestError
}