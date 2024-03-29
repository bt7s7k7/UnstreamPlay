import { mdiClose, mdiCloudDownloadOutline, mdiDownload, mdiPlaylistPlus, mdiWrench } from "@mdi/js"
import { defineComponent, nextTick, onMounted, onUnmounted, ref, Transition, watch } from "vue"
import { DISPOSE } from "../../eventLib/Disposable"
import { Button } from "../../vue3gui/Button"
import { Circle } from "../../vue3gui/Circle"
import { useDynamicsEmitter } from "../../vue3gui/DynamicsEmitter"
import { Icon } from "../../vue3gui/Icon"
import { LoadingIndicator } from "../../vue3gui/LoadingIndicator"
import { Overlay } from "../../vue3gui/Overlay"
import { TextField } from "../../vue3gui/TextField"
import { asyncComputed } from "../../vue3gui/util"
import { PlaylistInclusionForm } from "../playlist/PlaylistInclusionForm"
import { STATE } from "../State"
import { TrackCard } from "./TrackCard"

export const TrackImporterScreen = (defineComponent({
    name: "TrackImporterScreen",
    setup(props, ctx) {
        const emitter = useDynamicsEmitter()

        const trackImporter = asyncComputed(() => { }, () => STATE.getTrackImporter(), {
            finalizer: v => v[DISPOSE]()
        })
        onUnmounted(() => trackImporter.value?.[DISPOSE]())
        const downloadOutputView = ref<HTMLElement>()

        async function importTracks() {
            if (trackImporter.value == null) return
            trackImporter.value.importTracks()
        }

        async function addAllToPlaylist() {
            emitter.modal(PlaylistInclusionForm, {
                contentProps: { editImported: true, class: "flex-fill" },
                props: {
                    class: "w-300 h-500",
                    cancelButton: "Close"
                }
            })
        }

        watch(() => trackImporter.value?.downloadOutput?.length, () => {
            if (!downloadOutputView.value) return
            const { scrollTop, clientHeight, scrollHeight } = downloadOutputView.value

            let isScrolled = scrollTop + clientHeight >= scrollHeight
            if (isScrolled) {
                nextTick(() => {
                    if (!downloadOutputView.value) return
                    downloadOutputView.value.scrollBy(0, 10000)
                })
            }
        })

        watch(() => trackImporter.value?.downloadedTracks, (tracks) => {
            if (tracks != null) STATE.onPlaylistsProbablyChanged.emit()
        })

        onMounted(() => {
            setTimeout(() => {
                downloadOutputView.value?.scrollBy(0, 10000)
            }, 10)
        })

        async function openSettings(event: MouseEvent) {
            async function setPlaylist(event: MouseEvent) {
                const url = ref(trackImporter.value!.settings.playlist ?? "")
                const popup = await emitter.popup(event.target as HTMLElement, () => (
                    <TextField focus placeholder="Playlist URL" class="w-200" vModel={url.value} />
                ), {
                    align: "over",
                    props: {
                        backdropCancels: true
                    }
                })

                if (popup && url.value) {
                    trackImporter.value!.setPlaylist({ playlist: url.value })
                }
            }

            function removePlaylist() {
                trackImporter.value!.setPlaylist({ playlist: null })
            }

            emitter.popup(event.target as HTMLElement, () => (
                <div class="flex column px-2 pt-2 pb-4">
                    <h3 class="m-0 mb-2">Downloader Integration</h3>
                    <div class="flex row center-cross mb-1">
                        {trackImporter.value!.settings.playlist == null ? <>
                            <small class="mr-2">Playlist:</small>
                            <Button onClick={setPlaylist} class="flex-fill" variant="success">Activate</Button>
                        </> : <>
                            <small>Playlist:</small>
                            <Button onClick={setPlaylist} clear class="flex-fill overflow-ellipsis nowrap">{trackImporter.value!.settings.playlist}</Button>
                            <Button onClick={removePlaylist} clear class="text-danger"> <Icon icon={mdiClose} /> </Button>
                        </>}
                    </div>
                    <small class="muted">
                        Before every import, the system will automatically
                        download all new tracks in the playlist. Path to
                        the downloader program is set using the <code>DOWNLOADER_PATH</code>
                        env variable and the type is set using <code>DOWNLOADER_TYPE</code>,
                        which can be either <code>"youtube-dl" | "yt-dlp"</code>
                    </small>
                </div>
            ), {
                align: "bottom-left",
                props: {
                    cancelButton: "Close",
                    variant: "black",
                    class: "w-300"
                }
            })
        }

        return () => (
            <Overlay show={trackImporter.loading} variant="clear" class="px-2">{{
                overlay: () => <LoadingIndicator />,
                default: () => trackImporter.value && <>
                    <div class="flex row center-cross gap-2">
                        <h3 class="m-0">Track importer</h3>
                        {trackImporter.value.isRunning && (
                            <div class="flex row gap-2 center-cross">
                                <Circle inline indeterminate />
                                Importing...
                            </div>
                        )}
                        <div class="absolute top-0 right-0">
                            <Button onClick={openSettings} clear> <Icon icon={mdiWrench} /> </Button>
                        </div>
                    </div>
                    <Transition name="as-slide-x">
                        {trackImporter.value.downloadedTracks?.size as number > 0 ? (
                            <div key="tracks" class="flex-fill border rounded">
                                <div class="absolute-fill scroll py-2 px-1">
                                    <div class="border rounded p-2 mx-2 mt-1 mb-2 flex row gap-2">
                                        Actions:
                                        <Button onClick={addAllToPlaylist} clear> <Icon icon={mdiPlaylistPlus} /> Add all to playlist </Button>
                                        <Button onClick={importTracks} clear> <Icon icon={mdiDownload} /> Import more </Button>
                                    </div>
                                    {[...trackImporter.value.downloadedTracks!.values()].map(track => (
                                        <TrackCard class="inline-block" track={track} key={track.id} />
                                    ))}
                                </div>
                            </div>
                        ) : trackImporter.value.downloadOutput ? (
                            <div key="output" class="flex-fill rounded bg-black-transparent">
                                <pre ref={downloadOutputView} class="absolute-fill scroll m-0 p-2" key="output">{trackImporter.value.downloadOutput.join("")}</pre>
                                {!trackImporter.value.isRunning && <div class="absolute bottom-0 right-0 p-2">
                                    <Button onClick={importTracks}>Import again</Button>
                                </div>}
                            </div>
                        ) : (
                            <div key="initial" class="flex-fill border flex center column rounded">
                                <h1 class="m-0"> <Icon icon={mdiCloudDownloadOutline} /> </h1>
                                <div class="mb-2"> No tracks imported </div>
                                <Button onClick={importTracks}>Import now</Button>
                            </div>
                        )}
                    </Transition>
                </>
            }}</Overlay>
        )
    }
}))

export function useTrackImporter() {
    const emitter = useDynamicsEmitter()

    return () => {
        return emitter.modal(TrackImporterScreen, {
            props: {
                cancelButton: "Close",
                class: "as-h-modal as-page"
            },
            contentProps: {
                class: "as-page flex column flex-fill gap-2"
            }
        })
    }
}