import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { PASSWORD_REQUIREMENTS, isPasswordValid } from '../lib/passwordPolicy';
import { formatAuthError } from '../lib/authErrors';
import { AUTH_BRIDGE_URL } from '../lib/authBridge';
import SocialSignInButtons from '../components/SocialSignInButtons';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import LegalDocScreen from './LegalDocScreen';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  initialMode?: 'signin' | 'signup';
  onSwitch?: () => void;
};

export default function UnifiedAuthScreen({ initialMode = 'signin', onSwitch }: Props) {
  const { theme, isDarkMode } = useTheme();
  const { t, lang, setLang } = useT();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme, insets, isDarkMode), [theme, insets, isDarkMode]);

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sub-screens
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // Email confirmation state
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength score (0 to 3) & hint
  const { strengthScore, strengthHint } = useMemo(() => {
    if (!password) return { strengthScore: 0, strengthHint: '' };
    const passedCount = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length;
    let score = 1;
    if (passedCount >= 4) score = 3;
    else if (passedCount >= 3) score = 2;

    let hint = t('auth.hintStrong') || 'Strong password! ✓';
    if (!PASSWORD_REQUIREMENTS[0].test(password)) {
      hint = t('auth.hintMinLength') || 'At least 8 characters needed';
    } else if (!PASSWORD_REQUIREMENTS[3].test(password)) {
      hint = t('auth.hintNumber') || 'Add a number';
    } else if (!PASSWORD_REQUIREMENTS[1].test(password)) {
      hint = t('auth.hintUppercase') || 'Add an uppercase letter';
    } else if (!PASSWORD_REQUIREMENTS[2].test(password)) {
      hint = t('auth.hintLowercase') || 'Add a lowercase letter';
    }

    return { strengthScore: score, strengthHint: hint };
  }, [password, t]);

  async function handleLogin() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('common.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    if (error) setError(formatAuthError(error, t));
    setLoading(false);
  }

  async function handleRegister() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('common.fillAllFields'));
      return;
    }
    if (!isPasswordValid(password)) {
      setError(t('auth.passwordFailsRequirements'));
      return;
    }
    setLoading(true);
    setError('');
    const bridgeUrl = `${AUTH_BRIDGE_URL}?target=${encodeURIComponent('bisco://auth-callback')}`;
    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: bridgeUrl,
      },
    });
    if (error) {
      setError(formatAuthError(error, t));
    } else if (data?.session) {
      // User auto logged in
    } else {
      setSignedUpEmail(trimmedEmail);
      setResendCooldown(60);
    }
    setLoading(false);
  }

  async function openEmailApp() {
    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL('message:');
      if (canOpen) {
        await Linking.openURL('message:');
        return;
      }
    }
    try {
      await Linking.openURL('mailto:');
    } catch {
      // Manual fallback
    }
  }

  async function handleResendEmail() {
    if (!signedUpEmail || resendCooldown > 0 || resending) return;
    setResending(true);
    setResendMessage('');
    try {
      const bridgeUrl = `${AUTH_BRIDGE_URL}?target=${encodeURIComponent('bisco://auth-callback')}`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signedUpEmail,
        options: {
          emailRedirectTo: bridgeUrl,
        },
      });
      if (error) {
        setResendMessage(error.message);
      } else {
        setResendMessage(t('auth.resendSuccess') || 'Verification email resent!');
        setResendCooldown(60);
      }
    } catch (err: any) {
      setResendMessage(err?.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  }

  if (legalDoc !== null) {
    return <LegalDocScreen type={legalDoc} onBack={() => setLegalDoc(null)} />;
  }

  if (showForgotPassword) {
    return <ForgotPasswordScreen onBack={() => setShowForgotPassword(false)} />;
  }

  // Redesigned Verification Screen ("Check Your Email")
  if (signedUpEmail) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.verificationContent}>
          <View style={styles.topBar}>
            <View style={styles.langPicker}>
              <TouchableOpacity
                onPress={() => setLang('en')}
                style={[styles.langChip, lang === 'en' && styles.langChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLang('tr')}
                style={[styles.langChip, lang === 'tr' && styles.langChipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, lang === 'tr' && styles.langChipTextActive]}>TR</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.verificationIconCircle}>
            <Text style={styles.verificationEmoji}>✉️</Text>
          </View>
          <Text style={styles.title}>{t('auth.checkEmailTitle') || 'Check Your Inbox'}</Text>
          <Text style={styles.verificationSubtitle}>
            {t('auth.checkEmailConfirm', { email: signedUpEmail }) || `We sent a secure activation link to:`}
          </Text>
          <Text style={styles.verificationEmailHighlight}>{signedUpEmail}</Text>

          <TouchableOpacity
            style={styles.openMailBtn}
            onPress={openEmailApp}
            activeOpacity={0.85}
          >
            <View style={styles.buttonInner}>
              <FontAwesome5 name="envelope-open-text" size={16} color="#FFFFFF" style={styles.mailBtnIcon} />
              <Text style={styles.openMailBtnText}>{t('auth.openMailApp') || 'Open Email App'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.resendSection}>
            <Text style={styles.resendHint}>{t('auth.didntReceiveEmail') || "Didn't receive the email? Check spam or"}</Text>
            <TouchableOpacity
              onPress={handleResendEmail}
              disabled={resendCooldown > 0 || resending}
              style={styles.resendBtn}
            >
              {resending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.resendBtnText, resendCooldown > 0 && styles.resendBtnDisabled]}>
                  {resendCooldown > 0
                    ? t('auth.resendInCooldown', { seconds: resendCooldown }) || `Resend in ${resendCooldown}s`
                    : t('auth.resendLink') || 'Resend confirmation link'}
                </Text>
              )}
            </TouchableOpacity>
            {resendMessage ? <Text style={styles.resendFeedback}>{resendMessage}</Text> : null}
          </View>

          <TouchableOpacity
            style={styles.backToSignInBtn}
            onPress={() => {
              setSignedUpEmail(null);
              setMode('signin');
            }}
          >
            <Text style={styles.backToSignInText}>← {t('auth.backToSignIn') || 'Back to Sign In'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selector Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.langPicker}>
            <TouchableOpacity
              onPress={() => setLang('en')}
              style={[styles.langChip, lang === 'en' && styles.langChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setLang('tr')}
              style={[styles.langChip, lang === 'tr' && styles.langChipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.langChipText, lang === 'tr' && styles.langChipTextActive]}>TR</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* A. Brand Hero Header with High-Resolution Logo */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Image
              source={require('../assets/bisco_logo_v1.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>BISCO</Text>
          <Text style={styles.brandTagline}>
            {t('auth.brandTagline') || "Complete health, nutrition & daily care for your companion."}
          </Text>
        </View>

        {/* Auth Main Card */}
        <View style={styles.authCard}>
          {/* B. Segmented Mode Pill Switcher */}
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, mode === 'signin' && styles.segmentBtnActive]}
              onPress={() => {
                setMode('signin');
                setError('');
                if (onSwitch && initialMode === 'signup') onSwitch();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, mode === 'signin' && styles.segmentTextActive]}>
                {t('auth.signIn')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, mode === 'signup' && styles.segmentBtnActive]}
              onPress={() => {
                setMode('signup');
                setError('');
                if (onSwitch && initialMode === 'signin') onSwitch();
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, mode === 'signup' && styles.segmentTextActive]}>
                {t('auth.createAccount')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* C. Social-First Priority: 1-Tap Apple & Google ABOVE Divider */}
          <SocialSignInButtons dividerPosition="bottom" />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* D. Input Fields & Focus States */}
          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>{t('auth.email')}</Text>
            <View style={[styles.inputContainer, focusedField === 'email' && styles.inputContainerFocused]}>
              <Feather
                name="mail"
                size={18}
                color={focusedField === 'email' ? theme.primary : theme.textMuted}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor={theme.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.inputLabel}>{t('auth.password')}</Text>
              {mode === 'signin' ? (
                <TouchableOpacity
                  onPress={() => setShowForgotPassword(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={[styles.inputContainer, focusedField === 'password' && styles.inputContainerFocused]}>
              <Feather
                name="lock"
                size={18}
                color={focusedField === 'password' ? theme.primary : theme.textMuted}
                style={styles.inputLeadingIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="••••••••••••"
                placeholderTextColor={theme.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather
                  name={showPassword ? 'eye' : 'eye-off'}
                  size={18}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Real-time Password Strength Meter (in Sign-Up mode) */}
          {mode === 'signup' && password.length > 0 ? (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBarsRow}>
                <View
                  style={[
                    styles.strengthBar,
                    strengthScore >= 1 &&
                      (strengthScore === 1 ? styles.barWeak : strengthScore === 2 ? styles.barMedium : styles.barStrong),
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    strengthScore >= 2 &&
                      (strengthScore === 2 ? styles.barMedium : styles.barStrong),
                  ]}
                />
                <View
                  style={[
                    styles.strengthBar,
                    strengthScore >= 3 && styles.barStrong,
                  ]}
                />
              </View>
              <View style={styles.strengthHintRow}>
                <Text
                  style={[
                    styles.strengthLabel,
                    strengthScore === 1
                      ? styles.textWeak
                      : strengthScore === 2
                      ? styles.textMedium
                      : styles.textStrong,
                  ]}
                >
                  {strengthScore === 1
                    ? t('auth.strengthWeak') || 'Weak'
                    : strengthScore === 2
                    ? t('auth.strengthMedium') || 'Medium'
                    : t('auth.strengthGreat') || 'Great'}
                </Text>
                <Text style={styles.strengthHintText}>{strengthHint}</Text>
              </View>
            </View>
          ) : null}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={mode === 'signin' ? handleLogin : handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'signin'
                  ? t('auth.signInToBisco') || `${t('auth.signIn')} →`
                  : t('auth.createFreeAccount') || `${t('auth.createAccount')} →`}
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms & Privacy Notice (in Sign-Up mode) */}
          {mode === 'signup' ? (
            <View style={styles.termsRow}>
              <Text style={styles.termsNotice}>{t('auth.termsNotice')}</Text>
              <View style={styles.termsLinks}>
                <TouchableOpacity onPress={() => setLegalDoc('terms')}>
                  <Text style={styles.termsLink}>{t('settings.termsOfService')}</Text>
                </TouchableOpacity>
                <Text style={styles.termsDivider}> · </Text>
                <TouchableOpacity onPress={() => setLegalDoc('privacy')}>
                  <Text style={styles.termsLink}>{t('settings.privacyPolicy')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>

        {/* F. Frictionless Guest Mode Preview */}
        <TouchableOpacity
          style={styles.guestRow}
          onPress={() => setShowGuestModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.guestText}>🌿 {t('auth.exploreGuest') || 'Explore Bisco as a Guest →'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Guest Mode Exploration Modal */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Text style={styles.modalIconText}>🐾</Text>
            </View>
            <Text style={styles.modalTitle}>{t('auth.guestModalTitle') || 'Welcome to Bisco!'}</Text>
            <Text style={styles.modalBody}>
              {t('auth.guestModalDesc') ||
                "Bisco gives you 24/7 AI vet triage, smart health tracking, and automated reminders for vaccines and parasite doses. Create your free account in seconds to personalize your pet's records."}
            </Text>
            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => {
                setShowGuestModal(false);
                setMode('signup');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>{t('auth.guestModalCta') || 'Create Free Account'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowGuestModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>{t('common.close') || 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ThemeTokens, insets = { top: 0, bottom: 0 }, isDarkMode = false) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#171512' : '#FAF7F2',
    },
    scrollContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top + 16, 44),
      paddingBottom: Math.max(insets.bottom + 20, 32),
    },
    topBar: {
      width: '100%',
      maxWidth: 420,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: 12,
    },
    langPicker: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#25211B' : '#EFEAE1',
      borderRadius: 14,
      padding: 3,
      borderWidth: 1,
      borderColor: isDarkMode ? '#3A332A' : '#E2DCD1',
    },
    langChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
    },
    langChipActive: {
      backgroundColor: theme.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    langChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
    },
    langChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    brandHero: {
      alignItems: 'center',
      marginBottom: 20,
    },
    logoBadge: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: isDarkMode ? '#28231D' : '#FFF9F0',
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#4D3627' : '#F4DEC8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
    logoImage: {
      width: 48,
      height: 48,
    },
    brandTitle: {
      fontSize: 22,
      fontWeight: '900',
      letterSpacing: 2.2,
      color: theme.textDark,
      marginBottom: 4,
    },
    brandTagline: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      paddingHorizontal: 16,
      lineHeight: 18,
    },
    authCard: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: isDarkMode ? '#1E1B17' : '#FFFFFF',
      borderRadius: 26,
      padding: 22,
      borderWidth: 1,
      borderColor: isDarkMode ? '#332C24' : '#EFE9DF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 4,
    },
    segmentedContainer: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#292520' : '#F2ECE1',
      borderRadius: 16,
      padding: 4,
      marginBottom: 16,
      width: '100%',
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: {
      backgroundColor: isDarkMode ? '#3D362E' : '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textMuted,
    },
    segmentTextActive: {
      color: theme.primary,
      fontWeight: '800',
    },
    errorText: {
      color: theme.allergenText,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 14,
      textAlign: 'center',
      backgroundColor: isDarkMode ? '#3E1D1D' : '#FEE2E2',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDarkMode ? '#662B2B' : '#FECACA',
    },
    formGroup: {
      width: '100%',
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    passwordLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    forgotText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.primary,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDarkMode ? '#27231E' : '#FAF8F5',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#383229' : '#E8E2D5',
      paddingHorizontal: 14,
      height: 52,
    },
    inputContainerFocused: {
      borderColor: theme.primary,
      backgroundColor: isDarkMode ? '#2D2721' : '#FFFFFF',
    },
    inputLeadingIcon: {
      marginRight: 10,
    },
    textInput: {
      flex: 1,
      fontSize: 15,
      color: theme.textDark,
      paddingVertical: 0,
    },
    eyeBtn: {
      padding: 6,
    },
    strengthContainer: {
      width: '100%',
      marginBottom: 16,
      paddingHorizontal: 2,
    },
    strengthBarsRow: {
      flexDirection: 'row',
      gap: 6,
      marginBottom: 6,
    },
    strengthBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDarkMode ? '#332D25' : '#E8E2D5',
    },
    barWeak: {
      backgroundColor: '#E06D44',
    },
    barMedium: {
      backgroundColor: '#F59E0B',
    },
    barStrong: {
      backgroundColor: '#10B981',
    },
    strengthHintRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    strengthLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    strengthHintText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    textWeak: {
      color: '#E06D44',
    },
    textMedium: {
      color: '#F59E0B',
    },
    textStrong: {
      color: '#10B981',
    },
    primaryButton: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: 16,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 12,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    termsRow: {
      alignItems: 'center',
      marginTop: 4,
    },
    termsNotice: {
      fontSize: 11,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 15,
    },
    termsLinks: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    termsLink: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.primary,
    },
    termsDivider: {
      color: theme.textMuted,
      fontSize: 11,
    },
    guestRow: {
      marginTop: 20,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    guestText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.2,
    },
    // Verification Screen Styles
    verificationContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    verificationIconCircle: {
      width: 76,
      height: 76,
      borderRadius: 28,
      backgroundColor: isDarkMode ? '#28231D' : '#FFF9F0',
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#4D3627' : '#F4DEC8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    verificationEmoji: {
      fontSize: 34,
    },
    title: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.textDark,
      marginBottom: 8,
      textAlign: 'center',
    },
    verificationSubtitle: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    verificationEmailHighlight: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.primary,
      marginTop: 4,
      marginBottom: 24,
      textAlign: 'center',
    },
    openMailBtn: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.primary,
      borderRadius: 16,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    openMailBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    mailBtnIcon: {
      marginRight: 8,
    },
    buttonInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resendSection: {
      alignItems: 'center',
      marginBottom: 28,
      paddingHorizontal: 20,
    },
    resendHint: {
      fontSize: 13,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: 6,
    },
    resendBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    resendBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.primary,
    },
    resendBtnDisabled: {
      color: theme.textMuted,
    },
    resendFeedback: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '600',
      color: theme.moodSelBorder,
    },
    backToSignInBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    backToSignInText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textMuted,
    },
    // Guest Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: isDarkMode ? '#221E19' : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDarkMode ? '#3A332B' : '#EFE8DE',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    modalIconBox: {
      width: 56,
      height: 56,
      borderRadius: 20,
      backgroundColor: isDarkMode ? '#302921' : '#FFF5E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    modalIconText: {
      fontSize: 26,
    },
    modalTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: theme.textDark,
      marginBottom: 8,
      textAlign: 'center',
    },
    modalBody: {
      fontSize: 14,
      color: theme.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 20,
    },
    modalPrimaryBtn: {
      width: '100%',
      backgroundColor: theme.primary,
      borderRadius: 14,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    modalPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
    modalCloseBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    modalCloseBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textMuted,
    },
  });
}
