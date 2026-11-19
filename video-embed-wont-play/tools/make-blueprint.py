import base64, json
from pathlib import Path
files={
 '/wordpress/wp-content/themes/video-visit/'+p.name:p.read_text()
 for p in Path('source/theme').iterdir() if p.is_file()
}
files['/wordpress/.htaccess']=Path('source/wordpress.htaccess').read_text()+''.join(line for line in Path('fix/security.conf').read_text().splitlines(True) if line.startswith('Header '))
files['/wordpress/header-capability.php']='''<?php
header('Content-Type: application/json');
echo json_encode([
 'sapi' => PHP_SAPI,
 'apacheModuleAPIAvailable' => function_exists('apache_get_modules'),
 'apacheHeaderDirectiveOnDisk' => str_contains(file_get_contents(__DIR__ . '/.htaccess'), 'Header always set Content-Security-Policy'),
 'configuredMediaDirective' => "media-src 'self'"
]);
'''
code="<?php\n"
for path,content in files.items():
 code+=f"@mkdir(dirname({json.dumps(path)}), 0777, true); file_put_contents({json.dumps(path)}, base64_decode('{base64.b64encode(content.encode()).decode()}'));\n"
clip=base64.b64encode(Path('source/assets/visit-guide.webm').read_bytes()).decode()
code+="@mkdir('/wordpress/wp-content/uploads',0777,true);\n"
code+=f"file_put_contents('/wordpress/wp-content/uploads/visit-guide.webm',base64_decode('{clip}'));\n"
code+="require '/wordpress/wp-load.php';\nswitch_theme('video-visit');\nupdate_option('blogname','Visitor information');\n"
for name,title,filename in [('welcome','Before your visit','home.html'),('visit','Plan your visit','visit.html')]:
 content=base64.b64encode(Path('fixtures/'+filename).read_bytes()).decode()
 code+=f"$id=wp_insert_post(['post_type'=>'page','post_status'=>'publish','post_name'=>'{name}','post_title'=>'{title}','post_content'=>base64_decode('{content}')]);\n"
 if name=='welcome': code+="update_option('show_on_front','page'); update_option('page_on_front',$id);\n"
code+="update_option('permalink_structure','/%postname%/'); flush_rewrite_rules(false);\n"
blueprint={'$schema':'https://playground.wordpress.net/blueprint-schema.json','landingPage':'/','preferredVersions':{'php':'8.3','wp':'6.8.3'},'features':{'networking':False},'steps':[{'step':'runPHP','code':code}]}
Path('blueprint.json').write_text(json.dumps(blueprint,indent=2)+'\n')
