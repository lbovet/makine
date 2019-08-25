# makine
<a href="https://travis-ci.org/lbovet/makine"><img src="https://travis-ci.org/lbovet/makine.svg?branch=master"></a>
<a href="https://www.npmjs.com/package/makine"><img src="https://img.shields.io/npm/v/makine"></a>

Basis for a reactive HTTP event-driven machine, typically useful for CI/CD triggers.

This allows for a quick implementation of logic in HTTP-based flows involving Web Hooks, REST APIs and scheduled monitoring.

## Installation

```
npm install makine --save
```

## Usage

### As a new engine

```javascript
const { extract on, reply, request, response, serve } = require('makine')();

serve()(
    on('GET', '/ok')(
        reply(response.empty())
    ),
    on('GET', '/hello')(
        reply(response.body({ message: "ciao" })
    )  
)
```

### In an existing Express application

```javascript
const app = ...
const { extract on, reply, request, response, serve } = require('makine')(app);

serve()(
    on('GET', '/ok')(
        reply(response.empty())
    ),
    on('GET', '/hello')(
        reply(response.body({ message: "ciao" })
    )  
)
```

### Use another port

```javascript
serve(7777)(
    ...
)
```

### Request Pipeline

Makine request handling with `.on()` is actually an [RxJS](https://rxjs-dev.firebaseapp.com/) pipeline with helpers.

```javascript
  on('POST', '/test')(
    reply(req => of(req).pipe(
      extract.body('path'), // extract the path from the original request
      map(path => 
        ({ uri: `http://localhost:3000/${path}` })), // prepare the new request
      request.perform(), // perform the new request
      extract.body('greeting'), // extracts the message from the response
      map(greeting => ({ message: `${greeting} you!` })), // prepare our response body
      request.onErrorMap(404, // in case the new request failed with 404 
        res => of({ message: `We had problem with ${res.uri}` })),
      flatMap(response.body())), // prepare the response with the prepared body
```




