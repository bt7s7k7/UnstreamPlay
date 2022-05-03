import { renameSync } from "fs"
import { createServer } from "http"
import { extname, join } from "path"
import { createInterface } from "readline"
import { Server } from "socket.io"
import { DataPort } from "../backend/DataPort"
import { exportTracks } from "../backend/exportTracks"
import { PlaylistManagerController } from "../backend/playlist/PlaylistManagerController"
import { TrackEditorController } from "../backend/tracks/TrackEditorController"
import { TrackImporterController } from "../backend/tracks/TrackImporterController"
import { Tracks } from "../backend/tracks/Tracks"
import { getSafeTrackFileName } from "../backend/util"
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
}).then(() => {
    logger.info`Config: ${ENV}`

    const app = express()
    const http = createServer(app)
    const io = new Server(http)

    context.provide(IDProvider, () => new IDProvider.Incremental())
    context.provide(StructSyncServer, "default")

    const trackImporter = context.instantiate(() => TrackImporterController.make().register())
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
        } else if (command == "export") {
            const [path] = args
            exportTracks(path, logger)
        } else if (command == "name_tracks") {
            const trackFolder = DataPort.getTracksFolder()

            for (const track of Tracks.listTracks()) {
                const oldFilename = track.url
                const ext = extname(oldFilename)
                const newFilename = getSafeTrackFileName(track) + "_" + track.id + ext
                renameSync(join(trackFolder, oldFilename), join(trackFolder, newFilename))
                Tracks.updateTrack(track, { url: newFilename })
            }
        } else {
            logger.error`Unknown command`
        }
    })
})