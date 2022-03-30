import { Ref, watchEffect } from "vue"

export function useTitle(title?: Ref<string> | string) {
    watchEffect(() => {
        document.title = (title ? (typeof title == "string" ? title : title.value) + " - " : "") + "UnstreamPlay"
    })
}