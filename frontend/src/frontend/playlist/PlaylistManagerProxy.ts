import { reactive } from "vue"
import { PlaylistManagerContract } from "../../common/Playlist"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class PlaylistManagerProxy extends PlaylistManagerContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}