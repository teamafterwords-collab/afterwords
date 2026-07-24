import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('paddle_customer_id')
      .eq('user_id', userId)
      .single()

    if (error || !subscription?.paddle_customer_id) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const paddleBaseUrl =
      process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
        ? 'https://api.paddle.com'
        : 'https://sandbox-api.paddle.com'

    const response = await fetch(
      `${paddleBaseUrl}/customers/${subscription.paddle_customer_id}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({
      url: data.data.urls.general.overview,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}