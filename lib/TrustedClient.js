'use strict';

var util = require('util');
var extend = require('deep-extend');
var assert = require('assert-plus');
var request = require('request');
var errors = require('@leisurelink/http-equiv-errors');
var events = require('events');
var url = require('url');
var domainCorrelation = require('@leisurelink/domain-correlation');

var TrustedUser = require('./TrustedUser');

var format = util.format;

var SignedHeaders = {
  PATCH: ['host', 'date', 'request-line', 'content-length'],
  POST: ['host', 'date', 'request-line', 'content-length'],
  PUT: ['host', 'date', 'request-line', 'content-length'],
  GET: ['host', 'date', 'request-line'],
  DELETE: ['host', 'date', 'request-line']
};

function isJson(headers) {
  return headers['content-type'] &&
      headers['content-type'].indexOf('application/json') === 0;
}

function forceJson(headers, body) {
  if (body && typeof (body) === 'string' &&
      isJson(headers)) {
    return JSON.parse(body);
  }
  return body;
}

function setRequestHeader(options, header, value) {
  assert.object(options, 'options');
  assert.string(header, 'header');
  options.headers = options.headers || {};
  options.headers[header] = value;
}

/**
 * Trusted Client
 * @public
 * @constructor
 * @param {object} options
 * @param {string} options.keyId
 * @param {object} options.key
 * @type {object}
 *
 * @property {function} log
 *  @param kind
 *  @param message
 */
function TrustedClient(options) {
  assert.object(options, 'options');
  assert.string(options.keyId, 'options.keyId');
  assert.object(options.key, 'options.key');
  assert.optionalObject(options.log, 'options.log');

  events.EventEmitter.call(this);

  var _signedHeaders = options.signedHeaders || SignedHeaders;
  var _signature = {
    keyId: options.keyId,
    key: options.key
  };

  Object.defineProperties(this, {
    _log: {
      value: options.log,
      writable: true
    },
    request: {
      value: function(uri, options, callback) {
        assert.string(uri, 'uri');
        assert.object(options, 'options');
        assert.string(options.method, 'options.method');

        options.uri = uri;

        var correlationId = domainCorrelation.getId();
        if (correlationId) {
          setRequestHeader(options, 'X-Correlation-Id', correlationId);
        }

        if (!options.headers || !options.headers.accept) {
          setRequestHeader(options, 'accept', 'application/json, text/plain;q=0.9, text/html;q=0.8');
        }

        // Ensure the request bears an http signature; replaces existing
        // options.httpSignature if the caller specified one.
        var sig = {
          keyId: _signature.keyId,
          key: _signature.key,
          headers: _signedHeaders[options.method]
        };
        if (options.json) {
          options.body = JSON.stringify(options.json);
          delete options.json;
          setRequestHeader(options, 'content-type', 'application/json');
          setRequestHeader(options, 'content-length', Buffer.byteLength(options.body));
        }
        if (options.jwt) {
          sig.jwt = options.jwt;
        }
        options = extend({
          httpSignature: sig
        }, options);

        if (options.direct) {
          return request(options);
        }

        return request(options,
            this._metrics(uri, options, callback)
        );
      },
      enumerable: true
    }
  });
}
util.inherits(TrustedClient, events.EventEmitter);


Object.defineProperties(TrustedClient.prototype, {
  _metrics: {
    value: function(uri, options, callback) {
      var self = this;
      this.log('debug', format('%s %s', options.method, uri));
      var hrstart = process.hrtime();
      return function(err, res, body) {
        var hrend = process.hrtime(hrstart);
        var evt = {
          hrtime: hrend,
          timing: format("%ds %dms", hrend[0], hrend[1] / 1000000),
          request: {
            method: options.method,
            uri: uri
          },
          response: {}
        };
        if (res) {
          evt.response.statusCode = res.statusCode;
          var obj = forceJson(res.headers, body);
          if (obj) {
            body = obj;
          }
        }
        // if the response is an error and json, revive the error to its object type...
        if (typeof (body) === 'object' && res.statusCode > 299 &&
          body.statusCode && res.statusCode == body.statusCode) {
            body = errors.reviveRemoteError(body);
        }
        // overwrite the corrected body...
        evt.response.body = body;
        if (err) {
          if (err.code === 'ECONNREFUSED') {
            err = new errors.ServiceUnavailableError(
              format('Could not connect to service: %s.', uri),
                err);
          }
          evt.response.error = err;
          self.emit('time', evt);
          self.log('debug', evt);
          return callback(err);
        }
        self.emit('time', evt);
        self.log('debug', evt);

        callback(null, res, body);
      };
    }
  },

  /**
   * @public
   * @param kind
   * @param message
   */
  log: {
    value: function log(kind, message) {
      // Since log providers differ (some format, others do not),
      // if there are arguements after message, we treat
      // message as a format statement (sprintf style) and feed
      // it through a formatter.
      if (this._log && this._log[kind]) {
        if (arguments.length === 2) {
          this._log[kind](message);
          return;
        }
        // format the arguments...
        var aa = Array.prototype.slice.call(arguments, 1);
        this._log[kind](format.apply(null, aa));
      }
    }
  },

  bindToken: {
    value: function bind(token) {
      assert.string(token, 'token');
      return new TrustedUser(this, token);
    },
    enumerable: true,
    writable: true
  }

});

module.exports = TrustedClient;
