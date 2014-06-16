/*!
 * chain
 *
 * @license MIT
 */

/*jshint node:true*/

'use strict';

var options = {
  nextTick: false // do not set process.nextTick
};

/**
 * Decide wether to use process.nextTick to trigger event loop or use
 * direct "next" function call based on `options.nextTick`.
 * Behaviour can be controlled via:
 *
 *     chain.nextTick(true|false);
 *
 * @param {Function} next
 * @param {Error} err
 * @api private
 */
var nextTick = function(next, err) {
  if (options.nextTick) {
    return process.nextTick(function (){
      try {
        next(err);
      }
      catch(e) {
        next(e);
      }
    });
  }
  else {
    return next(err);
  }
};

/**
 * Chaining middlewares
 *
 * Array of functions using (req, res, next) as arguments; if first argument is a function then it is assumed that all arguments are middleware functions.
 *
 * of type `function (req, res, next)`
 *
 * @param {Array|Function} middlewares
 * @return {Function} middleware function
 * @api public
 */
var chain = function (middlewares) {

  if (middlewares === undefined) {
    return function(req, res, next) {
      next && next(); // jshint ignore:line
    };
  }
  // middlewares are passed as functions
  if (typeof middlewares === 'function') {
    middlewares = Array.prototype.slice.call(arguments, 0);
  }

  // the function required by the server
  return function (req, res, next) {
    var index = 0;

    // looping over all middleware functions defined by middlewares
    (function _next_(err){
      var
        arity,
        middleware = middlewares[index++]; // obtain the current middleware from the stack

      if (!middleware) {
        // we are at the end of the stack
        next && next(err); // jshint ignore:line
        return;
      }
      else {
        try {
          arity = middleware.length; // number of arguments function middleware requires
          // handle errors
          if (err) {
            // If the middleware function contains 4 arguments than this will act as an "error trap"
            if (arity === 4) {
              middleware(err, req, res, function (err) {
                nextTick(_next_, err);
              });
            }
            else {
              // otherwise check the next middleware
              _next_(err);
            }
          }
          else if (arity < 4) {
            // process non "error trap" middlewares
            middleware(req, res, function (err) {
              nextTick(_next_, err);
            });
          }
          else {
            // loop over "error traps" if no error `err` is set.
            _next_();
          }
        }
        catch(e) {
          _next_(e);
        }
      }
    })();

  };
};

/**
 * Change chain nextTick behaviour using process.nextTick globally
 *
 * @param {Boolean} nextTick
 * @api public
 */
chain.nextTick = function(nextTick) {
  options.nextTick = nextTick ? true : false;
};

module.exports = chain;
