import {NextRequest, NextResponse} from 'next/server'

export async function GET(req: NextRequest) {
  const {searchParams} = new URL(req.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({error: 'query required'}, {status: 400})
  }

  try {
    const API_KEY = process.env.YOUTUBE_API_KEY

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(
      query
    )}&type=video&key=${API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({error: 'youtube fetch failed'}, {status: 500})
  }
}
