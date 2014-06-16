/*!
 * mocha test suite for chain
 *
 * @license MIT
 */

/*jshint node:true*/
/*globals describe, it*/

'use strict';

var
  assert = require('assert'),
  chain = require('../');

//~ chain.nextTick(true); // enable process.nextTick

/**
 * generic middleware for our tests
 * @param {Object} options
 * @property {Object} options.name : push `options.name` to `res.name`
 * @property {Object} options.res : add `options.res` to `res`
 */
var middleware = function(options) {
  options = options || {};

  return function(req, res, next) {
    var i;

    if (options.name) {
      if (!res.name) {
        res.name = [];
      }
      res.name.push(options.name);
    }
    if (options.res) {
      for (i in options.res) {
        res[i] = options.res[i];
      }
    }
    if (options.error) {
      next && next(new Error(options.error)); // jshint ignore:line
    }
    else {
      next && next(); // jshint ignore:line
    }
  };
};

/**
 * generic error trap middleware
 * @param {Boolean} bubble : bubble error event
 */
var middlewareError = function(bubble) {
  return function (err, req, res, next) {
    if (! res.error) {
      res.error = [];
    }
    res.error.push(err.message);
    if (bubble) {
      next && next(bubble); // jshint ignore:line
    }
    else {
      next && next(); // jshint ignore:line
    }
  };
};

describe('chain', function (){

  it('- Array with one middleware', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } })
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1 });
      done();
    });
  });

  it('- Array of middlewares', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } }),
      middleware({ res: { two: 2 } }),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2 });
      done();
    });
  });

  it('- One middleware function', function (done){
    var
      req = {},
      res = { test: 1 };

    chain(
      middleware({ res: { one: 1 } })
    )(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1 });
      done();
    });
  });

  it('- Two middleware functions', function (done){
    var
      req = {},
      res = { test: 1 };

    chain(
      middleware({ res: { one: 1 } }),
      middleware({ res: { two: 2 } })
    )(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2 });
      done();
    });
  });

  it('- Chain of chains', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } }),
      middleware({ res: { two: 2 } }),
      chain([
        middleware({ res: { three: 3 } }),
        middleware({ res: { four: 4 } }),
        chain([
          middleware({ res: { five: 5 } }),
          middleware({ res: { six: 6 } }),
        ]),
      ]),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test:1, one:1, two:2, three:3, four:4, five:5, six:6});
      done();
    });
  });

  it('- empty chain', function (done){
    var
      req = {},
      res = { test: 1 };
    chain([])(req, res, function (err) {
      assert.deepEqual(res, { test: 1 });
      done();
    });
  });

  it('- building new chained middleware', function (done){
    var
      req = {},
      res = { test: 1 };

    // new middleware
    var newMw = function (req, res, next) {
      chain([
        middleware({ res: { one: 1 } }),
        middleware({ res: { two: 2 } })
      ])(req, res, function(err){
        next(err);
      });
    };

    chain([ newMw ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2 });
      done();
    });
  });

  it('- middleware throws exception and shall be caughth by error trap', function(done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } }),
      function(req, res, next) {
        throw new Error('boom');
        next && next(); // jshint ignore:line
      },
      middleware({ res: { two: 2 } }),
      middlewareError()
    ])(req, res, function(err){
      assert.deepEqual(res, { test:1, one:1, error:["boom"] });
      done();
    });
  });

});

describe('chain with error trap', function (){

  it('- no error but using trap', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } }),
      middleware({ res: { two: 2 } }),
      middlewareError(),
      middleware({ res: { three: 3 } }),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2, three: 3 });
      done();
    });
  });

  it('- error in middleware 1 jumps over middleware 2', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ error: 'err1' , res: { one: 1 } }),
      middleware({ res: { two: 2 } }),
      middleware({ res: { three: 3 } }),
      middlewareError(),
      middleware({ res: { four: 4 } }),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, error: ['err1'], four: 4 });
      done();
    });
  });

  it('- error in middleware 2', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ res: { one: 1 } }),
      middleware({ error: 'err1' , res: { two: 2 } }),
      middlewareError(),
      middleware({ res: { three: 3 } }),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2, error: ['err1'], three: 3 });
      done();
    });
  });

  it('- error in middleware 1 and 3', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      middleware({ error: 'err1', res: { one: 1 } }),
      middleware({ res: { two: 2 } }),
      middlewareError(),
      middleware({ error: 'err3', res: { three: 3 } }),
      middleware({ res: { four: 4 } }),
      middlewareError(),
    ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, error: ["err1","err3"], three: 3 });
      done();
    });
  });

  it('- error in middleware 2 and 4', function (done){
    var
      req = {},
      res = {};

    chain([
      middleware({ res: { one: 1 } }),
      middleware({ error: 'err2', res: { two: 2 } }),
      middlewareError(),
      middleware({ res: { three: 3 } }),
      middleware({ error: 'err4', res: { four: 4 } }),
      middlewareError(),
    ])(req, res, function (err) {
      assert.deepEqual(res, { one: 1, two: 2, error: ["err2","err4"], three: 3, four: 4 });
      done();
    });
  });

  it('- building new chained middleware', function (done){
    var
      req = {},
      res = { test: 1 };

    // new middleware
    var newMw = function (req, res, next) {
      chain([
        middleware({ res: { one: 1 } }),
        middleware({ res: { two: 2 } })
      ])(req, res, function(err){
        next(err);
      });
    };

    chain([ newMw ])(req, res, function (err) {
      assert.deepEqual(res, { test: 1, one: 1, two: 2 });
      done();
    });
  });

  it('- building new chained middleware, error bubbles up', function (done){
    var
      req = {},
      res = { test: 1 };

    // new middleware
    var newMw = function (req, res, next) {
      chain([
        middleware({ res: { one: 1 } }),
        middleware({ error: 'bubbling error', res: { two: 2 } }),
      ])(req, res, function(err){
        next(err);
      });
    };

    chain([ newMw ])(req, res, function (err) {
      assert.equal(err.message, 'bubbling error');
      assert.deepEqual(res, { test:1, one:1, two:2 });
      done();
    });
  });

  it('- middleware causes exception', function (done){
    var
      req = {},
      res = { test: 1 };

    chain([
      function (req, res, next) {
        throw new Error('throwing errors is fun');
        next && next(); // jshint ignore:line
      },
      function (err, req, res, next) {
        res.error = err.message;
        next && next(new Error('another error')); // jshint ignore:line
      }
    ])(req, res, function (err) {
      assert.equal(err.message, 'another error');
      assert.deepEqual(res, { test: 1, error: "throwing errors is fun" });
      done();
    });
  });
});
