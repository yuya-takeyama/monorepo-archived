const { events, Job } = require('brigadier');

events.on('push', (e, p) => {
  console.log('e = %j', e);
  console.log('p = %j', p);
});
