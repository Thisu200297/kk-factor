import Icon from '../common/Icon';
import { usePlayer } from '../../hooks/usePlayer';
import { classNames } from '../../utils/format';

export default function VolumeSlider({ className = '', showIcon = true }) {
  const { volume, muted, setVolume, toggleMute } = usePlayer();
  const level = muted ? 0 : volume;

  const iconName =
    level === 0 ? 'volume_off' : level < 0.34 ? 'volume_mute' : level < 0.67 ? 'volume_down' : 'volume_up';

  return (
    <div className={classNames('flex items-center gap-2', className)}>
      {showIcon && (
        <button type="button" onClick={toggleMute} className="btn-icon !h-8 !w-8" aria-label={muted ? 'Unmute' : 'Mute'}>
          <Icon name={iconName} size={20} />
        </button>
      )}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={level}
        onChange={(event) => setVolume(Number.parseFloat(event.target.value))}
        aria-label="Volume"
        className="kk-range w-20 lg:w-24"
        style={{
          background: `linear-gradient(to right, rgb(var(--primary)) ${level * 100}%, rgb(var(--surface-3)) ${
            level * 100
          }%)`,
        }}
      />
    </div>
  );
}
