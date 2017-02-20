/*******************************************************************************
 * Ceres
 *
 * @author       Isaac Suttell <isaac_suttell@playstation.sony.com>
 * @file         Framework constructor
 ******************************************************************************/

var path = require('path');
var Promise = require('bluebird');
var EventEmitter = require('events');

var setupConfig = require('./setup/config');
var setupCache = require('./setup/cache');
var setupLogs = require('./setup/logs');
var runCluster = require('./setup/run-cluster');
var runFork = require('./setup/run-fork');

function Ceres() {
  this.startTime = process.hrtime();

  // Bind and pass in this as an arg
  this.Controller = this.Controller.bind(this, this);
  this.Model = this.Model.bind(this, this);
  // Ensure create has the right context
  this.Pipeline.create = this.Pipeline.create.bind(this);

  // Bind everything else just in case
  for (var key in this) {
    if (typeof this[key] === 'function') {
      this[key] = this[key].bind(this);
    }
  }

	// Setup event emitter
	this._events = new EventEmitter();
	this.on = this._events.on.bind(this._events);
	this.removeListener = this._events.removeListener.bind(this._events);
	this.emit = this._events.emit.bind(this._events);

	this.on('configured', function(){
		this.HashIds = this.HashIds.call(this, this);
	}.bind(this));
}

/**
 * Placeholder for Database object
 * @type    {Object}
 */
Ceres.prototype.Database = {};

/**
 * Make contoller available at base level
 */
Ceres.prototype.Controller = require(path.resolve(__dirname + '/controllers/Controller'));

/**
 * Make the model available at the base level
 */
Ceres.prototype.Model = require(path.resolve(__dirname + '/models/Model'));

/**
 * Link to hashIds
 * @type    {Object}
 */
Ceres.prototype.HashIds = require(path.resolve(__dirname + '/lib/hashIds'));

/**
 * Alias cut to Pipeline
 */
Ceres.prototype.Pipeline = require(path.resolve(__dirname + '/render/Pipeline'));

/**
 * Alias to run
 */
Ceres.prototype.run = function run() {
	// Ensure secret is present
	if (!this.config.secret) {
		throw new Error('Unable to find secret.');
	}
	if (this.config.processManagement === 'fork') {
		return runFork(this);
	} else {
		return runCluster(this);
	}
};

/**
 * Connect to database and cache
 * @return {Promise}
 */
Ceres.prototype.connect = function() {
  return new Promise(function(resolve, reject){
		if (typeof this.config !== 'object') {
			reject(new Error('Ceres has not been configured yet'));
			return;
		}

		var type = this.config.db.type;
    if (['bookshelf', 'rethinkdb', 'mongodb'].indexOf(type) === -1) {
			this.log._ceres.silly('Skipping database setup');
			return setupCache(this)
				.then(function(cache){
					this.Cache = cache;
					return this;
				}.bind(this));
    }

    this.log._ceres.silly('Setting up ' + type);

		// Expose these for any help function
		if (type === 'bookshelf') {
			this.Model.Bookshelf = require('./models/types/bookshelf');
		} else if (type === 'rethinkdb') {
			this.Model.Rethinkdb = require('./models/types/rethinkdb');
		} else if (type === 'mongodb') {
			this.Model.Mongodb = require('./models/types/mongodb');
		}

    var connect = require(__dirname + '/db')(this.config, this);

    return connect.then(function(db){
        this.Database = db;
        return setupCache(this);
			}.bind(this))
			.then(function(cache){
				this.Cache = cache;
				return this;
      }.bind(this))
      .then(resolve)
      .catch(reject);
  }.bind(this));
};

/**
 * Configure application
 * @param  {Object} options External options
 * @return {Promise}
 */
Ceres.prototype.configure = function(options) {
  return new Promise(function(resolve, reject){
    try {
      // Bootstrap config
      this.config = setupConfig(options);
    } catch (err) {
      reject(err);
			return;
    }

		// Bind config and allow custom loggers
		this.logger = setupLogs.bind(this, this.config);

		// Setup default logging
		this.log = this.logger();

		// Setup internal framework logger so we can tell if its an app or framework erro
		this.log._ceres = this.logger('ceres');

		this.log._ceres.debug('Writing logs to %s', this.config.folders.logs);

		// Emit a configured silly can listen to
		this.log._ceres.silly('EVENT: configured');
		this.emit('configured');

		resolve(this);
  }.bind(this));
};

/**
 * Load the app
 * @deprecated
 * @param  {Object} options
 */
Ceres.prototype.load = function(options) {
  var instance = this;
  return instance
    .configure(options)
    .then(instance.connect)
		.then(function(ceres){
			this.log._ceres.silly('EVENT: before:run');
			this.emit('before:run');
			return ceres;
		}.bind(this))
    .catch(function(err){
      if (instance.log) {
        instance.log._ceres.error(err);
      } else {
        console.error(err.stack);
      }
    });
};

/**
 * Load the app
 * @param  {Object} options
 */
Ceres.prototype.exec = function(command, options) {
  var instance = this;
  return instance
    .configure(options)
		.then(function(ceres){
			this.log._ceres.silly('EVENT: before:run');
			this.emit('before:run');
			return ceres;
		}.bind(this))
    .then(command.bind(this, this))
    .catch(function(err){
      if (instance.log) {
        instance.log._ceres.error(err);
      } else {
        console.error(err.stack);
      }
    });
};

module.exports = Ceres;
