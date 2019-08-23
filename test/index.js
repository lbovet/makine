const { of } = require('rxjs');
const { flatMap, map, pluck, tap } = require('rxjs/operators');
const util = require('util');
const assert = require('assert');
const express = require('express');
const request = require('request');
const makine = require('../src/index');
const baseUrl = 'http://localhost:7777';
const get = (path, opts) => util.promisify(request.get)(`${baseUrl}${path}`, opts);
const post = (path, opts) => util.promisify(request.post)(`${baseUrl}${path}`, opts);
const app = express();
const server = makine(app);
const onGetRoot = server.on('GET', '/');

describe('Server', () => {
  describe('Base', () =>
    describe('.start()', () =>
      it('should start and stop listening', done =>
        server
          .start(7777, null).subscribe(() =>
            get('/nowhere', { timeout: 50 })
              .then(({ statusCode }) => {
                server.stop();
                assert.equal(statusCode, 404);
              })
              .then(() => get('/', { timeout: 50 }))
              .catch(({ code }) => assert(code == 'ETIMEDOUT' || code == 'ECONNREFUSED'))
              .finally(done)
          )
      )
    )
  ),
    describe('Request Handling', () => {
      before(done => server.start(7777, null).subscribe(() => done()))
      after(() => server.stop())

      describe('.on()', () => {
        it('should receive a request', done => {
          onGetRoot(tap(() => done())).subscribe();
          get('/', { timeout: 50 }).then(null,()=>{})
        })        
      })
    })
})
