const express = require('express');
const path = require('path');

/**
 * Attach routes to a Express router router
 * @param     {Object}    Options {
 *                                  routers: Object
 *                                  folder: String
 *                                }
 * @return    {Express.router}
 */
const Benchmark = require('../lib/Benchmark');

module.exports = function routes(ceres, prop) {
  const folder = ceres.config.folders[prop];
  const routers = ceres.config[prop];

  const router = new express.Router();
  // eslint-disable-next-line no-restricted-syntax
  for (const name in routers) {
    // eslint-disable-next-line no-prototype-builtins
    if (!routers.hasOwnProperty(name)) {
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      const benchmark = new Benchmark();
      const controller = require(path.resolve(`${folder}/${name}`));
      const endpoint = routers[name];
      controller.name = name;
      controller.endpoint = endpoint;
      router.use(endpoint, controller.router(ceres));
      benchmark.stop();
      const SLOW_SETUP_CUTOFF_MS = 200;
      if (benchmark.val() > SLOW_SETUP_CUTOFF_MS) {
        ceres.log.internal.debug(
          '[%s] %s -> %s took longer than %dms to initialize - %ss',
          prop,
          endpoint,
          name,
          SLOW_SETUP_CUTOFF_MS,
          (benchmark.val() / 1000).toLocaleString(),
          { name, duration: benchmark.val() }
        );
      } else {
        ceres.log.internal.silly(
          '[%s] %s -> %s initialized - %ss',
          prop,
          endpoint,
          name,
          (benchmark.val() / 1000).toLocaleString(),
          { name, duration: benchmark.val() }
        );
      }
    } catch (err) {
      ceres.log.internal.error('Unable to setup', name);
      throw err;
    }
  }
  ceres.log.internal.silly('Setup router for %s', prop);
  return router;
};
