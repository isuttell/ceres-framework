/*******************************************************************************
 * bootstrap
 *
 * @author       Isaac Suttell <isaac_suttell@playstation.sony.com>
 * @file         Load application settings
 ******************************************************************************/

// Modules
var fs = require('fs');
var path = require('path');

var merge = require('../lib/merge');

/**
 * Read the config RC File
 *
 * @param     {Object}    options
 * @return    {Object}
 */
function rcConfig(file) {
	file = path.resolve(file || '.configrc');

	// Must exist
	fs.accessSync(file);

	// Read
	var rc = fs.readFileSync(file, {
		encoding: 'utf8'
	});

	// Convert to JS
	rc = JSON.parse(rc);

	return rc;
}

/**
 * Require a config file
 *
 * @param  {String} env
 * @return {Object}
 */
function requireConfig(env) {
	env = env || 'default';
	var fileName = process.cwd() + '/config/' + env + '.js';
	try {
		if (fs.accessSync(fileName)){
			return require(fileName);
		}
		return {};
	} catch(accessError) {
		if (accessError.message.indexOf('ENOENT') === 0) {
			return {};
		} else {
			throw accessError;
		}
	}
}

/**
 * Grab the path to the machine config
 * @param    {Array<Object>}    configs
 * @return   {String}
 */
function getRCPath(configs) {
	var config = configs.find(function(conf){
		return typeof conf === 'object' && conf.rc;
	});
	return config ? path.resolve(config.rc) : void 0;
}

/**
 * Search for webpack config
 * @param    {String}    env
 * @return   {Object}
 */
function getWebpack(env) {
	var files = [process.cwd() + '/config/webpack' + env + '.js', process.cwd() + '/config/webpack.default.js', process.cwd() + '/config/webpack.config.js'];
	var index = files.length;
	while (--index > 0) {
		try {
			if (fs.accessSync(files[index])) {
				return require(files[index]);
			}
		} catch(accessError) {
			if (accessError.message.indexOf('ENOENT') !== 0) {
				throw accessError;
			}
		}
	}
	return {};
}

module.exports = function(cli) {
	if (typeof cli !== 'object') {
		cli = {};
	}

	// Framework defaults
	var defaultConfig = require('../../config/default');

	// Get global config
	var config = requireConfig();

	// Get the environment
	var env = [cli.env, config.env, process.env.NODE_ENV, 'production'].find(function(item){
		return typeof item === 'string';
	});

	// Get env specific config
	var envConfig = requireConfig(env);

	// listen for the port as an environmental variable. If we see it, use it.
	if (process.env.PORT) {
		envConfig.port = process.env.PORT;
	}

	// Get the location of the machine config file
	var rcPath = getRCPath([cli, envConfig, config]);

	// Get machine specific settings
	var rc = rcConfig(rcPath);

	// Merge config sources together
	config = merge({}, defaultConfig, config, envConfig, rc, cli);

	config.rc = rcPath;

	// Resolve all paths
	for (var folder in config.folders) {
		if (config.folders.hasOwnProperty(folder)) {
			config.folders[folder] = path.resolve(config.folders[folder]);
		}
	}

	config.webpackConfig = getWebpack(env);

	return config;
};
