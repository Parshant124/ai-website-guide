// Every expected failure is a GuidanceError so the HTTP layer returns one
// consistent error shape.
export class GuidanceError extends Error {
  constructor(code, message, httpStatus = 500) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
