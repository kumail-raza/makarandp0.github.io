import { createButton, createDiv, createLabeledStat } from './controls.js';
import { Waveform } from './waveform.js';
import { createTrackStats } from './createTrackStats.js';

export const trackStatUpdater = new Map();

export function updateTrackStats({ trackId, trackSid, bytesSent, bytesReceived, trackType }) {
  const isRemote = trackType === 'remoteVideoTrackStats' || trackType === 'remoteAudioTrackStats';
  trackStatUpdater.forEach((updateStats, track) => {
    if (track.sid === trackSid || track.id === trackId) {
      updateStats('bytes', isRemote ? bytesReceived : bytesSent);
    }
  });
}

/**
 * Attach the AudioTrack to the HTMLAudioElement and start the Waveform.
 */
export function attachAudioTrack(track, container) {
  var audioElement = container.appendChild(track.attach());
  const waveform = new Waveform();
  waveform.setStream(audioElement.srcObject);
  const canvasContainer = createDiv(container, 'canvasContainer');
  canvasContainer.appendChild(waveform.element);
  return audioElement;
}

// Attach the Track to the DOM.
export function renderTrack({ track, container, shouldAutoAttach }) {
  const trackContainerId = track.sid || track.id;
  const trackContainer = createDiv(container, track.kind + 'Container', trackContainerId);
  const { updateStats } = createTrackStats(track, trackContainer);
  trackStatUpdater.set(track, updateStats);

  const controlContainer = createDiv(trackContainer, 'trackControls');

  createButton('update', controlContainer, () => updateStats('update'));

  let mediaControls = null;
  const attachDetachBtn = createButton('attach', controlContainer, () => {
    if (mediaControls) {
      // track is already attached.
      track.detach().forEach(el => el.remove());
      mediaControls.remove();
      mediaControls = null;
      attachDetachBtn.text('attach');
    } else {
      // track is detached.
      mediaControls = createDiv(trackContainer, 'mediaControls');
      let audioVideoElement = null;
      if (track.kind === 'audio') {
        audioVideoElement = attachAudioTrack(track, mediaControls);
      } else {
        audioVideoElement = track.attach();
        mediaControls.appendChild(audioVideoElement);
      }
      createButton('pause', mediaControls, () => audioVideoElement.pause());
      createButton('play', mediaControls, () => audioVideoElement.play());
      createButton('update', mediaControls, () => updateMediaElementState('update'));
      const isPlaying = createLabeledStat(mediaControls, 'playing', { className: 'enabled', useValueToStyle: true });
      const volume = createLabeledStat(mediaControls, 'volume', { className: 'bytes', useValueToStyle: true });
      // eslint-disable-next-line no-inner-declarations
      function updateMediaElementState() {
        isPlaying.setText(!audioVideoElement.paused);
        volume.setText(audioVideoElement.volume);
      }

      audioVideoElement.addEventListener('pause', () => updateMediaElementState('pause'));
      audioVideoElement.addEventListener('play', () => updateMediaElementState('play'));
      attachDetachBtn.text('detach');
      updateMediaElementState('initial');
    }
  });

  if (shouldAutoAttach) {
    attachDetachBtn.click();
  }
  updateStats('initial');
  return { trackContainer };
}
