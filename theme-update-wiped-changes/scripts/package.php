<?php
$path = tempnam( sys_get_temp_dir(), 'child-' );
$zip = new ZipArchive();
if ( true !== $zip->open( $path, ZipArchive::OVERWRITE ) ) {
    throw new RuntimeException( 'Could not create the child archive.' );
}
foreach ( glob( '/case/fix/repair-child/*' ) as $file ) {
    $zip->addFile( $file, 'repair-child/' . basename( $file ) );
}
$zip->addFile( '/case/LICENSE', 'repair-child/LICENSE' );
$zip->close();
readfile( $path );
unlink( $path );
