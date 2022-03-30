import { DataPort } from "../backend/DataPort"
import { SimpleDB } from "../simpleDB/SimpleDB"

export const DATABASE = new SimpleDB({
    tables: {},
    onChanged() {
        DataPort.saveDatabase()
    }
})