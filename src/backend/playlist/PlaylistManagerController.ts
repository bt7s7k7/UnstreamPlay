import { DATABASE } from "../../app/DATABASE"
import { PlaylistData, PlaylistManagerContract, ROOT_PLAYLIST_ID } from "../../common/Playlist"
import { Track } from "../../common/Track"
import { ClientError } from "../../structSync/StructSyncServer"
import { Tracks } from "../Tracks"
import { PlaylistController } from "./PlaylistController"

export class PlaylistManagerController extends PlaylistManagerContract.defineController() {
    public playlistControllers = new Map<string, PlaylistController>()

    public impl = super.impl({
        createPlaylist: async () => {
            throw new ClientError("Action not implemented yet!")
        },
        deletePlaylist: async () => {
            throw new ClientError("Action not implemented yet!")
        },
        getPlaylistsSnippet: async () => {
            const result = new Map<string, Track[]>()

            for (const playlist of this.playlistControllers.values()) {
                result.set(playlist.id, playlist.tracks.slice(0, 5))
            }

            return result
        },
        getPlaylistsWithTrack: async () => {
            throw new ClientError("Action not implemented yet!")
        }
    })

    protected loadPlaylist(playlistData: PlaylistData) {
        const controller = PlaylistController.make(playlistData)
        this.mutate(v => v.playlists.set(controller.id, controller.getInfo()))

        controller.onInfoChanged.add(this, info => {
            this.mutate(v => v.playlists.set(controller.id, info))
        })

        this.playlistControllers.set(controller.id, controller)

        return controller
    }

    public static make() {
        const controller = PlaylistManagerController.default()

        if (!DATABASE.tryGet("playlists", ROOT_PLAYLIST_ID)) {
            DATABASE.put("playlists", new PlaylistData({
                id: ROOT_PLAYLIST_ID,
                label: "All tracks",
                tracks: new Set()
            }))
        }

        let rootController: PlaylistController

        for (const playlist of DATABASE.list("playlists")) {
            const playlistController = controller.loadPlaylist(playlist)
            if (playlistController.id == ROOT_PLAYLIST_ID) rootController = playlistController
        }

        Tracks.onTrackCreated.add(controller, (track) => {
            rootController.addTrack(track)
        })

        return controller
    }
}