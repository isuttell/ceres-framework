/**
 * Deeply merge objects together
 * @param    {Object[]} args  Any number of arguments
 * @return   {Object}
 */
module.exports = function merge(...args) {
  let result = args.shift();
  if (typeof result !== 'object') {
    // Ensure result is an object we can assign to
    result = {};
  }
  args.forEach(src => {
    // Ignore if not an object
    if (typeof src !== 'object') {
      return;
    }
    Object.keys(src).forEach(key => {
      if (typeof src[key] === 'object' && src[key] instanceof Array !== true) {
        // Recursion
        result[key] = merge({}, result[key], src[key]);
      } else if (typeof src[key] !== 'undefined') {
        // Copy any value that is defined, ignore undefined
        result[key] = src[key];
      }
    });
  });
  return result;
};
