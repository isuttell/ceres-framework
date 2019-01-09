/*******************************************************************************
 * Worker Instance
 ******************************************************************************/
var http = require('http');

var Application = require('./express');
var directory = require('./directory');
var sockets = require('./sockets');

var Benchmark = require('../lib/Benchmark');

module.exports = function(ceres) {
  const benchmarks = {};
  benchmarks.express = new Benchmark();

  ceres.log._ceres.silly('Starting express configuration...');

  // Bind the correct context
  if (ceres.config.folders.middleware) {
    benchmarks.middleware = new Benchmark();
    ceres.config.middleware = directory(ceres.config.folders.middleware, ceres);
    ceres.middleware = ceres.config.middleware;
    benchmarks.middleware.stop();
    ceres.log._ceres.info('Middleware setup complete - %ss', (benchmarks.middleware.val() / 1000).toLocaleString(), { duration: benchmarks.middleware.val() });
  }

  // The master doesn't do very much besides load the workers so we also use it
  // handle the queues. If a queue crashes then the master will crash as well...
  if (ceres.config.folders.queues) {
    benchmarks.queues = new Benchmark();
    // Load any files in this folder and apply this config
    directory(ceres.config.folders.queues, {
      config: ceres.config
    });

    benchmarks.queues.stop();
    ceres.log._ceres.info('Queue setup complete - %ss', (benchmarks.queues.val() / 1000).toLocaleString(), { duration: benchmarks.queues.val() });
  }

  // Setup Express
  var app = Application.call(ceres, ceres);

  if (ceres.config.db.type !== 'none') {
    // Setup DB
    var db = require('../db')(ceres.config);
    app.set('db', db);
  }

  // Setup server
  var server = http.Server(app); // eslint-disable-line new-cap

  // Should we load sockets
  if (ceres.config.sockets && ceres.config.folders.sockets) {
    benchmarks.sockets = new Benchmark();
    // Setup any sockets
    sockets(ceres, app, server);
    benchmarks.sockets.stop();
    ceres.log._ceres.info('Socket setup complete - %ss', (benchmarks.sockets.val() / 1000).toLocaleString(), { duration: benchmarks.sockets.val() });
  }

  benchmarks.express.stop();
  ceres.log._ceres.info('Express setup complete - %ss', (benchmarks.express.val() / 1000).toLocaleString(), { duration: benchmarks.express.val() });

  return server;
};
