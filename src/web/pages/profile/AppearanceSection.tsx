import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_CHOICES, type ThemeChoice, themeChoiceLabels, useTheme } from '../../shell/theme';
import { RadioChip, RadioGroup } from '../../ui';
import { ProfileSection } from './ProfileSection';

const icons: Record<ThemeChoice, typeof Sun> = { system: Monitor, light: Sun, dark: Moon };

/** The theme on this device, the same choice as the Você menu, with the same toast. */
export function AppearanceSection() {
  const theme = useTheme();
  return (
    <ProfileSection
      id="profile-appearance"
      label="Aparência"
      description="Sistema segue o tema do seu dispositivo. O editor, os desenhos e as miniaturas acompanham."
    >
      <RadioGroup label="Tema" value={theme.choice} onChange={(value) => theme.choose(value as ThemeChoice)}>
        {THEME_CHOICES.map((choice) => {
          const Icon = icons[choice];
          return (
            <RadioChip key={choice} value={choice}>
              <Icon size={16} aria-hidden="true" />
              {themeChoiceLabels[choice]}
            </RadioChip>
          );
        })}
      </RadioGroup>
    </ProfileSection>
  );
}
