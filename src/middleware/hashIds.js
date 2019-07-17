module.exports = ceres => {
  if (typeof ceres.config.hashIds !== 'object') {
    return (req, res, next) => {
      next(new Error('hashIds no enabled'));
    };
  }

  /**
   * Middleware function to automatically convert encrypted keys to their
   * respective ids
   * @param  {Exress.Request}     req
   * @param  {Express.Response}   res
   * @param  {Function} next
   */
  return (req, res, next) => {
    if (req.params.key) {
      const id = ceres.HashIds.decode(req.params.key)[0];
      if (Number.isNaN(id)) {
        ceres.log.warn('Error decoding key', req.params.key);
        next(new Error('InvalidKey'));
        return;
      }
      req.params.id = id;
    }
    next();
  };
};
