import { createServer } from "http"
import { join } from "path"
import { createInterface } from "readline"
import { Server } from "socket.io"
import { DataPort } from "../backend/DataPort"
import { PlaylistManagerController } from "../backend/playlist/PlaylistManagerController"
import { TrackEditorController } from "../backend/tracks/TrackEditorController"
import { TrackImporterController } from "../backend/tracks/TrackImporterController"
import { stringifyAddress } from "../comTypes/util"
import { IDProvider } from "../dependencyInjection/commonServices/IDProvider"
import { MessageBridge } from "../dependencyInjection/commonServices/MessageBridge"
import { DIContext } from "../dependencyInjection/DIContext"
import { Logger } from "../logger/Logger"
import { NodeLogger } from "../nodeLogger/NodeLogger"
import { StructSyncServer } from "../structSync/StructSyncServer"
import { StructSyncSession } from "../structSync/StructSyncSession"
import { ENV } from "./ENV"
import express = require("express")

const context = new DIContext()
export const logger = context.provide(Logger, () => new NodeLogger())

DataPort.init(logger).catch(err => {
    logger.error`${err}`
    process.exit(1)
}).then(v => {
    logger.info`Config: ${ENV}`

    const app = express()
    const http = createServer(app)
    const io = new Server(http)

    context.provide(IDProvider, () => new IDProvider.Incremental())
    context.provide(StructSyncServer, "default")

    const trackImporter = context.instantiate(() => TrackImporterController.default().register())
    const playlistManager = context.instantiate(() => PlaylistManagerController.make().register())
    context.instantiate(() => TrackEditorController.default().register())

    playlistManager.trackImporter = trackImporter

    io.on("connect", (socket) => {
        const sessionContext = new DIContext(context)
        sessionContext.provide(MessageBridge, () => new MessageBridge.Generic(socket))
        const session = sessionContext.provide(StructSyncSession, "default")

        session.onError.add(null, (error) => logger.error`${error}`)

        socket.on("disconnect", () => {
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

    const rl = createInterface(process.stdin, process.stdout)
    rl.setPrompt("")

    rl.on("line", (line) => {
        const [command, ...args] = line.split(" ")

        if (command == "import") {
            trackImporter.importTracks()
        } else if (command == "reset") {
            DataPort.deleteEverything().then(() => process.exit(0))
        } else {
            logger.error`Unknown command`
        }
    })
})