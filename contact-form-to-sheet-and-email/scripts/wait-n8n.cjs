const fs = require('node:fs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const started = Date.now();
const observations = [];
function save(ready) {
  fs.writeFileSync('proof/n8n-readiness.json', JSON.stringify({
    ready,
    method: 'Wait for database readiness and the retired webhook route to return its JSON 404 before submitting the form.',
    observations,
  }, null, 2) + '\n');
}
(async () => {
  let previous = '';
  while (Date.now() - started < 110000) {
    const observation = {elapsed_ms: Date.now() - started};
    try {
      const health = await fetch('http://n8n:5678/healthz/readiness', {signal: AbortSignal.timeout(3000)});
      observation.health_status = health.status;
      // This unregistered route cannot create a row or send mail.
      const route = await fetch('http://n8n:5678/webhook/retired-enquiry', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}',
        signal: AbortSignal.timeout(3000),
      });
      observation.webhook_status = route.status;
      observation.webhook_content_type = route.headers.get('content-type');
      if (observation.webhook_content_type?.includes('application/json')) {
        observation.webhook_code = (await route.json()).code;
      } else {
        await route.text();
      }
      observations.push(observation);
      if (health.ok && route.status === 404 && observation.webhook_code === 404) {
        save(true);
        console.log('n8n database and webhook routing are ready.');
        return;
      }
    } catch (error) {
      observation.error = error.message;
      observations.push(observation);
    }
    const state = JSON.stringify({...observation, elapsed_ms: undefined});
    if (state !== previous) console.log('Waiting for n8n webhook routing: ' + state);
    previous = state;
    await delay(1000);
  }
  save(false);
  throw new Error('n8n webhook routing was not ready within 110 seconds; last response: ' + JSON.stringify(observations.at(-1)));
})().catch(error => {console.error(error.message); process.exit(1);});
