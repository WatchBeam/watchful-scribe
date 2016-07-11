/**
 * QueryValidationError is a Joi/Jojen-style error which contains information
 * about the path property which failed validation.
 */
export class QueryValidationError extends Error {

    public details : Array<{ path: string, message: string, type: string }>;

    constructor(path: string, message: string) {
        super(message); // make TS happy

        Error.captureStackTrace(this);
        this.message = message;
        this.details = [{
            path,
            message,
            type: 'scribe'
        }];
    }
}
