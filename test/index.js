const { of } = require('rxjs');
const { flatMap, map, pluck } = require('rxjs/operators');
const assert = require('assert');
const express = require('express');
const request = require('request');

describe('Server', () =>
  describe('#start()', () =>
    it('should start listening', done =>
      require('../src/index')(express())
        .start(7777).subscribe( server =>
          request
            .get('http://localhost:7777/', (err, res) => {
              server.close();
              assert.equal(res.statusCode, 404);
              done();
            })
        )
    )
  )
)
