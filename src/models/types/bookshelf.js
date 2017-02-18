/*******************************************************************************
 * Base Model
 ******************************************************************************/

var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var BaseModel = require('../BaseModel');

function assertNotNull(val) {
  if (val === null) {
    throw new TypeError('Model is null');
  }
}

function assetDefined(val, name) {
  if (typeof val === 'undefined') {
    throw new TypeError((typeof name === 'string' ? name : 'value') + ' is undefined');
  }
}

var Model = BaseModel.extend({
  /**
   * Store a copy of the bookself model to handle relationship
   *
   * @type    {Bookself.model}
   */
  model: null,

  /**
   * Create model and return a promise
   *
   * @param     {Object}    body
   * @return    {promise}
   */
  create: function(body) {
    assertNotNull(this.model);
    return new this.model(body).save(null, {
      method: 'insert'
    });
  },

  /**
   * Read a single model
   *
   * @param     {Mixed}    id
   * @return    {promise}
   */
  read: function(id) {
    assertNotNull(this.model);
    assetDefined(id, 'id');
    if (_.isObject(id)) {
      return new this.model({
        id: id.id
      }).fetch(this.fetch);
    } else {
      return new this.model({
        id: id
      }).fetch(this.fetch);
    }
  },

  /**
   * Read all models
   * @return {Promise}
   */
  readAll: function() {
    assertNotNull(this.model);
    return this.model.fetchAll(this.fetch);
  },

  /**
   * Perform a custom query
   *
   * @param     {Object}    query
   * @return    {Promise}
   */
  find: function(query) {
    assertNotNull(this.model);
    return new this.model(query).fetch(this.fetch);
  },

  /**
   * Perform a query with the knex query builder
   */
  query: function(queryBuilder) {
    assertNotNull(this.model);
    return this.model.query(queryBuilder).fetchAll(this.fetch);
  },

  /**
   * Update/Patch a single model
   *
   * @param     {Object}    body
   * @return    {promise}
   */
  update: function(body, id) {
    if (typeof id === 'undefined' && typeof body.id !== 'undefined') {
      id = body.id;
    }
    assertNotNull(this.model);
    assetDefined(id, 'id');

    // Clone so we don't mutate accidently
    Object.assign({}, body);

    delete body.id; // Can't update the ID
    delete body.created_at; // You can only create it once
    delete body.updated_at; // Handled by DB

    return new this.model({
      id: id
    }).save(body, {
      patch: true,
      method: 'update'
    }).then(function(model) {
      // Get relations
      return model.fetch(this.fetch);
    }.bind(this));
  },

  updateAll: function(body) {
    if (body instanceof Array !== true) {
      body = [body];
    }
    return Promise.all(body.map(function(doc) {
      return this.update(doc, doc.id);
    }.bind(this)));
  },

  /**
   * Delete a model
   *
   * @param     {Number}    id
   * @return    {promise}
   */
  del: function(id) {
    assertNotNull(this.model);
    assetDefined(id, 'id');
    return new this.model({
      id: id
    }).destroy();
  }
});

module.exports = Model;

/**
 * Helper function to create new models
 * @param     {Object}    props
 * @return    {Object}
 */
module.exports.extend = function extend(props) {
  // Override defaults
  var model = _.merge({
    database: this.Database.bookshelf
  }, Model, props);

  // Ensure correct this context
  model = _.bindAll(model);

  model.model = this.Database.bookshelf.Model.extend(model.table);

  return model;
};

/**
 * Convert Dates to timestamps
 *
 * @param     {Array}    fields
 */
module.exports.convertTimestampsToUnix = function convertTimestampsToUnix(fields, options) {
  options = options || {};
  fields = fields || ['created_at', 'updated_at'];

  /**
   * Bookshelf process function
   *
   * @param     {Array}    attrs
   */
  return function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
      if (options.camelCase) {
        key = _.camelCase(key);
      }
      if (val && fields.indexOf(key) > -1) {
        memo[key] = moment(val).format('x');
      } else {
        memo[key] = val;
      }
      return memo;
    }, {});
  };
};

/**
 * Convert dates to ISO8601
 *
 * @param     {Array}    fields
 */
module.exports.convertDatesToISO8601 = function convertDatesToISO8601(fields, options) {
  options = options || {};
  fields = fields || ['created_at', 'updated_at'];

  /**
   * Bookshelf process function
   *
   * @param     {Array}    attrs
   */
  return function(attrs) {
    return _.reduce(attrs, function(memo, val, key) {
      if (options.camelCase) {
        key = _.camelCase(key);
      }
      if (val && fields.indexOf(key) > -1) {
        memo[key] = moment(val).utc().format();
      } else {
        memo[key] = val;
      }
      return memo;
    }, {});
  };
};
