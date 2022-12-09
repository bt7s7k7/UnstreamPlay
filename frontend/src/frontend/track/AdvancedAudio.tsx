import { defineComponent, onMounted, reactive, Ref, watch } from "vue"
import { unreachable } from "../../comTypes/util"
import { Type } from "../../struct/Type"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Overlay } from "../../vue3gui/Overlay"

const state_t = Type.object({
    enabled: Type.boolean,
    gain: Type.number
})

Type.defineMigrations(state_t, [
    { version: 0, desc: "Initial state", migrate: v => v }
])

const state: Type.GetTypeFromTypeWrapper<typeof state_t> = reactive({
    enabled: false,
    gain: 1
})

{
    const savedState = localStorage.getItem("unstream-play:advanced-audio")
    if (savedState != null) {
        try {
            Object.assign(state, state_t.deserialize(JSON.parse(savedState)))
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err)
        }
    }
}

function save() {
    localStorage.setItem("unstream-play:advanced-audio", JSON.stringify(state_t.serialize(state)))
}
watch(() => state, save, { deep: true })

const AdvancedAudioSettings = (defineComponent({
    name: "AdvancedAudioSettings",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()
        async function disable() {
            if (!await emitter.confirm("Disabling advanced audio requires a reload")) return

            state.enabled = false
            save()
            location.reload()
        }

        return () => (
            <div class="flex column w-350 h-500 gap-4">
                <div class="flex row gap-2 center-cross">
                    <div class="flex-basis-100">State:</div>
                    {state.enabled ? (
                        <Button onClick={disable} variant="success" >Enabled</Button>
                    ) : (
                        <Button onClick={() => state.enabled = true} variant="danger" >Disabled</Button>
                    )}
                </div>
                <Overlay show={!state.enabled} class="flex column gap-2" variant="dark">
                    <div class="flex row center-cross">
                        <div class="flex-basis-100">Gain:</div>
                        <input type="range" value={(state.gain * 100).toFixed(0)} min="0" max="100" step="1" onInput={(event: any) => state.gain = (+event.target.value) / 100} class="flex-fill" />
                        <div class="flex-basis-9 monospace ml-1">{(state.gain * 100).toFixed(0)}%</div>
                    </div>
                </Overlay>
            </div>
        )
    }
}))

export function useAdvancedAudio(audio: Ref<HTMLAudioElement | undefined>) {
    let patch: {
        ctx: AudioContext,
        gain: GainNode,
        input: MediaElementAudioSourceNode
    } | null = null

    function update() {
        if (!state.enabled) {
            if (patch != null) {
                patch.input.disconnect()
                patch.ctx.close()
                patch = null
            }

            return
        }

        if (patch == null) {
            const inputElement = audio.value
            if (inputElement == null) unreachable("Audio ref value should not be null during update")
            const ctx = new AudioContext()
            const gain = new GainNode(ctx)
            const input = new MediaElementAudioSourceNode(ctx, {
                mediaElement: inputElement
            })

            input.connect(gain).connect(ctx.destination)
            patch = { ctx, gain, input }
        }

        patch.gain.gain.value = state.gain
    }

    onMounted(() => {
        update()
    })

    watch(() => state, () => {
        update()
    }, { deep: true })

    const emitter = useDynamicsEmitter()

    return {
        openSettings() {
            emitter.modal(AdvancedAudioSettings, {
                props: {
                    cancelButton: true
                }
            })
        }
    }
}