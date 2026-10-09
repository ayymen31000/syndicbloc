// src/middleware/validator.js - Zod input validation middleware (Security Point 4)
const { ZodError } = require('zod');

function validateRequest(schemas) {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return res.status(422).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Données de requête invalides.',
          errors: issues,
        });
      }
      return next(err);
    }
  };
}

module.exports = { validateRequest };
