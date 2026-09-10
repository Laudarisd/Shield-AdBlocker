// YouTube serves ads and videos through shared infrastructure, so this script
// reacts only when YouTube marks its player as showing an ad. It uses scoped
// observers and events—no permanent polling timer.

const YOUTUBE_SKIP_SELECTORS = [
  ".ytp-ad-skip-button-modern",
  ".ytp-ad-skip-button",
  ".ytp-skip-ad-button",
  "button.ytp-ad-skip-button-container",
];

let youtubeActivePlayer: HTMLElement | null = null;
let youtubePlayerObserver: MutationObserver | null = null;
let youtubeDiscoveryObserver: MutationObserver | null = null;
let youtubeAnimationFrame: number | null = null;

function isYouTubeBlockingEnabled(): boolean {
  const root = document.documentElement;
  return (
    !root.classList.contains("simple-shield-disabled") &&
    !root.classList.contains("simple-shield-youtube-disabled")
  );
}

function skipYouTubeAd(): void {
  const player = youtubeActivePlayer;
  if (!isYouTubeBlockingEnabled() || player === null || !player.classList.contains("ad-showing")) {
    return;
  }

  for (const selector of YOUTUBE_SKIP_SELECTORS) {
    const button = player.querySelector<HTMLElement>(selector);
    if (button !== null) {
      button.click();
      break;
    }
  }

  const video = player.querySelector<HTMLVideoElement>("video");
  if (video !== null && Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = Math.max(0, video.duration - 0.05);
  }
}

function queueYouTubeAdCheck(): void {
  if (youtubeAnimationFrame !== null) return;
  youtubeAnimationFrame = window.requestAnimationFrame(() => {
    youtubeAnimationFrame = null;
    skipYouTubeAd();
  });
}

function detachYouTubePlayer(): void {
  youtubePlayerObserver?.disconnect();
  youtubePlayerObserver = null;
  youtubeActivePlayer?.removeEventListener("durationchange", queueYouTubeAdCheck, true);
  youtubeActivePlayer?.removeEventListener("loadedmetadata", queueYouTubeAdCheck, true);
  youtubeActivePlayer = null;
}

function attachToYouTubePlayer(): void {
  const nextPlayer = document.querySelector<HTMLElement>("#movie_player");
  if (nextPlayer === youtubeActivePlayer) {
    queueYouTubeAdCheck();
    return;
  }

  detachYouTubePlayer();

  if (nextPlayer === null) {
    if (youtubeDiscoveryObserver === null) {
      youtubeDiscoveryObserver = new MutationObserver(attachToYouTubePlayer);
      youtubeDiscoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
    return;
  }

  youtubeDiscoveryObserver?.disconnect();
  youtubeDiscoveryObserver = null;
  youtubeActivePlayer = nextPlayer;
  youtubePlayerObserver = new MutationObserver(queueYouTubeAdCheck);
  youtubePlayerObserver.observe(nextPlayer, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
  nextPlayer.addEventListener("durationchange", queueYouTubeAdCheck, true);
  nextPlayer.addEventListener("loadedmetadata", queueYouTubeAdCheck, true);
  queueYouTubeAdCheck();
}

document.addEventListener("yt-navigate-finish", attachToYouTubePlayer);
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.enabled !== undefined || changes.skipYouTubeAds !== undefined)) {
    queueYouTubeAdCheck();
  }
});

attachToYouTubePlayer();
