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

    /**
     * Returns the path of the attribute which failed validation.
     */
    getPath(): string {
        return this.details[0].path;
    }

    /**
     * Creates a new QueryValidationError, using the same stacktrace and
     * message, but with a modified validation path.
     */
    setPath(path: string): QueryValidationError {
        const err = new QueryValidationError(path, this.message);
        err.stack = this.stack; // preserve original stacktrace
        return err;
    }
}
