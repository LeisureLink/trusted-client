import { format } from 'util';
import extend from 'deep-extend';
import assert from 'assert-plus';
import request from './monkey-patch-request';
import errors from '@leisurelink/http-equiv-errors';
import { EventEmitter } from 'events';
import domainCorrelation from '@leisurelink/domain-correlation';
import TrustedUser from './trusted-user';
import defaultLogger from './logger';
import DeferredPromise from './deferred-promise';

export const DefaultSignedHeaders = {
  PATCH: ['host', 'date', 'request-line', 'content-length'],
  POST: ['host', 'date', 'request-line', 'content-length'],
  PUT: ['host', 'date', 'request-line', 'content-length'],
  GET: ['host', 'date', 'request-line'],
  DELETE: ['host', 'date', 'request-line']
};

function isJson(headers) {
  return headers['content-type'] && headers['content-type'].indexOf('application/json') === 0;
}

function forceJson(headers, body) {
  if (body && typeof (body) === 'string' && isJson(headers)) {
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
export default function TrustedClient(options) {
  assert.object(options, 'options');
  assert.string(options.keyId, 'options.keyId');
  if (!Buffer.isBuffer(options.key)) {
    assert.string(options.key, 'options.key');
  }
  assert.optionalObject(options.log, 'options.log');

  let keyId = options.keyId;
  let key = options.key;
  let signedHeaders = options.signedHeaders || DefaultSignedHeaders;
  let eventSink = new EventEmitter();
  const logger = options.log || defaultLogger;

  const handleResponse = (deferred) => {
    return (err, res, body) => {
      if (err) {
        return deferred.reject(err);
      }
      return deferred.resolve({
        statusCode: res.statusCode,
        body: body,
        raw: res
      });
    };
  };

  const formatError = (err, res) => {
    if (res) {
      err.statusCode = res.statusCode;
      err.body = res.body;
      err.raw = res;
    }
    return err;
  };

  const handleResponseWithMetrics = (uri, options, callback, deferred) => {
    const hrstart = process.hrtime();
    return (err, res, body) => { // eslint-disable-line
      const hrend = process.hrtime(hrstart);
      const evt = {
        hrtime: hrend,
        timing: format('%ds %dms', hrend[0], hrend[1] / 1000000),
        request: {
          method: options.method,
          uri: uri
        },
        response: {}
      };
      if (res) {
        evt.response.statusCode = res.statusCode;
        let obj = forceJson(res.headers, body);
        if (obj) {
          body = obj;
        }
      }

      let error = err;

      // if the response is an error and json, revive the error to its object type...
      if (typeof (body) === 'object' && res.statusCode > 299 && body.statusCode && res.statusCode == body.statusCode) { //eslint-disable-line
        error = errors.reviveRemoteError(body);
      }
      // overwrite the corrected body...
      evt.response.body = body;
      if (error) {
        if (error.code === 'ECONNREFUSED') {
          error = new errors.ServiceUnavailableError(format('Could not connect to service: %s.', uri), error);
        }
        evt.response.error = error;
        eventSink.emit('time', evt);
        logger.debug(evt);
        if (callback) {
          return callback(formatError(error));
        }
        return deferred.reject(formatError(err));
      }
      eventSink.emit('time', evt);
      logger.debug(evt);
      if (callback) {
        return callback(null, res, body);
      }
      return deferred.resolve({
        statusCode: res.statusCode,
        body: body,
        raw: res
      });
    };
  };

  const makeRequest = (uri, options, callback) => { // eslint-disable-line
    assert.string(uri, 'uri');
    assert.object(options, 'options');
    assert.string(options.method, 'options.method');

    options.uri = uri;

    let correlationId = domainCorrelation.getId();
    if (correlationId) {
      setRequestHeader(options, 'X-Correlation-Id', correlationId);
    }

    if (!options.headers || !options.headers.accept) {
      setRequestHeader(options, 'accept', 'application/json, text/plain;q=0.9, text/html;q=0.8');
    }

    // Ensure the request bears an http signature; replaces existing
    // options.httpSignature if the caller specified one.
    const sig = {
      keyId: keyId,
      key: key,
      headers: signedHeaders[options.method]
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

    let deferred = DeferredPromise();

    let handler;
    if (!options.direct) {
      handler = handleResponseWithMetrics(uri, options, callback, deferred);
    } else if (callback) {
      handler = callback;
    } else {
      handler = handleResponse(deferred);
    }

    request(options, handler);
    if (callback) {
      return undefined;
    }
    return deferred.promise;
  };

  const withToken = (token) => {
    assert.string(token, 'token');
    return TrustedUser(makeRequest, token);
  };

  let module = {
    request: makeRequest,
    bindToken: withToken,
    withToken,
    on: (event, handler) => {
      eventSink.on(event, handler);
    },
    once: (event, handler) => {
      eventSink.once(event, handler);
    }
  };

  // deprecated
  if (this) {
    logger.warn('Deprecated - trusted client should not be called with "new"');
  }

  return module;
};
