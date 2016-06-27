import RoutedClient from './routed-client';
import TrustedClient from './trusted-client';
import logger from './logger';

export default {
  TrustedClient,
  RoutedClient,
  on: logger.on
};
