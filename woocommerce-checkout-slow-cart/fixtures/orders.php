<?php
$orders=wc_get_orders(['limit'=>-1,'return'=>'objects']);
$rows=[];
foreach($orders as $o) {
    $items=[];
    foreach($o->get_items() as $item) $items[]=['product'=>$item->get_name(),'sku'=>$item->get_product()->get_sku(),'quantity'=>$item->get_quantity(),'total'=>wc_format_decimal($item->get_total(),2)];
    $rows[]=['status'=>$o->get_status(),'payment'=>$o->get_payment_method(),'currency'=>$o->get_currency(),'shipping'=>wc_format_decimal($o->get_shipping_total(),2),'shippingCountry'=>$o->get_shipping_country(),'shippingMethods'=>array_values(array_map(function($method){return $method->get_method_id();},$o->get_shipping_methods())),'total'=>wc_format_decimal($o->get_total(),2),'items'=>$items];
}
echo json_encode(['count'=>count($rows),'orders'=>$rows],JSON_PRETTY_PRINT)."\n";
