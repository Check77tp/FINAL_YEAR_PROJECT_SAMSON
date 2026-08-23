// Centralized error handler — keeps error formatting out of routes/services.
// Must be registered last, after all other app.use()/routes calls.
export function errorHandler(err, req, res, next) {
  console.error(err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
}
