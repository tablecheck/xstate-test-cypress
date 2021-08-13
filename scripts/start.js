const liveServer = require('live-server');

const params = {
  root: './todomvc',
  open: false,
  mount: [
    ['/todomvc-app-css', './node_modules/todomvc-app-css'],
    ['/todomvc-common', './node_modules/todomvc-common']
  ],
  logLevel: 0
};

console.log('Server running at http://localhost:8080');

liveServer.start(params);
