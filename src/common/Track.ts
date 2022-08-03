import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class Track extends Struct.define("Track", {
    id: Type.string,
    label: Type.string,
    author: Type.string,
    icon: Type.string,
    url: Type.string
}) { }

export class TrackImportSettings extends Struct.define("TrackImportSettings", {
    playlist: Type.string.as(Type.nullable)
}) { }

export const TractImporterContract = StructSyncContract.define(class TractImporter extends Struct.define("TractImporter", {
    isRunning: Type.boolean,
    downloadOutput: Type.string.as(Type.array).as(Type.nullable),
    downloadedTracks: Track.ref().as(Type.map).as(Type.nullable),
    settings: TrackImportSettings.ref()
}) { }, {
    importTracks: ActionType.define("importTracks", Type.empty, Type.empty),
    setPlaylist: ActionType.define("setPlaylist", Type.object({ playlist: Type.string.as(Type.nullable) }), Type.empty)
})

export const TrackEditorContract = StructSyncContract.define(class TrackEditor extends Struct.define("TrackEditor", {}) { }, {
    setTrackLabel: ActionType.define("setTrackLabel", Type.object({ track: Type.string, label: Type.string }), Type.empty),
    setTrackAuthor: ActionType.define("setTrackAuthor", Type.object({ track: Type.string, author: Type.string }), Type.empty),
    deleteTrack: ActionType.define("deleteTrack", Type.object({ track: Type.string }), Type.empty)
})