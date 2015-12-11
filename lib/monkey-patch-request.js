'use strict'

var request = require('request');
var httpSignature = require('@leisurelink/http-signature');

request.Request.prototype.httpSignature = function (opts) {
  var self = this
  httpSignature.signRequest({
    getHeader: function(header) {
      return self.getHeader(header, self.headers)
    },
    setHeader: function(header, value) {
      self.setHeader(header, value)
    },
    method: self.method,
    path: self.path
  }, opts);

  return self
}

module.exports = request;
