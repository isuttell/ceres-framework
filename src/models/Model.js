/** *****************************************************************************
 * Base Model
 ***************************************************************************** */

const path = require('path');

/**
 * Setup a consistent model system that interacts with an database
 * @param {Object} props
 */
function Model(Ceres, props) {
  // Import ORM
  let model;

  const type = props.type || Ceres.config.db.type;

  if (['bookshelf', 'rethinkdb', 'mongodb'].indexOf(type.toLowerCase()) > -1) {
    const filename = `${type.slice(0, 1).toUpperCase() + type.slice(1)}Model.js`;
    const orm = require(path.resolve(__dirname, './types', filename));
    model = orm.extend.call(Ceres, props);
  } else {
    throw new Error(`Unknown model type: ${type}`);
  }

  // Pull everything off and into this instance
  // eslint-disable-next-line
  for (let key in model) {
    this[key] = model[key];
  }

  // Allow some user initialization code
  if (typeof this.init === 'function') {
    this.init.call(this);
  }
}

/**
 * Helper function to create new models. Ensures the correct interface for
 * default rest controller
 *
 * @param     {Object}    props
 * @return    {Object}
 */
Model.extend = function extend(props) {
  return new Model(this, props);
};

module.exports = Model;
