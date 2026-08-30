// Shared helper for throwing an Error carrying an HTTP status code, caught
// by errorHandler.js. Used across services so routes can just `next(err)`.
export function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}
