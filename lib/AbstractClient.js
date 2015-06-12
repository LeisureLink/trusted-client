'use strict';

var assert = require('assert-plus');
var uriTemplate = require('uri-template');

/**
 * @private
 */
var internals = {};

/**
 * Converts a route definition into a uri template
 * @private
 * @param {string} host
 * @param {array<object>} routeDefinition
 */
internals.convertsToUriTemplate = function(host, routeDefinition) {
  host = host || '';
  return uriTemplate.parse(host + routeDefinition);
};

/**
 * Builds Uri with query string params
 * @public
 * @param {UriTemplate} template
 * @param {object} [params]
 * @returns {string}
 */
internals.buildUriWithParams = function(template, params) {
  return template.expand(params);
};

/**
 * Format the host by removing the trailing slash
 * @private
 * @param {string} host
 */
internals.formatHost = function(host) {
  assert.string(host);
  return host.replace(/\/$/, '');
};

/**
 * Convert from route recipe to URI Template
 * @public
 * @param {string} host
 * @param {object} routeDefinitions
 * @returns {object}
 */
internals.toUriTemplates = function(host, routeDefinitions) {
  assert.string(host, 'host');
  assert.object(routeDefinitions, 'routeTemplates');

  var routes = {};
  host = internals.formatHost(host);
  Object.keys(routeDefinitions).forEach(function(key) {
    routes[key] = internals.convertsToUriTemplate(host, routeDefinitions[key]);
  });
  return routes;
};

/**
 * @public
 *
 * @type {Function|*}
 */
internals.buildUri = internals.buildUriWithParams;


/**
 * Abstract Client
 * @description A helper class for client implementations
 * @constructor
 * @abstract
 * @public
 * @param {string} host
 * @param {TrustedClient} client
 * @param {object} routeDefinitions
 */
function AbstractClient(host, client, routeDefinitions) {
  assert.string(host, 'host');
  assert.object(client, 'client');
  assert.func(client.request, 'request');
  assert.object(routeDefinitions, 'routeDefinitions');

  this.host = host;
  this.client = client;
  this.routeTemplates = internals.toUriTemplates(this.host, routeDefinitions);
}

/**
 * HTTP GET
 * @protected
 * @param {string} route - the route name
 * @param {object} [params] - the url parameters
 * @param {object|function} [options]
 * @param {function} [callback]
 */
AbstractClient.prototype.get = function(route, params, options, callback) {
  this._requestWithoutBody(route, 'GET', params, options, callback);
};

/**
 * HTTP POST
 * @protected
 * @param {string} route
 * @param {object|array} body
 * @param {object} [options]
 * @param {object} [options.params]
 * @param {function} callback
 */
AbstractClient.prototype.post = function(route, body, options, callback) {
  this._requestWithBody(route, 'POST', body, options, callback);
};

/**
 * HTTP PUT
 * @protected
 * @param {string} route
 * @param {object|array} body
 * @param {object} [options]
 * @param {object} [options.params]
 * @param {function} callback
 */
AbstractClient.prototype.put = function(route, body, options, callback) {
  this._requestWithBody(route, 'PUT', body, options, callback);
};

/**
 * HTTP DELETE
 * @protected
 * @param {string} route
 * @param {object} params
 * @param {object} [options]
 * @param {function} callback
 */
AbstractClient.prototype.delete = function(route, params, options, callback) {
  this._requestWithoutBody(route, 'DELETE', params, options, callback);
};


/**
 * Builds the route based on the route template
 * @protected
 * @param {string} name - the routes name
 * @param {object} [params] - parameters for the route template
 * @returns {string}
 */
AbstractClient.prototype.getRoute = function(name, params) {
  params = params || {};
  var routeTemplate = this.routeTemplates[name];
  return internals.buildUri(routeTemplate, params);
};

/**
 * Http request without body
 * @private
 * @param {string} route
 * @param {string} verb - GET/DELETE
 * @param {object} [params] - the url parameters
 * @param {object} [options] - request optoins
 * @param callback
 */
AbstractClient.prototype._requestWithoutBody = function(route, verb, params, options, callback) {
  assert.string(route, 'route name');
  assert.string(verb, 'http verb');

  params = params || {};

  if (typeof(params) === 'function') {
    callback = params;
    options = {};
    params = {};
  }

  if (typeof(options) === 'function') {
    callback = options;
    options = {};
  }

  var uri = this.getRoute(route, params);
  assert.string(uri, 'uri');
  this.client.request(uri, { method: verb.toUpperCase() }, callback);
};

/**
 * Request with a body
 * @param {string} route
 * @param {string} verb
 * @param {object} body
 * @param {object} [options]
 * @param {function} callback
 * @private
 */
AbstractClient.prototype._requestWithBody = function(route, verb, body, options, callback) {
  assert.string(route, 'route name');
  assert.string(verb, 'http verb');
  body = body || {};

  if (typeof(options) === 'function') {
    callback = options;
    options = {};
  }

  var uri = this.getRoute(route, options.params);
  assert.string(uri, 'uri');
  this.client.request(uri, { method: verb, json: body }, callback);
};

module.exports = AbstractClient;