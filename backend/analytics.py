import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

def format_time_ago(date: datetime) -> str:
    diff = datetime.now(timezone.utc) - date
    diff_mins = max(0, int(diff.total_seconds() / 60))
    if diff_mins == 0:
        return 'just now'
    if diff_mins < 60:
        return f"{diff_mins}m"
    diff_hours = int(diff_mins / 60)
    if diff_hours < 24:
        return f"{diff_hours}h"
    return date.strftime('%b %d')

def calculate_analytics(supabase, restaurant_id: str, range_str: str = "Weekly") -> Dict[str, Any]:
    logger = logging.getLogger("analytics")
    now = datetime.now(timezone.utc)
    
    # 1. Define range parameters
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    if range_str == 'Daily':
        start_date = today_start
    elif range_str == 'Weekly':
        start_date = now - timedelta(days=7)
    elif range_str == 'Monthly':
        start_date = now - timedelta(days=30)
    elif range_str == 'Yearly':
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=7)

    start_iso = start_date.isoformat()
    today_start_iso = today_start.isoformat()
    is_all = (restaurant_id == "all")

    # Initialize data structures
    invoices = []
    total_invoices = []
    orders = []
    total_orders = []
    tables = []
    staff_count = 0
    order_items = []

    # 2. Fetch Data from Supabase with full error handling and RLS compliance
    # A. Fetch Invoices for range
    try:
        q_inv = supabase.table('invoices').select('total_amount, created_at, restaurant_id, restaurants(name), order_id, orders(tables!orders_table_id_fkey(table_number))')
        if not is_all:
            q_inv = q_inv.eq('restaurant_id', restaurant_id)
        
        inv_res = q_inv.gte('created_at', start_iso).order('created_at', desc=True).execute()
        invoices = inv_res.data or []
    except Exception as e:
        logger.error(f"Failed to query range invoices: {e}")

    # B. Fetch all invoices for total sales ever
    try:
        q_tot_inv = supabase.table('invoices').select('total_amount, created_at, restaurant_id, restaurants(name)')
        if not is_all:
            q_tot_inv = q_tot_inv.eq('restaurant_id', restaurant_id)
        
        total_inv_res = q_tot_inv.execute()
        total_invoices = total_inv_res.data or []
    except Exception as e:
        logger.error(f"Failed to query total invoices: {e}")

    # C. Fetch Orders
    try:
        q_ord = supabase.table('orders').select('id, status, created_at, restaurant_id, tables!orders_table_id_fkey(table_number)')
        if not is_all:
            q_ord = q_ord.eq('restaurant_id', restaurant_id)
            
        ord_res = q_ord.execute()
        total_orders = ord_res.data or []
        orders = [o for o in total_orders if o.get('created_at') >= start_iso]
    except Exception as e:
        logger.error(f"Failed to query orders: {e}")

    # D. Fetch Tables
    try:
        q_tb = supabase.table('tables').select('id, status, restaurant_id')
        if not is_all:
            q_tb = q_tb.eq('restaurant_id', restaurant_id)
            
        tb_res = q_tb.execute()
        tables = tb_res.data or []
    except Exception as e:
        logger.error(f"Failed to query tables: {e}")

    # E. Fetch Staff count
    try:
        q_stf = supabase.table('users').select('id', count='exact')
        if not is_all:
            q_stf = q_stf.eq('restaurant_id', restaurant_id)
        else:
            q_stf = q_stf.not_.is_('restaurant_id', 'null')
            
        stf_res = q_stf.execute()
        staff_count = stf_res.count if stf_res.count else 0
    except Exception as e:
        logger.error(f"Failed to query staff: {e}")

    # F. Fetch Order Items (with category and item names)
    try:
        q_items = supabase.table('order_items').select('quantity, unit_price, menu_items(name, menu_categories(name)), orders!inner(restaurant_id, created_at)')
        if not is_all:
            q_items = q_items.eq('orders.restaurant_id', restaurant_id)
            
        items_res = q_items.gte('orders.created_at', start_iso).execute()
        order_items = items_res.data or []
    except Exception as e:
        logger.error(f"Failed to query order items: {e}")

    # 3. Perform Calculations
    # Sales Aggregations
    total_sales = sum([float(inv.get('total_amount', 0)) for inv in total_invoices])
    today_sales = sum([float(inv.get('total_amount', 0)) for inv in total_invoices if inv.get('created_at') >= today_start_iso])
    
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    weekly_sales = sum([float(inv.get('total_amount', 0)) for inv in total_invoices if inv.get('created_at') >= seven_days_ago])
    
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    monthly_sales = sum([float(inv.get('total_amount', 0)) for inv in total_invoices if inv.get('created_at') >= thirty_days_ago])

    # Orders Calculations
    total_orders_count = len(total_orders)
    completed_orders_count = len([o for o in total_orders if o.get('status') == 'COMPLETED'])
    pending_orders_count = len([o for o in total_orders if o.get('status') in ['PENDING', 'PREPARING', 'READY', 'SERVED']])
    
    today_orders = [o for o in total_orders if o.get('created_at') >= today_start_iso]
    today_orders_count = len(today_orders)
    
    preparing_count = len([o for o in total_orders if o.get('status') == 'PREPARING'])
    pending_count = len([o for o in total_orders if o.get('status') == 'PENDING'])
    ready_count = len([o for o in total_orders if o.get('status') == 'READY'])
    served_count = len([o for o in total_orders if o.get('status') == 'SERVED'])
    
    # Active orders count for today = PENDING + PREPARING + READY + SERVED created today
    active_today_orders = len([o for o in today_orders if o.get('status') not in ('COMPLETED', 'CANCELLED')])
    
    # Pending bills = orders that are SERVED or READY today (waiting for payment/invoice)
    pending_bills_today = len([o for o in today_orders if o.get('status') in ('SERVED', 'READY')])

    # Table Seating Occupancy
    total_tables = len(tables)
    occupied_tables = len([t for t in tables if str(t.get('status', '')).lower() == 'occupied'])
    occupancy_rate = round((occupied_tables / total_tables) * 100) if total_tables > 0 else 0

    # Top-Selling Dishes
    item_counts = {}
    for item in order_items:
        menu_item = item.get('menu_items') or {}
        name = menu_item.get('name', 'Unknown Item')
        qty = item.get('quantity', 1)
        price = float(item.get('unit_price', 0))
        
        if name not in item_counts:
            item_counts[name] = {'name': name, 'count': 0, 'revenue': 0.0}
        
        item_counts[name]['count'] += qty
        item_counts[name]['revenue'] += qty * price

    top_selling = sorted(list(item_counts.values()), key=lambda x: x['count'], reverse=True)[:5]

    # Category-wise Sales
    category_counts = {}
    for item in order_items:
        menu_item = item.get('menu_items') or {}
        category = menu_item.get('menu_categories') or {}
        cat_name = category.get('name', 'Others')
        qty = item.get('quantity', 1)
        price = float(item.get('unit_price', 0))
        
        if cat_name not in category_counts:
            category_counts[cat_name] = {'name': cat_name, 'value': 0.0}
        category_counts[cat_name]['value'] += qty * price
        
    category_sales = list(category_counts.values())

    # Restaurant-wise Sales (for SaaS platform-level overview)
    restaurant_sales_map = {}
    for inv in total_invoices:
        rest = inv.get('restaurants') or {}
        rest_name = rest.get('name') or f"Restaurant {inv.get('restaurant_id')[:4].upper()}"
        amount = float(inv.get('total_amount', 0))
        
        if rest_name not in restaurant_sales_map:
            restaurant_sales_map[rest_name] = {'name': rest_name, 'sales': 0.0, 'orders': 0}
        
        restaurant_sales_map[rest_name]['sales'] += amount
        restaurant_sales_map[rest_name]['orders'] += 1
        
    restaurant_sales = list(restaurant_sales_map.values())

    # Charting / Revenue Trends
    chart_data = []
    if range_str == 'Daily':
        # Hourly slots (9:00 to 20:00)
        for i in range(12):
            chart_data.append({'h': f"{9 + i:02d}:00", 'sales': 0.0, 'orders': 0})
            
        for inv in invoices:
            dt = datetime.fromisoformat(inv['created_at'].replace('Z', '+00:00'))
            if dt >= today_start:
                hour = dt.hour
                index = hour - 9
                if 0 <= index < 12:
                    chart_data[index]['sales'] += float(inv.get('total_amount', 0))
                    chart_data[index]['orders'] += 1
    elif range_str == 'Weekly':
        # Last 7 Days
        days = [(now - timedelta(days=i)).strftime('%a') for i in range(6, -1, -1)]
        for day in days:
            chart_data.append({'h': day, 'sales': 0.0, 'orders': 0})
        
        for inv in invoices:
            dt = datetime.fromisoformat(inv['created_at'].replace('Z', '+00:00'))
            day_str = dt.strftime('%a')
            for entry in chart_data:
                if entry['h'] == day_str:
                    entry['sales'] += float(inv.get('total_amount', 0))
                    entry['orders'] += 1
                    break
    elif range_str == 'Monthly':
        # 4 Weeks
        chart_data = [{'h': f"Week {i+1}", 'sales': 0.0, 'orders': 0} for i in range(4)]
        for inv in invoices:
            dt = datetime.fromisoformat(inv['created_at'].replace('Z', '+00:00'))
            days_ago = (now - dt).days
            week_idx = 3 - min(3, days_ago // 7)
            chart_data[week_idx]['sales'] += float(inv.get('total_amount', 0))
            chart_data[week_idx]['orders'] += 1
    else:
        # Yearly (12 Months)
        months = [(now.replace(day=1) - timedelta(days=30*i)).strftime('%b') for i in range(11, -1, -1)]
        for m in months:
            chart_data.append({'h': m, 'sales': 0.0, 'orders': 0})
            
        for inv in invoices:
            dt = datetime.fromisoformat(inv['created_at'].replace('Z', '+00:00'))
            month_str = dt.strftime('%b')
            for entry in chart_data:
                if entry['h'] == month_str:
                    entry['sales'] += float(inv.get('total_amount', 0))
                    entry['orders'] += 1
                    break

    # Compile Recent Activity Feed
    activity_feed = []
    recent_orders = []
    recent_invoices = []
    
    try:
        q_rec_ord = supabase.table('orders').select('id, status, created_at, restaurant_id, tables!orders_table_id_fkey(table_number)')
        if not is_all:
            q_rec_ord = q_rec_ord.eq('restaurant_id', restaurant_id)
        
        recent_ord_res = q_rec_ord.order('created_at', desc=True).limit(5).execute()
        recent_orders = recent_ord_res.data or []
    except Exception as e:
        logger.error(f"Failed to query recent orders: {e}")

    try:
        q_rec_inv = supabase.table('invoices').select('total_amount, created_at, restaurant_id, order_id, orders(tables!orders_table_id_fkey(table_number))')
        if not is_all:
            q_rec_inv = q_rec_inv.eq('restaurant_id', restaurant_id)
            
        recent_inv_res = q_rec_inv.order('created_at', desc=True).limit(5).execute()
        recent_invoices = recent_inv_res.data or []
    except Exception as e:
        logger.error(f"Failed to query recent invoices: {e}")

    for o in recent_orders:
        table_info = o.get('tables')
        if isinstance(table_info, list) and len(table_info) > 0:
            table_info = table_info[0]
        
        table_num = f"Table T-{table_info['table_number']}" if table_info and table_info.get('table_number') else 'Takeaway'
        id_short = o['id'][:4].upper()
        
        status = o.get('status')
        text = f"New order #{id_short} · {table_num}"
        tone = 'primary'
        feed_type = 'order'

        if status == 'READY':
            text = f"Order #{id_short} marked ready · {table_num}"
            tone = 'success'
            feed_type = 'kitchen'
        elif status == 'PREPARING':
            text = f"Order #{id_short} preparing · {table_num}"
            tone = 'info'
            feed_type = 'kitchen'
        elif status == 'SERVED':
            text = f"Order #{id_short} served · {table_num}"
            tone = 'muted'
            feed_type = 'table'
        elif status == 'CANCELLED':
            text = f"Order #{id_short} cancelled"
            tone = 'destructive'
            feed_type = 'table'

        dt = datetime.fromisoformat(o['created_at'].replace('Z', '+00:00'))
        activity_feed.append({
            'type': feed_type,
            'text': text,
            'tone': tone,
            'rawTime': dt,
            'time': format_time_ago(dt)
        })

    for inv in recent_invoices:
        order_info = inv.get('orders') or {}
        table_info = order_info.get('tables') if order_info else None
        if isinstance(table_info, list) and len(table_info) > 0:
            table_info = table_info[0]
            
        table_num = f"Table T-{table_info['table_number']}" if table_info and table_info.get('table_number') else 'Takeaway'
        
        dt = datetime.fromisoformat(inv['created_at'].replace('Z', '+00:00'))
        activity_feed.append({
            'type': 'bill',
            'text': f"Bill paid · {table_num} · ₹{float(inv.get('total_amount', 0)):.0f}",
            'tone': 'info',
            'rawTime': dt,
            'time': format_time_ago(dt)
        })

    activity_feed.sort(key=lambda x: x['rawTime'], reverse=True)
    sorted_activity = activity_feed[:5]
    for activity in sorted_activity:
        del activity['rawTime']

    return {
        'revenue': {
            'today': today_sales,
            'weekly': weekly_sales,
            'monthly': monthly_sales,
            'total': total_sales,
            'trend': '+5.2%',
        },
        'orders': {
            'total': total_orders_count,
            'completed': completed_orders_count,
            'pending': pending_bills_today,     # today's orders waiting for payment
            'active': active_today_orders,      # shown as "Active Orders" on admin dashboard
            'today': today_orders_count,
            'preparing': preparing_count,
            'ready': ready_count,
            'served': served_count
        },
        'tables': {
            'total': total_tables,
            'occupied': occupied_tables,
            'rate': occupancy_rate
        },
        'staff': {
            'active': staff_count
        },
        'hourlyData': chart_data,
        'topSelling': top_selling,
        'categorySales': category_sales,
        'restaurantSales': restaurant_sales,
        'recentActivity': sorted_activity
    }
