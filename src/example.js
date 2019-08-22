const { of } = require('rxjs');
const { flatMap, map, pluck } = require('rxjs/operators');
const { extract, on, reply, request, response, serve } = require('./index')();

serve()(
  on('POST', '/')(
    reply(response.empty()),
    extract.body('message'),
    map(message => ({ uri: `http://localhost:3000/${message}` })),
    request.perform(),
    extract.body('message'),
    request.onError(/40.?/, 'We had problem'),
    map(message => `> ${message}`)),

  on('GET', '/hello')(
    reply(response.body({ message: "ciao" })),
    extract.url(),
    map(url => `GET ${url}`)),

  on('GET', '/hellox')(
    reply(response.empty(500)),
    extract.url(),
    map(url => `GET ${url} -> 500 Internal Server Error`)),

  on('POST', '/test')(
    reply(req => of(req).pipe(
      extract.body('message'),
      map(message => ({ uri: `http://localhost:3000/${message}` })),
      request.perform(),
      extract.body('message'),
      map(message => ({ message: `${message} you!` })),
      request.onErrorMap(404, res => of({ message: `We had problem with ${res.uri}` })),
      flatMap(response.body()))),
    extract.body(),
    pluck('message'))
)
  .subscribe(console.log)
