module.exports = (function() {

  'use strict';

  var fs = require('fs');
  var path = require('path');

  var $ = {};

  var files = fs.readdirSync(__dirname);

  var i = -1,
    f, n, len = files.length;

  while (++i < len) {
    n = files[i];
    if (n !== 'index.js' && path.extname(n) === '.js') {
      f = path.join(__dirname, n);
      $[path.basename(n, '.js')] = require(f);
    }
  }

  return $;
})();
