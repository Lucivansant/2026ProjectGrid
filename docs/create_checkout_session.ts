// Serves HTTP requests via Deno
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || ""
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error("User not authenticated")
    }

    const email = user.email
    let stripeCustomerId = user.user_metadata?.stripe_customer_id

    // 2. Ensure Stripe Customer Exists
    if (!stripeCustomerId) {
        // Search by email first to avoid duplicates
        const existingCustomers = await stripe.customers.list({ email: email, limit: 1 })
        
        if (existingCustomers.data.length > 0) {
            stripeCustomerId = existingCustomers.data[0].id
        } else {
            // Create new customer
            const newCustomer = await stripe.customers.create({
                email: email,
                name: user.user_metadata?.full_name || 'ProjectGrid User',
                metadata: { supabase_user_id: user.id }
            })
            stripeCustomerId = newCustomer.id
        }

        // Save ID to Supabase for future speed
        // Note: we can't easily update user_metadata from here with just anon key unless we use service_role
        // But for checkout flow, passing customer ID is enough. Ideally, the webhook will sync this later.
    }

    // 3. Create Checkout Session
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) throw new Error("Price ID is required")

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
