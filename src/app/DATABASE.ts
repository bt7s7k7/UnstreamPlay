import { DataPort } from "../backend/DataPort"
import { PlaylistData } from "../common/Playlist"
import { Track } from "../common/Track"
import { SimpleDB } from "../simpleDB/SimpleDB"

export const DATABASE = new SimpleDB({
    tables: {
        tracks: Track,
        playlists: PlaylistData
    },
    onChanged() {
        DataPort.saveDatabase()
    }
})