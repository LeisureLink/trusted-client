module.exports = (function() {
  'use strict';

  var UnexpectedResponseError = require('./UnexpectedResponseError');

  return function success(expected) {
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
      var unexpected = new UnexpectedResponseError(res, body);
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

})();
