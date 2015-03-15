'use strict';

var errors = require('http-equiv-errors');

module.exports = function success(expected) {
  var behaviors = {};
  var fn = function(err, res, body) {
    if (err) {
      if (behaviors.onErr) {
        behaviors.onErr(err);
        return;
      }
      throw err;
    }
    var code = res.statusCode;
    if (typeof (expected[code]) === 'function') {
      expected[code](res, body);
      return;
    }
    var unexpected = new errors.UnexpectedResponseError(res, errors.reviveRemoteError(body));
    var otherwise = behaviors.onUnexpected || behaviors.onErr;
    if (otherwise) {
      otherwise(unexpected);
      return;
    }
    throw unexpected;
  };
  fn.unexpected = function(cb) {
    behaviors.onUnexpected = cb;
    return fn;
  };
  fn.otherwise = function(cb) {
    behaviors.onErr = cb;
    return fn;
  };
  fn.error = fn.otherwise;
  return fn;
};
