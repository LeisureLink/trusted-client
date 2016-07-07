import { format } from 'util';
import extend from 'deep-extend';
import request from 'request';
import errors from '@leisurelink/http-equiv-errors';
import { trustedClient as trustedClientSchema, validate, requiredObject, requiredString, optionalFunc } from './schemas';
import { EventEmitter } from 'events';
import domainCorrelation from '@leisurelink/domain-correlation';
import defaultLogger from './logger';
import DeferredPromise from './deferred-promise';

export const DefaultSignedHeaders = {
  PATCH: ['host', 'date', '(request-target)', 'content-length'],
  POST: ['host', 'date', '(request-target)', 'content-length'],
  PUT: ['host', 'date', '(request-target)', 'content-length'],
  GET: ['host', 'date', '(request-target)'],
  DELETE: ['host', 'date', '(request-target)']
};

function isJson(headers) {
  return headers['content-type'] && headers['content-type'].indexOf('application/json') === 0;
}

function forceJson(headers, body) {
  if (body && typeof (body) === 'string' && isJson(headers)) {
    try{
      body = JSON.parse(body);
    } catch(err){
      body = undefined;
    }
  }
  return body;
}

function setRequestHeader(options, header, value) {
  validate(options, requiredObject('options'));
  validate(header, requiredString('header'));
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
  validate(options, trustedClientSchema);

  let keyId = options.keyId;
  let key = options.key;
  let signedHeaders = options.signedHeaders || DefaultSignedHeaders;
  let eventSink = new EventEmitter();
  const logger = options.log || defaultLogger;
  let boundUser = options.user;
  let boundOrigin = options.origin;

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

  const formatError = (err, res, body) => {
    if (res) {
      if (!err.statusCode) { // http-equiv-errors already sets this as a read-only property
        err.statusCode = res.statusCode;
      }
      err.body = body;
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
          return callback(formatError(error, res, body));
        }
        return deferred.reject(formatError(error, res, body));
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
    validate(uri, requiredString('uri'));
    validate(options, requiredObject('options'));
    validate(callback, optionalFunc('callback'));

    options.uri = uri;

    let correlationId = domainCorrelation.getId();
    if (correlationId) {
      setRequestHeader(options, 'X-Correlation-Id', correlationId);
    }

    if (!options.headers || !options.headers.accept) {
      setRequestHeader(options, 'accept', 'application/json, text/plain;q=0.9, text/html;q=0.8');
    }
    if (boundUser || options.user) {
      setRequestHeader(options, 'X-Authentic-User', boundUser || options.user);
      if (options.user) {
        delete options.user;
      }
    }
    if (boundOrigin || options.origin) {
      setRequestHeader(options, 'X-Authentic-Origin', boundOrigin || options.origin);
      if (options.origin) {
        delete options.origin;
      }
    }

    // Ensure the request bears an http signature; replaces existing
    // options.httpSignature if the caller specified one.
    const sig = {
      keyId: keyId,
      key: key,
      headers: signedHeaders[options.method]
    };
    if (options.json && options.json !== true) {
      options.body = JSON.stringify(options.json);
      delete options.json;
      setRequestHeader(options, 'content-type', 'application/json');
      setRequestHeader(options, 'content-length', Buffer.byteLength(options.body));
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

  const withUser = (token) => {
    validate(token, requiredString('token'));
    let opts = extend(options);
    opts.user = token;
    return TrustedClient(opts);
  };

  const withOrigin = (token) => {
    validate(token, requiredString('token'));
    let opts = extend(options);
    opts.origin = token;
    return TrustedClient(opts);
  };

  let module = {
    request: makeRequest,
    withOrigin,
    withUser,
    on: (event, handler) => {
      eventSink.on(event, handler);
    },
    once: (event, handler) => {
      eventSink.once(event, handler);
    }
  };

  return module;
};
