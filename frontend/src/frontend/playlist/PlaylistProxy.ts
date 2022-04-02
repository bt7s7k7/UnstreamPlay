import { reactive } from "vue"
import { PlaylistContract } from "../../common/Playlist"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class PlaylistProxy extends PlaylistContract.defineProxy() {
    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)
}