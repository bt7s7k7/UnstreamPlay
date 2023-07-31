# UnstreamPlay
Self-hosted music streaming site.

![Screenshot of the playlist screen](https://github.com/bt7s7k7/UnstreamPlay/assets/26630940/becca301-c833-4061-8b98-89234a5ae775)

## Features

  - Music playback over network
  - Automatic parsing of track metadata
  - Multiple playlists
  - Speaker mode - multiple users can control one playback device
  - Youtube sync - automatically download tracks from a YouTube playlist with yt-dlp

## Installation

  1. Install UCPeM dependencies: `ucpem install`
  2. Backend:
     1. Install backend packages: `yarn`
     2. Build backend: `yarn build`
  3. Frontend: `cd frontend`
     1. Install frontend packages: `yarn`
     2. Build frontend: `yarn build`
  4. Configure - create a `.env.local` file
     ```bash
     # Server port
     PORT=8080
     # Location of data folder
     DATA_PATH=/home/user/.unstream
     # YouTube API key for track metadata
     API_KEY=[...]
     ```
  5. Run: `yarn start` 

