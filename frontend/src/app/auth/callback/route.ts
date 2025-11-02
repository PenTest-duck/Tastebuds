import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) {
    // if "next" is not a relative URL, use the default
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { data: resp, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // If new signup, add to profiles table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', resp.user.id)
        .single();

      // Extract user metadata from auth user
      const userMetadata = resp.user.user_metadata || {};
      const avatarUrl = resp.user.user_metadata?.avatar_url || resp.user.user_metadata?.picture || null;
      const email = resp.user.email || null;

      if (!existingProfile) {
        // Parse name from user metadata or use email prefix as fallback
        const firstName = userMetadata.first_name || userMetadata.given_name || '';
        const lastName = userMetadata.last_name || userMetadata.family_name || '';

        const { error: newProfileError } = await supabase.from('profiles').insert({
          id: resp.user.id,
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          email: email,
        });
        if (newProfileError) {
          console.error('Error creating new profile:', newProfileError);
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}