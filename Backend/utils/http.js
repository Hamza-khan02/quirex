// Every API response has the same shape. The HTTP status matches `code`, so
// clients can rely on either.
export const send = (res, code, message, data = null) =>
  res.status(code).json({ code, message, data });
