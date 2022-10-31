import { io, SocketOptions } from "socket.io-client"
import { markRaw, reactive } from "vue"
import { modify } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { EventEmitter } from "../eventLib/EventEmitter"
import { EventListener } from "../eventLib/EventListener"
import { StructSyncClient } from "../structSync/StructSyncClient"
import { stringifyError } from "../vue3gui/util"
import { PlaylistManagerProxy } from "./playlist/PlaylistManagerProxy"
import { PlaylistProxy } from "./playlist/PlaylistProxy"
import { SpeakerManagerProxy } from "./speaker/SpeakerManagerProxy"
import { TrackEditorProxy } from "./track/TrackEditorProxy"
import { TrackImporterProxy } from "./track/TrackImporterProxy"

class State extends EventListener {
    public readonly onPlaylistsProbablyChanged = new EventEmitter()

    public ready = false
    public connected = false
    public readonly context: DIContext = null!
    public readonly playlists: PlaylistManagerProxy = null!
    public readonly trackEditor: TrackEditorProxy = null!
    public readonly speakerManager: SpeakerManagerProxy = null!
    public lastAddedPlaylist: string | null = null

    protected init() {
        let options: SocketOptions | undefined = undefined
        const key = new URL(location.href).searchParams.get("key")
        if (key) {
            options = {
                auth: {
                    token: key
                }
            }
        }

        const socket = markRaw(io({
            path: import.meta.env.BASE_URL ? import.meta.env.BASE_URL + "/socket.io" : undefined,
            ...options
        }))
        socket.on("connect", () => {
            this.connected = true
        })

        socket.on("disconnect", (reason) => {
            this.connected = false
        })

        socket.on("connect_error", (err) => {
            const text = stringifyError(err)
            if (text.startsWith("Auth required")) {
                const url = new URL(text.split(";")[1])
                url.searchParams.set("redirect", location.href)
                location.href = url.href
            }
        })

        const context = new DIContext(this.context)
        context.guard(() => socket.disconnect())

        const bridge = context.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        context.provide(IDProvider, () => new IDProvider.Incremental())
        bridge.obfuscateHandlerErrors = false
        context.provide(StructSyncClient, "default")

        const playlists = context.instantiate(() => PlaylistManagerProxy.default())
        const trackEditor = context.instantiate(() => TrackEditorProxy.default())
        const speakerManager = context.instantiate(() => SpeakerManagerProxy.default())

        modify(this as State, { context, playlists, trackEditor, speakerManager })

        this.playlists.synchronize()
        this.speakerManager.synchronize()

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
