const express = require('express');
const { bindCallback, merge, of, pipe, throwError, Subject } = require('rxjs');
const { flatMap, map, mapTo, catchError, pluck, repeat, skip, tap } = require('rxjs/operators');
const request = require('request');

module.exports = (app) => {
  var server;
  app = app || express();
  app.use(express.json({ type: '*/*' }))

  const start = (port = 3000, message) => {
    const subject = new Subject();
    server = app.listen(port, () => {
      if (message !== null) {
        console.log(message || `Listening on port ${port}.`);
      }
      subject.next(server);
      subject.complete();
    });
    return subject;
  }

  const onErrorMap = (pattern, project) =>
    catchError(err =>
      err.statusCode && err.statusCode.toString().match(pattern) ?
        project(err) : throwError(err)
    )

  return {
    on: (method, url) => (...pipeline) => {
      const subject = new Subject();
      app[method.toLowerCase()](url, (request) =>
        subject.next(request));
      return subject.pipe(...pipeline, repeat());
    },
    extract: {
      body: prop => prop ? pipe(pluck('body'), pluck(prop)) : pluck('body'),
      url: () => pluck('url'),
      params: param => param ? pipe(pluck('params'), pluck(param)) : pluck('params')
    },
    request: {
      perform: (method, url, opts) =>
        source =>
          source.pipe(
            map(options => Object.assign({ json: true }, options, opts, { method, url})),
            flatMap(options => bindCallback(request)(options)),
            flatMap(response =>
              !Array.isArray(response) ? throwError(response) :
                response[1].statusCode > 399 ?
                  throwError({
                    uri: response[1].request.uri.href,
                    statusCode: response[1].statusCode
                  }) :
                  response[0] ? throwError(response[0]) :
                    of({ message: response[1], body: response[2] }))),
      onErrorMap,
      onError: (pattern, body) =>
        onErrorMap(pattern, () => of(body))
    },
    reply: (project = (x => of(x))) =>
      source =>
        source.pipe(
          flatMap(request =>
            of(request).pipe(
              flatMap(project),
              tap(response =>
                request.res
                  .status(response.status || 200)
                  .json(response.body)),
              catchError(err =>
                (request.res.status(500).send(),
                  throwError(err))),
              mapTo(request)))),
    response: {
      empty: (status) => () => of({ status }),
      body: (constant) =>
        constant ? () => of({ body: constant }) :
          body => of({ body })
    },
    serve: (port) => (...pipeline) =>
      merge(start(port).pipe(skip(1)), ...pipeline).pipe(
        catchError((err, caught) => (console.error(err), caught))
      ),
    start,
    stop : () => server.close()
  }
};
