export type Song = {
    id: string,
    title: string,
    youtubeUrl: string,
    thumbnail:string
}
export type Playlist = {
    id: string,
    title: string,
    songs:Song[]
}