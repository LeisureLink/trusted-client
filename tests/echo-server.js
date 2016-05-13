import { createServer } from 'http';
import { parseRequest as parseSignature } from '@leisurelink/http-signature';
import trusted from '../src';
import Logger from '@leisurelink/skinny-loggins';

if (process.env.LOG_TESTS || process.env.LOG_LEVEL) {
  Logger({
    level: process.env.LOG_LEVEL || 'debug',
    transports: {
      Console: {
        level: process.env.LOG_LEVEL || 'debug'
      }
    }
  }).consumeFrom(trusted);
}

export const defaultResponse = { hi: 'there' };

export const port = process.env.TEST_PORT || 8888;
export const uri = `http://localhost:${port}`;

const handler = (req, res) => { //eslint-disable-line
  try {
    res.setHeader('x-requested-url', req.url);
    res.setHeader('Content-Type', 'application/json');

    let correlationId = req.headers['x-correlation-id'];
    if (correlationId) {
      res.setHeader('x-received-correlation-id', correlationId);
    }

    try {
      res.setHeader('x-parsed-signature', JSON.stringify(parseSignature(req)));
    }
    catch (e) {
    }

    if (req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(defaultResponse));
      return;
    }
    if (req.method === 'DELETE') {
      res.writeHead(200);
      res.end();
      return;
    }
    res.writeHead(200);
    req.on('data', (message) => {
      res.write(message);
    });
    req.on('end', () => {
      res.end();
    });
  } catch (err) {
    console.log(err);
    res.end(err.toString());
  }
};

export default () => {
  let server = createServer(handler);
  server.listen(port);
  return server;
};
