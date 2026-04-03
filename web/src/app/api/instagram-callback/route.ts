import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>❌ Erro na autorização</h2>
        <p>${error}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }

  if (code) {
    // Trocar o code pelo token usando a API do Instagram
    const APP_ID = '1638878997426449'
    const APP_SECRET = '8b7c51dcc54d6db8b1ad034bbdf7d152'
    const REDIRECT_URI = 'https://fitflow-suite.vercel.app/api/instagram-callback'

    const formData = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code: code,
    })

    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.access_token) {
      // Trocar por token de longa duração
      const longTokenResponse = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${APP_SECRET}&access_token=${tokenData.access_token}`
      )
      const longTokenData = await longTokenResponse.json()
      const finalToken = longTokenData.access_token || tokenData.access_token
      const userId = tokenData.user_id

      // Save token to Supabase for reliable retrieval
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (supabaseUrl && supabaseKey) {
        try {
          await fetch(`${supabaseUrl}/rest/v1/instagram_tokens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              user_id: String(userId),
              access_token: finalToken,
              created_at: new Date().toISOString()
            })
          })
        } catch (_) { /* ignore */ }
      }

      // Try to send via Evolution API
      try {
        const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
        const evolutionKey = process.env.EVOLUTION_API_KEY || 'minha-chave-secreta'
        const waMsgBody = `✅ *Instagram autorizado!*\n\n*User ID:* ${userId}\n\n*Token (60 dias):*\n${finalToken}\n\n_Salvo no Supabase — TJ já pode buscar._`
        await fetch(`${evolutionUrl}/message/sendText/orion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
          body: JSON.stringify({ number: '5521986053944', text: waMsgBody })
        })
      } catch (_) { /* silently ignore WA send errors */ }

      return new NextResponse(`
        <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f0f0f0">
          <h2>✅ Instagram autorizado com sucesso!</h2>
          <p><strong>User ID:</strong> ${userId}</p>
          <p style="color:#28a745"><strong>Token enviado via WhatsApp automaticamente!</strong></p>
          <br>
          <p style="color:#666;font-size:13px">O token completo foi enviado para o seu WhatsApp. Não precisa copiar da tela.</p>
          <details style="margin-top:20px">
            <summary style="cursor:pointer;color:#666">Ver token (backup)</summary>
            <textarea style="width:90%;height:100px;font-size:10px;padding:8px;margin-top:10px;word-break:break-all">${finalToken}</textarea>
          </details>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } })
    }

    return new NextResponse(`
      <html><body style="font-family:sans-serif;text-align:center;padding:50px">
        <h2>❌ Erro ao obter token</h2>
        <pre>${JSON.stringify(tokenData, null, 2)}</pre>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } })
  }

  return new NextResponse('Aguardando autorização...', { status: 200 })
}
