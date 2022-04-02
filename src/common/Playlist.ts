import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"
import { Track } from "./Track"

export class PlaylistInfo extends Struct.define("PlaylistInfo", {
    id: Type.string,
    label: Type.string
}) { }

export const ROOT_PLAYLIST_ID = "__root"

export class PlaylistData extends Struct.define("PlaylistData", {
    id: Type.string,
    label: Type.string,
    tracks: Type.string.as(Type.set)
}) { }

export const PlaylistContract = StructSyncContract.define(class Playlist extends Struct.define("Playlist", {
    id: Type.string,
    label: Type.string,
    tracks: Track.ref().as(Type.array)
}) {
}, {
    removeTrack: ActionType.define("removeTrack", Type.object({ track: Type.string }), Type.empty),
    addTrack: ActionType.define("addTrack", Type.object({ track: Type.string }), Type.empty),
    setLabel: ActionType.define("setLabel", Type.object({ label: Type.string }), Type.empty)
})

export const PlaylistManagerContract = StructSyncContract.define(class PlaylistManager extends Struct.define("PlaylistManager", {
    playlists: PlaylistInfo.ref().as(Type.map)
}) { }, {
    deletePlaylist: ActionType.define("deletePlaylist", Type.object({ playlist: Type.string }), Type.empty),
    createPlaylist: ActionType.define("createPlaylist", Type.object({ label: Type.string }), Type.string),
    getPlaylistsWithTrack: ActionType.define("getPlaylistsWithTrack", Type.object({ tract: Type.string }), Type.empty),
    getPlaylistsSnippet: ActionType.define("getPlaylistsSnippet", Type.empty, Track.ref().as(Type.array).as(Type.map))
})