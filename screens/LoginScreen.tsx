import UnifiedAuthScreen from './UnifiedAuthScreen';

type Props = {
  onSwitch: () => void;
};

export default function LoginScreen({ onSwitch }: Props) {
  return <UnifiedAuthScreen initialMode="signin" onSwitch={onSwitch} />;
}
