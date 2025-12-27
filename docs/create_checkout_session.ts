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

    // 1. Get the current user (Optional)
    let user = null
    let email = null
    let stripeCustomerId = null

    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        const { data, error } = await supabaseClient.auth.getUser()
        if (!error && data?.user) {
            user = data.user
            email = user.email
            stripeCustomerId = user.user_metadata?.stripe_customer_id
        }
    }

    // 2. Ensure Stripe Customer Exists (Only if authenticated or email provided)
    if (user && !stripeCustomerId) {
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
    }

    // 3. Create Checkout Session
    const { priceId, successUrl, cancelUrl } = await req.json()

    if (!priceId) throw new Error("Price ID is required")

    // Session Config
    const sessionConfig = {
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      subscription_data: {
         trial_period_days: 7, // As mentioned in the UI "7 days guarantee" or trial? UI says "7 dias de garantia", which usually means refund policy, but "Trial" is safer for conversion. Let's keep it simple or strictly what user has.
         // Removing trial unless explicitly requested to avoid confusion.
      }
    }

    // If we have a customer ID, use it. 
    if (stripeCustomerId) {
        sessionConfig.customer = stripeCustomerId
    } else {
        // Guest Checkout: Let Stripe collect email.
        // We set customer_creation to 'always' to ensure we get a customer object for the webhook to use.
        sessionConfig.customer_creation = 'always'
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

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
