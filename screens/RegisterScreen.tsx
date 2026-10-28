import UnifiedAuthScreen from './UnifiedAuthScreen';

type Props = {
  onSwitch: () => void;
};

export default function RegisterScreen({ onSwitch }: Props) {
  return <UnifiedAuthScreen initialMode="signup" onSwitch={onSwitch} />;
}
