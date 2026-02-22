import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const isSupabaseConfigured =
    SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 10

export async function proxy(request: NextRequest) {
    if (!isSupabaseConfigured) {
        return NextResponse.next({ request })
    }

    // Performance: skip expensive auth refresh for non-navigation requests
    // (e.g., Server Actions POST). Auth is still enforced by server actions.
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session — this keeps cookies alive on every request
    const { data: { user } } = await supabase.auth.getUser()

    // Skip auth redirects for prefetch requests — only refresh cookies
    const isPrefetch =
        request.headers.get('next-router-prefetch') === '1' ||
        request.headers.get('purpose') === 'prefetch'

    if (isPrefetch) {
        return supabaseResponse
    }

    const { pathname } = request.nextUrl
    const isAuthPage = pathname.startsWith('/auth')
    const isPublicPage = pathname === '/'

    // If coming from an app page (authenticated page), don't redirect to login
    // even if getUser() returns null due to timing issues
    const referer = request.headers.get('referer') || ''
    const isFromAppPage = /\/(dashboard|tasks|habits|goals|journal|analytics|pomodoro|review|settings|onboarding)/.test(referer)

    // Redirect unauthenticated users to login ONLY if they're not coming from an app page
    if (!user && !isAuthPage && !isPublicPage && !isFromAppPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
    }

    // Redirect authenticated users away from auth pages
    if (user && isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        const redirectResponse = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach(cookie => {
            redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
