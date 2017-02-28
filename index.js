'use strict';
var express = require('express');
var path = require("path");
//var api = require('./server/api/api');

/* Start Dev Server */
var app     = express();

console.log(process.env.PORT);
app.set('port', (process.env.PORT || 8000));
// Serve static assets
app.use(express.static(path.resolve(__dirname, '.', 'dist')));

// Always return the main index.html, so react-router render the route in the client
//app.get(/^((?!\/api).)*$/, (req, res) => {
  //res.sendFile(path.resolve(__dirname, '.', 'dist', 'index.html'));
//});

app.get('/', function(request, response) {
  res.send('test');
});

// /^((?!\/api).)*$/
//app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  // var err = new Error('Not Found');
  // err.status = 404;
  //next(err);
  res.status(404).send('Not found');
});

// app.listen((process.env.PORT || 8000), function () {
//       console.log('Example app listening on port 8000');
// });
