/* Booking choices are revalidated under the database lock at submission. */
const $ = id => document.getElementById(id);
let selected = '', request = 0;
function apiURL(route, params={}) {
  const url=new URL(api,location.href);
  if(url.searchParams.has('rest_route')) url.searchParams.set('rest_route',url.searchParams.get('rest_route')+route);
  else url.pathname+=route;
  for(const [key,value] of Object.entries(params)) url.searchParams.set(key,value);
  return url;
}
async function loadSlots() {
  const current = ++request;
  selected = ''; $('continue').disabled = true;
  if (!$('date').value) return;
  $('slots').textContent = 'Checking available times…';
  try {
    const response = await fetch(apiURL('slots',{date:$('date').value,service:$('service').value}));
    if (!response.ok) throw new Error('Availability could not be loaded. Try again.');
    const data = await response.json();
    if (current !== request) return;
    $('slots').replaceChildren();
    if (!data.slots.length) $('slots').textContent = 'No appointments that day. Please choose another date.';
    data.slots.forEach(time => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = time; button.setAttribute('aria-pressed','false');
      button.onclick = () => { selected = time; $('slots').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b === button))); $('continue').disabled = false; };
      $('slots').append(button);
    });
  } catch(e) { if (current === request) $('slots').textContent = e.message; }
}
$('date').onchange = loadSlots; $('service').onchange = loadSlots;
$('continue').onclick = () => { $('chosen').textContent = $('service').selectedOptions[0].text + ' · ' + $('date').value + ' at ' + selected + ' · Europe/London'; $('choose').hidden = true; $('details').hidden = false; $('name').focus(); };
$('back').onclick = () => { $('details').hidden = true; $('choose').hidden = false; $('error').textContent=''; loadSlots(); };
$('booking-form').onsubmit = async e => {
  e.preventDefault(); $('submit').disabled = true; $('error').textContent = '';
  try {
    const response = await fetch(apiURL('book'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:$('service').value,date:$('date').value,time:selected,name:$('name').value,email:$('email').value,website:$('website').value})});
    const data=await response.json();
    if (!response.ok) throw new Error(data.message || 'The booking could not be completed.');
    $('confirmed-service').textContent=data.service; $('confirmed-time').textContent=data.local; $('reference').textContent='Reference '+data.reference;
    $('mail-note').textContent = data.mail === 'sent' ? 'Your confirmation has been sent.' : 'Your appointment is saved, but the confirmation could not be sent. Keep this reference.';
    $('booking-form').hidden=true; $('confirmation').hidden=false; $('confirmation').focus();
  } catch(e) { $('error').textContent=e.message; } finally { $('submit').disabled=false; }
};
