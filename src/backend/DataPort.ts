import { mkdir, readFile, writeFile } from "fs/promises"
import { join } from "path"
import { DATABASE } from "../app/DATABASE"
import { ENV } from "../app/ENV"
import { Logger } from "../logger/Logger"

let logger: Logger = null!
const databasePath = join(ENV.DATA_PATH, "db.json")

export namespace DataPort {
    export async function init(newLogger: Logger) {
        logger = newLogger
        logger.info`Loading data...`

        await mkdir(ENV.DATA_PATH).catch((err) => { if (err.code == "EEXIST") return null; else throw err })

        const databaseData = await readFile(databasePath).catch(err => { if (err.code == "ENOENT") return null; else throw err })
        if (databaseData) {
            DATABASE.import(JSON.parse(databaseData.toString()))
        }

        logger.info`Finished loading!`
    }

    export async function saveDatabase() {
        await writeFile(databasePath, JSON.stringify(DATABASE.export()))
    }
}