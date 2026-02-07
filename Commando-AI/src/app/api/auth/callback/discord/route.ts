import axios from 'axios'
import { NextResponse, NextRequest } from 'next/server'
import url from 'url'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  
  // Detect the base URL from the incoming request to ensure redirect_uri matches
  const protocol = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('host') || req.nextUrl.host
  const detectedBaseUrl = `${protocol}://${host}`
  const baseUrl = process.env.NEXT_PUBLIC_URL || detectedBaseUrl
  
  // Use the same redirect URI that was used to initiate the OAuth flow
  const redirectUri = `${baseUrl}/api/auth/callback/discord`
  
  console.log('Discord callback - Using redirect_uri:', redirectUri)
  
  if (code) {
    try {
      const data = new url.URLSearchParams()
      data.append('client_id', process.env.DISCORD_CLIENT_ID!)
      data.append('client_secret', process.env.DISCORD_CLIENT_SECRET!)
      data.append('grant_type', 'authorization_code')
      data.append('redirect_uri', redirectUri)
      data.append('code', code.toString())

      const output = await axios.post(
        'https://discord.com/api/oauth2/token',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      )

      if (output.data) {
        const access = output.data.access_token
        
        // Get user's guilds to find the guild name
        const UserGuilds: any = await axios.get(
          `https://discord.com/api/users/@me/guilds`,
          {
            headers: {
              Authorization: `Bearer ${access}`,
            },
          }
        )

        const UserGuild = UserGuilds.data.filter(
          (guild: any) => guild.id == output.data.webhook.guild_id
        )

        const guildName = UserGuild[0]?.name || 'Unknown Server'

        return NextResponse.redirect(
          `${baseUrl}/connections?webhook_id=${output.data.webhook.id}&webhook_url=${encodeURIComponent(output.data.webhook.url)}&webhook_name=${encodeURIComponent(output.data.webhook.name)}&guild_id=${output.data.webhook.guild_id}&guild_name=${encodeURIComponent(guildName)}&channel_id=${output.data.webhook.channel_id}`
        )
      }
    } catch (error) {
      console.error('Discord OAuth error:', error)
    }

    return NextResponse.redirect(`${baseUrl}/connections?error=discord_auth_failed`)
  }
  
  return NextResponse.redirect(`${baseUrl}/connections?error=no_code`)
}
