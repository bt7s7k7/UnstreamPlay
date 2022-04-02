import { reactive } from "vue"
import { TractImporterContract } from "../../common/Track"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class TrackImporterProxy extends TractImporterContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}