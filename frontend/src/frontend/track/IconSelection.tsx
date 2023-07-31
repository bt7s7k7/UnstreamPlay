import { mdiClose, mdiMagnify } from "@mdi/js"
import { computed, defineComponent, ref } from "vue"
import { Button } from "../../vue3gui/Button"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { grid } from "../../vue3gui/grid"
import { asyncComputed, useDebounce } from "../../vue3gui/util"
import { STATE } from "../State"
import { getIconURL } from "../constants"

export function useIconSelection(callback: (icon: string | null) => void) {
    const emitter = useDynamicsEmitter()

    return async function () {
        let removeIcon = false
        let selected = null as string | null

        const modal = emitter.modal(IconSelection, {
            props: {
                cancelButton: true,
            },
            buttons: [
                { label: "Remove Icon", variant: "danger", callback: (close) => { removeIcon = true; close() } }
            ],
            contentProps: {
                onSelect: (id: string) => { selected = id; modal.controller.close() }
            }
        })

        await modal

        if (removeIcon) callback(null)
        else if (selected != null) callback(selected)
    }
}

export const IconSelection = (defineComponent({
    name: "IconSelection",

    emits: {
        select: (id: string) => true
    },
    setup(props, ctx) {
        const icons = asyncComputed(() => null, () => STATE.trackEditor.getIconList())
        const searchQuery = ref("")
        const searchQueryDebounced = useDebounce(searchQuery, { delay: 100 })

        const iconsFiltered = computed(() => icons.value == null ? [] : searchQueryDebounced.value == "" ? icons.value : icons.value.filter(v => v.includes(searchQueryDebounced.value)))

        return () => (
            <div>
                <div class="flex row flex-basis-9 center-cross p-2 gap-2 border-bottom">
                    <h3 class="m-0 user-select-none" onClick={() => searchQuery.value = ""}>
                        <Icon icon={mdiMagnify} />
                        {searchQuery.value != "" && <Icon class="absolute bottom-0 left-0 small text-danger" icon={mdiClose} />}
                    </h3>
                    <TextField vModel={searchQuery.value} noIndicator clear class="flex-fill" placeholder="Search" />
                </div>
                <Overlay loading show={icons.loading} class="w-500 h-500 scroll">
                    <div style={grid().columns("repeat(4, 1fr)").$} class="w-fill">
                        {iconsFiltered.value && iconsFiltered.value.map(v => (
                            <Button clear key={v} onClick={() => ctx.emit("select", v)}>
                                <img src={getIconURL(v)} class="img-cover w-100 as-track-icon" />
                            </Button>
                        ))}
                    </div>
                </Overlay>
            </div>
        )
    }
}))
