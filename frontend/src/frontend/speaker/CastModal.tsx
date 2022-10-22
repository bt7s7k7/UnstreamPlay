import { mdiSpeaker } from "@mdi/js"
import { computed, defineComponent, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { Overlay } from "../../vue3gui/Overlay"
import { STATE } from "../State"

export const CastModal = (defineComponent({
    name: "CastModal",
    emits: {
        connected: () => true
    },
    setup(props, ctx) {
        const connecting = ref(false)
        function connectTo(id: string) {
            connecting.value = true
            STATE.speakerManager.connect({ speaker: id }).then(() => {
                ctx.emit("connected")
            }).finally(() => connecting.value = false)
        }

        return () => (
            <div class="flex-fill">
                <Overlay fullScreen loading show={connecting.value} />
                <div class="absolute-fill scroll flex column">
                    {[...STATE.speakerManager.speakers].map(([id, label]) => (
                        <Button class="text-left" clear key={id} onClick={() => connectTo(id)}>
                            <Icon icon={mdiSpeaker} />
                            {label}
                        </Button>
                    ))}
                </div>
            </div>
        )
    }
}))

export function useCastModal() {
    const emitter = useDynamicsEmitter()

    const casting = computed(() => {
        const connected = STATE.speakerManager.connected
        if (connected == null) return null

        return STATE.speakerManager.speakers.get(connected.id)!
    })

    function openCastModal() {
        const modal = emitter.modal(CastModal, {
            contentProps: {
                onConnected: () => {
                    modal.controller.close()
                }
            },
            props: {
                cancelButton: "Close",
                class: "w-300 h-500"
            }
        })
    }

    function disconnect() {
        STATE.speakerManager.disconnect()
    }

    return { casting, openCastModal, disconnect }
}