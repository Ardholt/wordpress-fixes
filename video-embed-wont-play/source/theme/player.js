const video = document.querySelector('video');
if (video) {
  const status = document.querySelector('#status');
  const button = document.querySelector('#play');
  const clock = document.querySelector('#clock');
  const failed = () => { status.textContent = 'This video could not play.'; };
  button.addEventListener('click', () => { video.play().catch(failed); });
  video.addEventListener('error', failed);
  video.addEventListener('playing', () => { status.textContent = 'Playing — welcome inside.'; });
  video.addEventListener('ended', () => { status.textContent = 'Thanks for watching.'; });
  video.addEventListener('timeupdate', () => {
    clock.textContent = `${video.currentTime.toFixed(1)} / ${video.duration.toFixed(1)} seconds`;
  });
}
