import assert from 'assert-plus';
import uriTemplate from 'uri-template';
import _ from 'lodash';

const createUriTemplates = (base, routeDefinitions) => {
  let routes = {};
  _.forEach(routeDefinitions, (value, key) => {
    routes[key] = uriTemplate.parse(base + value);
  });
  return routes;
};

export default function RoutedClient(baseUrl, trustedClient, routeDefinitions){
  assert.string(baseUrl, 'baseUrl');
  assert.object(trustedClient, 'trustedClient');
  assert.func(trustedClient.request, 'trustedClient.request');
  assert.object(routeDefinitions, 'routeDefinitions');

  let base = baseUrl.replace(/\/$/, '');
  let routes = createUriTemplates(base, routeDefinitions);

  const getUrl = (routeName, params) => {
    return routes[routeName].expand(params);
  };
  const getOptions = (method, options) => {
    return _.defaults({}, { method: method.toUpperCase() }, options);
  };
  const requestWithoutBody = (method, routeName, params, options, callback) => {
    assert.string(method, 'method');
    assert.string(routeName, 'routeName');
    assert.optionalObject(params, 'params');
    assert.optionalObject(options, 'options');
    assert.optionalFunc(callback, 'callback');

    return trustedClient.request(getUrl(routeName, params), getOptions(method, options), callback);
  };
  const requestWithBody = (method, routeName, params, body, options, callback) => {
    assert.string(method, 'method');
    assert.string(routeName, 'routeName');
    assert.object(params, 'params');
    assert.object(body, 'body');
    assert.optionalObject(options, 'options');
    assert.optionalFunc(callback, 'callback');

    let requestOptions = getOptions(method, options);
    requestOptions.json = body;
    return trustedClient.request(getUrl(routeName, params), requestOptions, callback);
  };

  const module = {
    /**
     * HTTP GET
     * @protected
     * @param {string} route - the route name
     * @param {object} [params] - the url parameters
     * @param {object|function} [options]
     * @param {function} [callback]
     */
    get: (route, params, options, callback) => {
      return requestWithoutBody('GET', route, params, options, callback);
    },

    /**
     * HTTP POST
     * @protected
     * @param {string} route
     * @param {object|array} body
     * @param {object} [options]
     * @param {object} [options.params]
     * @param {function} callback
     */
    post: (route, params, body, options, callback) => {
      return requestWithBody('POST', route, params, body, options, callback);
    },

    /**
     * HTTP PUT
     * @protected
     * @param {string} route
     * @param {object|array} body
     * @param {object} [options]
     * @param {object} [options.params]
     * @param {function} callback
     */
    put: (route, params, body, options, callback) => {
      return requestWithBody('PUT', route, params, body, options, callback);
    },

    /**
     * HTTP PATCH
     * @protected
     * @param {string} route
     * @param {object|array} body
     * @param {object} [options]
     * @param {object} [options.params]
     * @param {function} callback
     */
    patch: (route, params, body, options, callback) => {
      return requestWithBody('PATCH', route, params, body, options, callback);
    },

    /**
     * HTTP DELETE
     * @protected
     * @param {string} route
     * @param {object} params
     * @param {object} [options]
     * @param {function} callback
     */
    delete: function(route, params, options, callback) {
      return requestWithoutBody('DELETE', route, params, options, callback);
    },
    requestWithBody,
    requestWithoutBody,
    on: trustedClient.on,
    once: trustedClient.once,
    getUrl: getUrl
  };

  return module;
};

