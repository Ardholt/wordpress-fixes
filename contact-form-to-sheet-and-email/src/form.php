<?php
/** Plugin Name: Enquiry desk form
 * License: MIT
 */
defined('ABSPATH') || exit;
add_action('rest_api_init', function () {
    register_rest_route('enquiry/v1', '/submit', [
        'methods' => 'POST', 'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            $p = $request->get_json_params();
            if (!is_array($p) || !isset($p['id'], $p['name'], $p['message']) ||
                !is_string($p['id']) || !is_string($p['name']) || !is_string($p['message']) ||
                !preg_match('/^[A-Z0-9-]{6,40}$/', $p['id']) ||
                strlen(trim($p['name'])) < 2 || strlen($p['name']) > 80 ||
                strlen(trim($p['message'])) < 5 || strlen($p['message']) > 1200) {
                return new WP_REST_Response(['status'=>'invalid', 'message'=>'Please add your name and enquiry.'], 422);
            }
            $p = ['id'=>$p['id'], 'name'=>sanitize_text_field($p['name']), 'message'=>sanitize_textarea_field($p['message'])];
            return enquiry_deliver($p);
        }
    ]);
});
add_action('template_redirect', function () {
    if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) !== '/') return;
    header('Content-Type: text/html; charset=utf-8');
    ?><!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Enquiry desk</title>
    <style> *{box-sizing:border-box}body{margin:0;background:#eeeae2;color:#203a36;font:18px/1.45 system-ui}main{max-width:760px;margin:12px auto;padding:22px;background:#fffdf8;border:1px solid #c9d2c8;border-radius:18px}small{font:700 12px/1.4 system-ui;letter-spacing:2px;color:#536b62}h1{font-size:32px;line-height:1.1;letter-spacing:-1.5px;margin:8px 0}p{color:#52655e;font-size:18px;margin:10px 0}label{display:block;font-size:18px;font-weight:600;margin:10px 0 4px}input,textarea{width:100%;padding:8px;border:1px solid #9faea5;border-radius:6px;font:24px system-ui;background:white}textarea{height:80px;resize:vertical}button{background:#225d4d;color:white;border:0;border-radius:7px;font:600 22px system-ui;padding:10px 24px;margin:12px 0;cursor:pointer}#status{font-size:22px;padding:12px;background:#e9f0e5;border-left:4px solid #497252;white-space:pre-line}#reference{font:20px ui-monospace,monospace}@media(max-width:600px){main{margin:12px;padding:22px}h1{font-size:32px}}</style>
    <main><small>ENQUIRY DESK · WORDPRESS</small><h1>Tell me what you need.</h1><p>Your enquiry goes to the local sheet and inbox.</p>
    <form><label for="name">Your name</label><input id="name" required minlength="2" maxlength="80" autocomplete="off"><label for="message">How can I help?</label><textarea id="message" required minlength="5" maxlength="1200"></textarea><button>Send enquiry</button></form><div id="status" role="status">Ready for your enquiry.</div><p id="reference"></p></main>
    <script>let id='ENQ-'+Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();const ref=document.querySelector('#reference');ref.textContent='Reference: '+id;
    document.querySelector('form').onsubmit=async e=>{e.preventDefault();const button=document.querySelector('button');button.disabled=true;try{const r=await fetch('/?rest_route=/enquiry/v1/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,name:document.querySelector('#name').value,message:document.querySelector('#message').value})});const data=await r.json();document.querySelector('#status').textContent=data.message;}catch(e){document.querySelector('#status').textContent='Connection interrupted. Please retry this enquiry with the same reference.';}finally{button.disabled=false;}};
    </script></html><?php exit;
}, 0);
