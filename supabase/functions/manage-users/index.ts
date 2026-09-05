import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// These are automatically provided by Supabase Edge Functions
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
// Check for both names just in case
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the caller to ensure they have permission
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Verify the JWT of the user making this request
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !caller) {
      throw new Error('Invalid token')
    }

    // Check caller's role in the public.users table
    const { data: callerProfile } = await supabaseClient
      .from('users')
      .select('role, restaurant_id')
      .eq('id', caller.id)
      .single()

    const callerRoleRaw = callerProfile?.role;
    const callerRestaurantId = callerProfile?.restaurant_id;

    if (!callerRoleRaw) {
      throw new Error('Caller profile not found')
    }

    const callerRole = callerRoleRaw.toUpperCase().trim();

    // 2. Parse request body
    const body = await req.json()
    const email = body.email;
    const password = body.password;
    const fullName = body.fullName || (body.metadata ? body.metadata.full_name : null) || body.email;
    const phone = body.phone || (body.metadata ? body.metadata.phone : null) || '';
    const role = body.role || (body.metadata ? body.metadata.role : null) || 'waiter';
    const restaurantId = body.restaurantId || (body.metadata ? body.metadata.restaurant_id : null);

    // Normalize incoming role for check
    const roleUpper = role ? role.toUpperCase().trim() : '';

    // 3. Authorization Checks
    if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'SUPERADMIN') {
      if (callerRole !== 'RESTAURANT_ADMIN' && callerRole !== 'ADMIN') {
        throw new Error('Unauthorized: Only Admins can create users')
      }
      
      if (restaurantId !== callerRestaurantId) {
        throw new Error('Unauthorized: Cannot create staff for a different restaurant')
      }
      
      if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN' || roleUpper === 'RESTAURANT_ADMIN' || roleUpper === 'ADMIN') {
        throw new Error('Unauthorized: Restaurant Admins cannot create Admin accounts')
      }
    }

    // Map role to DB enum: 'superadmin', 'admin', 'waiter', 'cashier', 'kitchen'
    let dbRole = 'waiter';
    if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'SUPERADMIN') {
      dbRole = 'superadmin';
    } else if (roleUpper === 'RESTAURANT_ADMIN' || roleUpper === 'RESTAURANTADMIN' || roleUpper === 'ADMIN') {
      dbRole = 'admin';
    } else if (roleUpper === 'WAITER') {
      dbRole = 'waiter';
    } else if (roleUpper === 'CASHIER') {
      dbRole = 'cashier';
    } else if (roleUpper === 'KITCHEN') {
      dbRole = 'kitchen';
    }

    // 4. Create the User in auth.users (Bypassing normal sign-up restrictions)
    const { data: authUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
    })

    if (createUserError) {
      throw createUserError
    }

    const newUserId = authUser.user.id;

    // 5. Update the public.users table with the assigned role and tenant
    const { error: profileError } = await supabaseClient
      .from('users')
      .upsert({
        id: newUserId,
        email: email,
        full_name: fullName,
        phone: phone,
        role: dbRole,
        restaurant_id: restaurantId,
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      // Rollback auth user creation if profile fails
      await supabaseClient.auth.admin.deleteUser(newUserId);
      throw profileError;
    }

    // 6. Return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        userId: newUserId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
