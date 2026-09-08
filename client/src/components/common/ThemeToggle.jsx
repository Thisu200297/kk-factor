import Icon from './Icon';
import { useTheme } from '../../hooks/useTheme';
import { classNames } from '../../utils/format';

const LABEL = { light: 'Light', dark: 'Dark', system: 'System' };
const GLYPH = { light: 'light_mode', dark: 'dark_mode', system: 'contrast' };

/**
 * Single button that cycles light → dark → system. The title and aria-label
 * announce what the next press will do, not the current state.
 */
export default function ThemeToggle({ withLabel = false, className = '' }) {
  const { mode, cycleMode } = useTheme();
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={cycleMode}
        className={classNames('btn-secondary w-full justify-start', className)}
        aria-label={`Appearance: ${LABEL[mode]}. Switch to ${LABEL[next]}`}
      >
        <Icon name={GLYPH[mode]} size={18} />
        Appearance: {LABEL[mode]}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={cycleMode}
      className={classNames('btn-icon', className)}
      title={`Appearance: ${LABEL[mode]} — switch to ${LABEL[next]}`}
      aria-label={`Appearance: ${LABEL[mode]}. Switch to ${LABEL[next]}`}
    >
      <Icon name={GLYPH[mode]} size={19} />
    </button>
  );
}
