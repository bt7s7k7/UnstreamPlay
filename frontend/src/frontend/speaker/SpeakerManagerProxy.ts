import { reactive } from "vue"
import { SpeakerManagerContract, SpeakerSync } from "../../common/Speaker"
import { StructSyncContract } from "../../structSync/StructSyncContract"

export class SpeakerManagerProxy extends SpeakerManagerContract.defineProxy() {
    public lastSync: SpeakerSync | null = null

    public static [StructSyncContract.INSTANCE_DECORATOR] = (v: any) => reactive(v)

    public async synchronize() {
        const data = await this[StructSyncContract.SERVICE].sendMessage({
            type: "find",
            target: TARGET,
            track: false
        })

        const instance = SpeakerManagerProxy.baseType.deserialize(data)
        delete instance.connected
        Object.assign(this, instance)

        this.onSync.add(null, sync => {
            this.lastSync = sync
        })
    }
}

const TARGET = SpeakerManagerProxy.baseType.name