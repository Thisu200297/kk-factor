import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import { usePlayer } from '../../hooks/usePlayer';
import { REPEAT_MODES, STREAM_STATE } from '../../utils/constants';
import { classNames } from '../../utils/format';

export default function PlayerControls({ size = 'md' }) {
  const {
    currentTrack,
    musicState,
    isMusicPlaying,
    toggleMusic,
    playNext,
    playPrevious,
    shuffle,
    toggleShuffle,
    repeat,
    cycleRepeat,
  } = usePlayer();

  const big = size === 'lg';
  const disabled = !currentTrack;

  return (
    <div className={classNames('flex items-center', big ? 'gap-3 md:gap-5' : 'gap-1 md:gap-2')}>
      <button
        type="button"
        onClick={toggleShuffle}
        disabled={disabled}
        aria-pressed={shuffle}
        aria-label="Shuffle"
        title="Shuffle"
        className={classNames('btn-icon', shuffle && 'text-primary')}
      >
        <Icon name="shuffle" size={big ? 22 : 20} />
      </button>

      <button
        type="button"
        onClick={playPrevious}
        disabled={disabled}
        aria-label="Previous track"
        className="btn-icon"
      >
        <Icon name="skip_previous" size={big ? 30 : 26} filled />
      </button>

      <button
        type="button"
        onClick={toggleMusic}
        disabled={disabled}
        aria-label={isMusicPlaying ? 'Pause' : 'Play'}
        className={classNames(
          'flex items-center justify-center rounded-full bg-primary text-on-primary transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100',
          big ? 'h-14 w-14' : 'h-10 w-10'
        )}
      >
        {musicState === STREAM_STATE.LOADING ? (
          <Spinner size={big ? 24 : 18} />
        ) : (
          <Icon name={isMusicPlaying ? 'pause' : 'play_arrow'} size={big ? 32 : 24} filled />
        )}
      </button>

      <button
        type="button"
        onClick={() => playNext(false)}
        disabled={disabled}
        aria-label="Next track"
        className="btn-icon"
      >
        <Icon name="skip_next" size={big ? 30 : 26} filled />
      </button>

      <button
        type="button"
        onClick={cycleRepeat}
        disabled={disabled}
        aria-label={`Repeat: ${repeat}`}
        title={`Repeat: ${repeat}`}
        className={classNames('btn-icon', repeat !== REPEAT_MODES.OFF && 'text-primary')}
      >
        <Icon name={repeat === REPEAT_MODES.ONE ? 'repeat_one' : 'repeat'} size={big ? 22 : 20} />
      </button>
    </div>
  );
}
