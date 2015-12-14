'use strict';

var assert = require('assert-plus');

function TrustedUser(client, token) {
  assert.object(client, 'client');
  assert.string(token, 'token');

  Object.defineProperties(this, {
    request: {
      value: function(uri, options, callback) {
        assert.object(options, 'options');
        options.jwt = token;
        return client.request(uri, options, callback);
      },
      enumerable: true,
      writable: true
    }
  });
}

module.exports = TrustedUser;
