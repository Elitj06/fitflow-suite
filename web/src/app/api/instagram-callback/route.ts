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

      return new NextResponse(`
        <html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f0f0f0">
          <h2>✅ Instagram autorizado com sucesso!</h2>
          <p><strong>User ID:</strong> ${userId}</p>
          <p><strong>Token (60 dias):</strong></p>
          <textarea style="width:90%;height:80px;font-size:11px;padding:8px">${finalToken}</textarea>
          <br><br>
          <p style="color:#666">Copie o token acima e envie para o TJ.</p>
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
