import { Struct } from "../struct/Struct"
import { Type } from "../struct/Type"
import { ActionType } from "../structSync/ActionType"
import { EventType } from "../structSync/EventType"
import { StructSyncContract } from "../structSync/StructSyncContract"

export class SpeakerSync extends Struct.define("SpeakerSync", {
    playlist: Type.string,
    track: Type.string,
    time: Type.number,
    playback: Type.enum("shuffle", "linear"),
    playing: Type.boolean
}) { }

export class SpeakerState extends Struct.define("SpeakerState", {
    isOwner: Type.boolean,
    id: Type.string
}) { }

export const SpeakerManagerContract = StructSyncContract.define(class SpeakerManager extends Struct.define("SpeakerManager", {
    speakers: Type.string.as(Type.map),
    connected: SpeakerState.ref().as(Type.nullable)
}) { }, {
    init: ActionType.define("init", Type.empty, Type.object({ label: Type.string })),
    connect: ActionType.define("connect", Type.object({ speaker: Type.string }), Type.empty),
    disconnect: ActionType.define("disconnect", Type.empty, Type.empty),
    sendSync: ActionType.define("sendActionToFollowers", SpeakerSync.ref().as(Type.nullable), Type.empty)
}, {
    onSync: EventType.define("onSync", SpeakerSync.ref().as(Type.nullable)),
    onDestroy: EventType.define("onDestroy", Type.empty)
})