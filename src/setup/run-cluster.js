var cluster = require('cluster');
var Promise = require('bluebird');

var Server = require('./Server');
var Pid = require('../lib/Pid');
var logStartTime = require('../lib/logStartTime');

/**
 * Fork a new worker and listen for log any errors
 * @param    {Ceres}    ceres
 */
function forkWorker(ceres, env) {
  env = typeof env === 'object' ? env : {};
  var worker = cluster.fork(env);
  worker.on('error', function(err) {
    ceres.log._ceres.error(err);
  });
}

/**
 * Make sure everything is setup the way we need to be before we start Listening
 * @param  {Ceres}    ceres
 * @return {Promise}
 */
module.exports = function(ceres) {
  // processManagement
  return this
    .connect.call(this, ceres)
    .then(function listen() {
      return new Promise(function(resolve, reject){
        try {
          if (ceres.config.pid) {
            // Setup Pid if we're configure
            ceres.pid = new Pid(ceres.config.pid);
            ceres.log._ceres.silly('pid %d written to %s', ceres.pid.id, ceres.pid.options.path);
          }

          if (!ceres.config.instances || ceres.config.instances === 1) {
            // If we only have a single instance no need to run the cluster
            Server.call(ceres, ceres).listen(ceres.config.port, function(){
              logStartTime('Server took %ds to start listening', ceres);
              ceres.log._ceres.info('Listening on %d (%s)', ceres.config.port, ceres.config.env);
              resolve();
            });
            return;
          }

          if (cluster.isMaster) {
            // Fork children
            for (var i = 0; i < ceres.config.instances; i++) {
              forkWorker(ceres, { CERES_UNIQUE_ID: i });
            }

            // Attempt to restart children that crash
            cluster.on('exit', function(worker, code, signal){
              if (signal) {
                ceres.log._ceres.info('worker %s was killed by %s', worker.process.pid, signal);
              } else if (code !== 0) {
                ceres.log._ceres.error('worker %s exited with %s. Starting new worker...', worker.process.pid, code, {
                  exitCode: code,
                  argv: process.argv
                });
                try {
                  forkWorker(ceres, { CERES_UNIQUE_ID: worker.process.env.CERES_UNIQUE_ID });
                } catch(err) {
                  // If we fail to form then just exit to prevent infinite loop
                  ceres.log._ceres.error(err, function(e) {
                    ceres.log._ceres.error(e);
                    // Just kill the main process because this normally indices a bigger problem
                    process.exit(1);
                  });
                }
              }
            });

            ceres.log._ceres.info('Master spawned %d children', ceres.config.instances);
          } else {
            // Setup the server
            Server.call(ceres, ceres).listen(ceres.config.port, function(){
              logStartTime('Child ready after %ds', ceres);
              ceres.log._ceres.info('Listening on %d (%s)', ceres.config.port, ceres.config.env);
              resolve();
            });
          }
        } catch(err) {
          reject(err);
        }
      });
    });
};
