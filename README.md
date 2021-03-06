Connect-Chain
-------------

Connect-Chain is middleware that composes a new middleware from a chain of middlewares to be called in series.

An error passed to `next` or thrown in a middleware will short circuit the chain and be
passed to the next middleware in the connect middleware chain.

Usage
-------------

```
var express = require('express');
var chain = require('connect-chain');

var app = express();

app.use(chain(middleware1, middleware2));
```

```
var middleware = chain(middleware1, middleware2);
middleware(req, res, next);
```

Contributing
-------------

```
$ git clone https://github.com/goodeggs/connect-chain && cd connect-chain
$ npm install
$ npm test
```
