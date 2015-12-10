'use strict';

var errors = require('@leisurelink/http-equiv-errors');
var util = require('util');

function formatUnexpectedResponseErrorMessage(res, body) {
  var message = "The server sent an unexptected response";
  if (res && res.statusCode) {
    message = message.concat(': ', res.statusCode);
  }
  if (body && body.cause) {
    if (typeof(body.cause) === 'string') {
      message = message.concat('; ', body.cause);
    } else if (typeof(body.cause) === 'object') {
      message = message.concat('; ', util.inspect(body.cause, false, 9));
    }
  }
  return message + '.';
}

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
    if (typeof(expected[code]) === 'function') {
      expected[code](res, body);
      return;
    }
    var msg = formatUnexpectedResponseErrorMessage(res, body);
    var unexpected = new errors.UnexpectedResponseError(msg, errors.reviveRemoteError(body));
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
