<?php
/* Plugin Name: Estimate Page Styles
License: GPL-2.0-or-later */
add_action('wp_head', function () {
 echo '<style>*{box-sizing:border-box}body{font-family:system-ui;background:#f5f2eb;color:#18372e}header,footer{display:none!important}main{padding:24px!important;margin:0 auto!important;max-width:1000px;width:100%}.wp-site-blocks{overflow-x:clip}h1{font-size:38px!important;margin:12px 0!important}.estimate{background:white;border:1px solid #cbd7d0;border-radius:12px;padding:24px}.estimate h2{font-size:28px;margin:0 0 10px}.estimate p{margin:12px 0}input{width:65px;padding:10px}button{background:#18372e;color:white;padding:12px;border:0;border-radius:4px}#total{font-weight:bold;font-size:28px}@media(max-width:500px){h1{font-size:27px!important}.estimate{padding:16px}button{margin-top:10px}}</style>';
});
