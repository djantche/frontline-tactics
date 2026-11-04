import { readSettings } from "frontend/settings/game-settings";

const soundsPath = "/commander-wars/sounds/";

let context: AudioContext | undefined;
const buffers = new Map<string, Promise<AudioBuffer>>();

const getContext = () => {
  context ??= new AudioContext();

  // browsers suspend audio until the player interacts with the page
  if (context.state === "suspended") {
    void context.resume();
  }

  return context;
};

const loadSound = (name: string) => {
  let buffer = buffers.get(name);

  if (buffer === undefined) {
    buffer = fetch(`${soundsPath}${encodeURIComponent(name)}`)
      .then((response) => response.arrayBuffer())
      .then((data) => getContext().decodeAudioData(data));
    buffers.set(name, buffer);
  }

  return buffer;
};

export const preloadSounds = (names: string[]) => {
  for (const name of names) {
    void loadSound(name).catch(() => buffers.delete(name));
  }
};

type PlayOptions = { delayMs?: number; loop?: boolean };

/** Plays a sound effect. The returned function stops it early. */
export const playSound = (name: string, { delayMs = 0, loop = false }: PlayOptions = {}) => {
  const { soundVolume } = readSettings();
  let source: AudioBufferSourceNode | undefined;
  let isStopped = false;

  if (soundVolume > 0) {
    void loadSound(name)
      .then((buffer) => {
        if (isStopped) {
          return;
        }

        const audio = getContext();
        const gain = audio.createGain();
        gain.gain.value = soundVolume / 100;
        gain.connect(audio.destination);

        source = audio.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.connect(gain);
        source.start(audio.currentTime + delayMs / 1000);
      })
      .catch(() => buffers.delete(name));
  }

  return () => {
    isStopped = true;
    source?.stop();
  };
};

let music: HTMLAudioElement | undefined;

/** Loops a music track, or stops the music without a track. Does nothing for the same track. */
export const playMusic = (src: string | undefined) => {
  const url = src === undefined ? undefined : `/commander-wars/${src}`;

  if (url === undefined) {
    music?.pause();
    music = undefined;
    return;
  }

  if (music?.dataset.track === url) {
    return;
  }

  music?.pause();
  music = new Audio(url);
  music.dataset.track = url;
  music.loop = true;
  music.volume = readSettings().musicVolume / 100;

  // Refused until the player has interacted with the page: it starts with the next change.
  void music.play().catch(() => undefined);
};

export const setMusicVolume = (volume: number) => {
  if (music !== undefined) {
    music.volume = volume / 100;

    if (music.paused && volume > 0) {
      void music.play().catch(() => undefined);
    }
  }
};
