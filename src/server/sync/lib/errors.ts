/** Thrown before anything is written when an upstream answer looks empty, short or changed in shape. */
export class SuspiciousResponseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'SuspiciousResponseError'
    }
}
