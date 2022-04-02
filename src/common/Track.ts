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

export const TractImporterContract = StructSyncContract.define(class TractImporter extends Struct.define("TractImporter", {
    isRunning: Type.boolean,
    downloadOutput: Type.string.as(Type.array).as(Type.nullable),
    downloadedTracks: Track.ref().as(Type.map).as(Type.nullable)
}) { }, {
    importTracks: ActionType.define("importTracks", Type.empty, Type.empty)
})

export const TrackEditorContract = StructSyncContract.define(class TrackEditor extends Struct.define("TrackEditor", {}) { }, {
    setTrackLabel: ActionType.define("setTrackLabel", Type.object({ track: Type.string, label: Type.string }), Type.empty),
    setTrackAuthor: ActionType.define("setTrackAuthor", Type.object({ track: Type.string, label: Type.string }), Type.empty)
})