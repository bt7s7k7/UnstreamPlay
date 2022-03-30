import { io } from "socket.io-client"
import { markRaw, reactive } from "vue"
import { modify } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { EventListener } from "../eventLib/EventListener"
import { StructSyncClient } from "../structSync/StructSyncClient"

class State extends EventListener {
    public ready = false
    public connected = false
    public readonly context: DIContext = null!

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

        modify(this as State, { context })

        this.ready = true
    }

    constructor() {
        super()
        const self = reactive(this) as this
        self.init()
        return self
    }
}

export const STATE = new State()