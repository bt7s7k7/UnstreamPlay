import { createServer } from "http"
import { verify as verifyToken } from "jsonwebtoken"
import { join } from "path"
import { createInterface } from "readline"
import { Server } from "socket.io"
import { AdminUIClient } from "../adminUIClient/AdminUIClient"
import { DataPort } from "../backend/DataPort"
import { PlaylistManagerController } from "../backend/playlist/PlaylistManagerController"
import { SpeakerManagerController } from "../backend/SpeakerManagerController"
import { TrackEditorController } from "../backend/tracks/TrackEditorController"
import { TrackImporterController } from "../backend/tracks/TrackImporterController"
import { stringifyAddress } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import { RouteResolver } from "../remoteUIBackend/RemoteUIController"
import { StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import { Admin } from "./Admin"
import { ENV } from "./ENV"
import express = require("express")

const context = new DIContext()
export const logger = context.provide(Logger, () => new NodeLogger())

async function initAdminUI(admin: Admin) {
    const client = await AdminUIClient.connect()
    if (client == null) {
        logger.warn`Cannot connect to AdminUI`
        return
    }

    logger.info`Connected to AdminUI`
    const { remoteUI } = await client.makeRemoteUI(ENV.ADMIN_UI_NAME ?? "unstream_play")
    remoteUI.routes = new RouteResolver.Static({
        routes: {
            index: admin.ui
        }
    })
}

DataPort.init(logger).catch(err => {
    logger.error`${err}`
    process.exit(1)
}).then(() => {
    logger.info`Config: ${ENV}`

    const app = express()
    const http = createServer(app)
    const io = new Server(http)

    context.provide(IDProvider, () => new IDProvider.Incremental())
    context.provide(StructSyncServer, "default")

    const trackImporter = context.instantiate(() => TrackImporterController.make().register())
    const playlistManager = context.instantiate(() => PlaylistManagerController.make().register())
    const speakerManager = context.instantiate(() => SpeakerManagerController.default().register())
    context.instantiate(() => TrackEditorController.default().register())

    playlistManager.trackImporter = trackImporter

    if (ENV.SMWA_KEY) {
        const key = Buffer.from(ENV.SMWA_KEY, "base64")
        io.use(async (socket, next) => {
            const token = socket.handshake.auth.token
            const payload = await new Promise<any>((resolve, reject) => verifyToken(
                token, key, {},
                (err: any, payload: any) => err ? reject(err) : resolve(payload!))
            ).catch(() => null)

            if (payload == null || payload.iss != "smwa") {
                next(new Error("Auth required;" + ENV.SMWA_URL))
            } else {
                next()
            }
        })
    }

    io.on("connect", (socket) => {
        const sessionContext = new DIContext(context)
        sessionContext.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        const session = sessionContext.provide(StructSyncSession, "default")

        session.onError.add(null, (error) => logger.error`${error}`)

        socket.on("disconnect", () => {
            speakerManager.setSessionSpeakerState(session, null)
            sessionContext.dispose()
        })
    })

    app.use("/tracks", express.static(DataPort.getTracksFolder()))
    app.use("/icons", express.static(DataPort.getIconsFolder()))

    const distFolder = join(ENV.BASE_DIR, "frontend/dist")
    app.use("/", express.static(distFolder))
    app.use("/", (req, res) => res.status(200).sendFile(join(distFolder, "index.html")))

    http.listen(ENV.PORT, () => {
        logger.info`Listening on ${"http://" + stringifyAddress(http.address())}`
    })

    const admin = context.instantiate(() => new Admin(trackImporter, speakerManager, playlistManager))
    initAdminUI(admin)
    Object.assign(globalThis, admin)

    const rl = createInterface(process.stdin, process.stdout)
    rl.setPrompt("")

    rl.on("line", (line) => {
        const [command, ...args] = line.split(" ")
        admin.runCLICommand(command, args)
    })
})