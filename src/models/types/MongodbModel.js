/** *****************************************************************************
 * Base Model
 ***************************************************************************** */

const _ = require('lodash');
const Promise = require('bluebird');

/**
 * Initial model
 * @param    {[type]}    props    [description]
 */
function MongodbModel(props) {
  // Overview defaults
  Object.assign(this, props);

  // Ensure correct context
  _.bindAll(this);

  // Setup Mongo
  this.collection = this.Database.collection(this.table.tableName);
}

MongodbModel.prototype = Object.assign(MongodbModel.prototype, {
  /**
   * Create model and return a promise
   *
   * @param     {Object}    body
   * @return    {promise}
   */
  create(body) {
    return new Promise((resolve, reject) => {
      this.collection.insert(body, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.ops[0]);
        }
      });
    });
  },

  /**
   * Read a single model
   *
   * @param     {Mixed}    id
   * @return    {promise}
   */
  read(id) {
    if (typeof id !== 'string') {
      return Promise.reject(new Error('id is not a string'));
    }
    return new Promise((resolve, reject) => {
      this.collection.findOne(
        {
          _id: id,
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  },

  /**
   * Return all records in collection
   * @return {Promise}
   */
  readAll() {
    return new Promise((resolve, reject) => {
      this.collection.find({}, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.toArray());
        }
      });
    });
  },

  /**
   * Do a custom query
   *
   * @param     {Mixed}    id
   * @return    {promise}
   */
  find(query) {
    if (typeof query !== 'object') {
      return Promise.reject(new Error('query is not an object'));
    }
    return new Promise((resolve, reject) => {
      this.collection.find(query, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result.toArray());
        }
      });
    });
  },

  /**
   * Update/Patch a single model
   *
   * @param     {Object}    body
   * @return    {promise}
   */
  update(body, id) {
    if (!id) {
      // eslint-disable-next-line no-underscore-dangle
      id = body._id;
    }
    // eslint-disable-next-line no-underscore-dangle
    delete body._id; // Can't update the ID
    return new Promise((resolve, reject) => {
      this.collection.updateOne(
        {
          _id: id,
        },
        body,
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  },

  /**
   * Delete a model
   *
   * @param     {Number}    id
   * @return    {promise}
   */
  del(id) {
    return new Promise((resolve, reject) => {
      this.collection.remove(
        {
          _id: id,
        },
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  },
});

/**
 * Helper function to create new models
 * @param     {Object}    props
 * @return    {Object}
 */
module.exports.extend = function extend(props) {
  props.Database = props.Database || this.Database;
  return new MongodbModel(props);
};
