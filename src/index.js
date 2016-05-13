import RoutedClient from './routed-client';
import success from './success';
import TrustedClient from './trusted-client';
import TrustedUser from './trusted-user';
import logger from './logger';

export default {
  get success() {
    logger.warn('Deprecated - success is in svcutils');
    return success;
  },
  TrustedClient,
  TrustedUser,
  RoutedClient,
  AbstractClient: function(baseUrl, trustedClient, routeDefinitions) {
    logger.warn('Deprecated - AbstractClient has been renamed to RoutedClient');
    let module = RoutedClient(baseUrl, trustedClient, routeDefinitions);
    return module;
  }, // deprecated
  on: logger.on
};
