module.exports = (function() {
  'use strict';

  var util = require('util'),
    errors = require('error-base');

  function UnexpectedResponseError(response, body, message) {
    if (!message) {
      message = "The server sent an unexptected response";
      if (response && response.statusCode) {
        message = message.concat(': ', response.statusCode);
      }
      if (body && body.cause) {
        if (typeof(body.cause) === 'string') {
          message = message.concat('; ', body.cause);
        } else if (typeof(body.cause) === 'object') {
          message = message.concat('; ', util.inspect(body.cause, false, 9));
        }
      }
      message = message + '.';
    }
    errors.Error.call(this, message);
    this.name = this.constructor.name;
    this.message = message;
    this.response = response;
    this.body = body;
  }
  util.inherits(UnexpectedResponseError, errors.Error);

  return UnexpectedResponseError;
})();