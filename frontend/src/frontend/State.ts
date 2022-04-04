import { io } from "socket.io-client"
import { markRaw, reactive } from "vue"
import { modify } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { EventEmitter } from "../eventLib/EventEmitter"
import { EventListener } from "../eventLib/EventListener"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { PlaylistManagerProxy } from "./playlist/PlaylistManagerProxy"
import { PlaylistProxy } from "./playlist/PlaylistProxy"
import { TrackEditorProxy } from "./track/TrackEditorProxy"
import { TrackImporterProxy } from "./track/TrackImporterProxy"

class State extends EventListener {
    public readonly onPlaylistsProbablyChanged = new EventEmitter()

    public ready = false
    public connected = false
    public readonly context: DIContext = null!
    public readonly playlists: PlaylistManagerProxy = null!
    public readonly trackEditor: TrackEditorProxy = null!

    protected init() {
        const socket = markRaw(io())
        socket.on("connect", () => {
            this.connected = true
        })

        socket.on("disconnect", () => {
            this.connected = false
        })

        const context = new DIContext(this.context)
        context.guard(() => socket.disconnect())

        const bridge = context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        context.provide(IDProvider, () => new IDProvider.Incremental())
        bridge.obfuscateHandlerErrors = false
        context.provide(StructSyncClient, "default")

        const playlists = context.instantiate(() => PlaylistManagerProxy.default())
        const trackEditor = context.instantiate(() => TrackEditorProxy.default())

        modify(this as State, { context, playlists, trackEditor })

        this.playlists.synchronize()

        this.ready = true
    }

    public async getTrackImporter() {
        return TrackImporterProxy.make(this.context, { track: true })
    }

    public callPlaylistAction(id: string) {
        const playlist = this.context.instantiate(() => PlaylistProxy.default())
        playlist.id = id
        setTimeout(() => {
            this.onPlaylistsProbablyChanged.emit()
        }, 10)
        return playlist
    }

    public async findPlaylist(id: string) {
        return PlaylistProxy.make(this.context, { id, track: true })
    }

    constructor() {
        super()
        const self = reactive(this) as this
        self.init()
        return self
    }
}

export const STATE = new State()

// @ts-ignore
window.state = STATE
