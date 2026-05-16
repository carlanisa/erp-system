<?php

namespace Database\Seeders;

use App\Models\Inventory\Product;
use App\Models\Inventory\StockMovement;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            // Electronics
            ['sku'=>'ELEC-001','name'=>'HP Laptop 15"',           'category'=>'Electronics', 'cost'=>85000, 'sale'=>99999, 'stock'=>12, 'alert'=>5,  'method'=>'fifo'],
            ['sku'=>'ELEC-002','name'=>'Samsung 27" Monitor',     'category'=>'Electronics', 'cost'=>32000, 'sale'=>38500, 'stock'=>8,  'alert'=>3,  'method'=>'fifo'],
            ['sku'=>'ELEC-003','name'=>'Logitech Wireless Mouse', 'category'=>'Electronics', 'cost'=>2200,  'sale'=>2800,  'stock'=>3,  'alert'=>5,  'method'=>'average'],
            ['sku'=>'ELEC-004','name'=>'USB-C Hub 7-in-1',        'category'=>'Electronics', 'cost'=>1800,  'sale'=>2500,  'stock'=>25, 'alert'=>10, 'method'=>'average'],
            // Furniture
            ['sku'=>'FURN-001','name'=>'Executive Office Chair',  'category'=>'Furniture',   'cost'=>18000, 'sale'=>24999, 'stock'=>6,  'alert'=>2,  'method'=>'fifo'],
            ['sku'=>'FURN-002','name'=>'L-Shaped Study Desk',     'category'=>'Furniture',   'cost'=>22000, 'sale'=>29500, 'stock'=>4,  'alert'=>2,  'method'=>'fifo'],
            ['sku'=>'FURN-003','name'=>'3-Drawer File Cabinet',   'category'=>'Furniture',   'cost'=>8500,  'sale'=>11000, 'stock'=>0,  'alert'=>2,  'method'=>'fifo'],
            // Stationery
            ['sku'=>'STAT-001','name'=>'A4 Paper Ream (500 pcs)', 'category'=>'Stationery',  'cost'=>550,   'sale'=>750,   'stock'=>45, 'alert'=>10, 'method'=>'average'],
            ['sku'=>'STAT-002','name'=>'Ballpoint Pen Box (50)',  'category'=>'Stationery',  'cost'=>320,   'sale'=>450,   'stock'=>2,  'alert'=>5,  'method'=>'average'],
            ['sku'=>'STAT-003','name'=>'Whiteboard Markers Set',  'category'=>'Stationery',  'cost'=>280,   'sale'=>380,   'stock'=>18, 'alert'=>5,  'method'=>'average'],
            // Software / Services
            ['sku'=>'SERV-001','name'=>'Annual Web Hosting Plan', 'category'=>'Services',    'cost'=>8000,  'sale'=>12000, 'stock'=>99, 'alert'=>1,  'method'=>'average'],
            ['sku'=>'SERV-002','name'=>'SSL Certificate 1yr',     'category'=>'Services',    'cost'=>3500,  'sale'=>5000,  'stock'=>50, 'alert'=>1,  'method'=>'average'],
        ];

        foreach ($products as $p) {
            Product::create([
                'sku'             => $p['sku'],
                'name'            => $p['name'],
                'category'        => $p['category'],
                'cost_price'      => $p['cost'],
                'sale_price'      => $p['sale'],
                'stock'           => $p['stock'],
                'low_stock_alert' => $p['alert'],
                'costing_method'  => $p['method'],
                'is_active'       => true,
            ]);
        }
    }
}
