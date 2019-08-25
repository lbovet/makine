const { of, throwError } = require('rxjs');
const { tap } = require('rxjs/operators');
const util = require('util');
const assert = require('assert');
const express = require('express');
const request = require('request');

const makine = require('../src/index');
const app = express();
const engine = makine(app);
const { on, reply } = engine;

const baseUrl = 'http://localhost:7777';
const get = (path, opts) =>
  util.promisify(request.get)(`${baseUrl}${path}`, Object.assign({}, { json: true }, opts));
var i=0;
const id = () => '/' + Math.floor(i++ / 2)

describe('Server', () => {
  describe('Base', () => {
    describe('.start(), .stop()', () => {
      it('starts and stops listening', done => {
        engine.start(7777, null).subscribe(() => {
            get('/nowhere', { timeout: 50 })
              .then(({ statusCode }) => {
                engine.stop();
                assert.equal(statusCode, 404);
              })
              .then(() => get('/nowhere', { timeout: 50 }))
              .catch(({ code }) => assert(code == 'ETIMEDOUT' || code == 'ECONNREFUSED'))
              .finally(done)
        })
      })
    })
  }),
  describe('Request Handling', () => {
    beforeEach(done => engine.start(7777, null).subscribe(() => done()))
    afterEach(() => engine.stop())
    describe('.on()', () => {
      it('receives a request', done => {
        on('GET', id())(tap(() => done())).subscribe();
        get(id(), { timeout: 50 }).then(null,()=>{})
      })        
    })
    describe('.reply()', () => {
      it('can send a status code only', () => {
        on('GET', id())(reply(() => of({
          status: 206
        }))).subscribe();
        return get(id()).then( (res) => {
          assert.equal(res.statusCode, 206);
          assert.equal(res.body, undefined);
        });
      }),
      it('can send a body only', () => {
        on('GET', id())(reply(() => of({
          body: { foo: 1}
        }))).subscribe();
        return get(id()).then((res) => {
          assert.equal(res.statusCode, 200);
          assert.equal(res.body.foo, 1);
        });
      }),
      it('can send both', () => {
        on('GET', id())(reply(() => of({
          status: 206,
          body: { foo: 1 }
        }))).subscribe();
        return get(id()).then(res => {
          assert.equal(res.statusCode, 206);
          assert.equal(res.body.foo, 1);
        });
      }),
      it('sends a 500 status on error', () => {
        on('GET', id())(reply(() => throwError("ouch"))).subscribe(null, ()=>{});
        return get(id()).then(res => {
          assert.equal(res.statusCode, 500);
        })
      }),
      it('pipes the request inside and outside', () => {
        on('GET', id())(reply(req => {
          assert(req.url);
          return of({});
        }))
        .subscribe(req => 
          assert(req.url)
        );
        return get(id());
      })
    }),
    describe('.request.perform()', () => {
      it('performs a request', done => {
        on('GET', id())(reply()).subscribe(() => done());
        engine.request.perform('GET', baseUrl+id())(of({})).subscribe()
      }),
      it('fails on error status', done => {
        on('GET', id())(reply(() => of({status: 418}))).subscribe();
        var uri = baseUrl + id();
        engine.request.perform('GET', uri)(of({}))
          .subscribe(null, err => {
            assert.equal(err.uri, uri);
            assert.equal(err.statusCode, 418);
            done()
          })
      })
    })
  }),
  describe('Helpers', () => {
    describe('.request.onErrorMap()', () => {
      it('traps matching errors', done => {
        throwError({statusCode: 418})
          .pipe(engine.request.onErrorMap(/41.?/, () => of(1)))
          .subscribe(()=>done())
      }),
      it('ignore not matching errors', done => {
        throwError({ statusCode: 418 })
          .pipe(engine.request.onErrorMap(/42.?/, () => of(1)))
          .subscribe(null, () => done())
      })
    }),
    describe('.extract.body()', () => {
      it('extracts the full body', () => {
        of({body: { foo: 'bar'}}).pipe(engine.extract.body())
        .subscribe( value =>
          assert.equal(value.foo, 'bar'))
      }),
      it('extracts a body attribute', () => {
        of({ body: { foo: 'bar' } }).pipe(engine.extract.body('foo'))
          .subscribe(value =>
            assert.equal(value, 'bar'))
      })
    }),
    describe('.extract.params()', () => {
      it('extracts all params', () => {
        of({ params: { foo: 'bar' } }).pipe(engine.extract.params())
          .subscribe(value =>
            assert.equal(value.foo, 'bar'))
      }),
      it('extracts on attribute', () => {
        of({ params: { foo: 'bar' } }).pipe(engine.extract.params('foo'))
          .subscribe(value =>
            assert.equal(value, 'bar'))
      })      
    })
  })
})
