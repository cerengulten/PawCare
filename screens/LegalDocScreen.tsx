import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { useT } from '../lib/LanguageContext';
import { ThemeTokens } from '../lib/themes';
import SwipeBackWrapper from '../components/SwipeBackWrapper';

type DocType = 'terms' | 'privacy';

type Props = {
  type: DocType;
  onBack: () => void;
};

export default function LegalDocScreen({ type, onBack }: Props) {
  const { theme } = useTheme();
  const { t, lang } = useT();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const isTerms = type === 'terms';
  const isTr = lang === 'tr';
  const isIt = lang === 'it';

  const title = isTerms ? t('settings.termsOfService') : t('settings.privacyPolicy');
  const lastUpdated = isTr ? 'Son güncelleme: 26 Ekim 2026' : isIt ? 'Ultimo aggiornamento: 26 ottobre 2026' : 'Last updated: October 26, 2026';

  const content = isTerms ? (
    isTr ? (
      <>
        <Text style={styles.sectionHeader}>1. Hizmet Koşullarının Kabulü</Text>
        <Text style={styles.paragraph}>
          Bisco uygulamasını kullanarak bu Kullanım Koşullarını ve Gizlilik Politikamızı kabul etmiş olursunuz.
          Bu koşulları kabul etmiyorsanız lütfen uygulamayı kullanmayınız.
        </Text>

        <Text style={styles.sectionHeader}>2. Tıbbi ve Veterinerlik Sorumluluk Reddi</Text>
        <Text style={styles.paragraph}>
          Bisco uygulaması ve yapay zeka asistanı yalnızca genel bilgi, takip ve evcil hayvan bakım desteği sağlamak
          amacıyla sunulmaktadır. Bisco bir veteriner hekimi değildir, tıbbi teşhis koymaz veya tedavi reçete etmez.
          Evcil hayvanınızın sağlığıyla ilgili tüm şüphelerde, acil durumlarda ve ilaç kullanımlarında her zaman lisanslı bir
          veteriner hekime başvurmalısınız.
        </Text>

        <Text style={styles.sectionHeader}>3. Kullanıcı Hesapları ve Güvenlik</Text>
        <Text style={styles.paragraph}>
          Hesap bilgilerinizin ve şifrenizin gizliliğini korumak sizin sorumluluğunuzdadır. Hesabınız altında gerçekleşen
          tüm faaliyetlerden siz sorumlu olursunuz. Hesabınızı ve tüm verilerinizi dilediğiniz zaman Ayarlar bölümünden
          kalıcı olarak silebilirsiniz.
        </Text>

        <Text style={styles.sectionHeader}>4. Kabul Edilebilir Kullanım</Text>
        <Text style={styles.paragraph}>
          Uygulamayı yürürlükteki tüm yasalara uygun olarak ve diğer kullanıcıların haklarına saygı göstererek kullanmayı
          kabul edersiniz. Zararlı yazılım yaymak, sistemi manipüle etmek veya yetkisiz erişim sağlamaya çalışmak kesinlikle
          yasaktır.
        </Text>

        <Text style={styles.sectionHeader}>5. İletişim</Text>
        <Text style={styles.paragraph}>
          Kullanım koşullarıyla ilgili sorularınız için bizimle support@bisco.app adresinden iletişime geçebilirsiniz.
        </Text>
      </>
    ) : (
      <>
        <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using Bisco, you agree to be bound by these Terms of Service and our Privacy Policy.
          If you do not agree, please do not use the application.
        </Text>

        <Text style={styles.sectionHeader}>2. Veterinary & Medical Disclaimer</Text>
        <Text style={styles.paragraph}>
          Bisco and its AI assistant are intended solely for general tracking, habit logging, and informational pet care.
          Bisco is NOT a veterinarian, does not provide medical diagnoses, and cannot prescribe medication. Always consult
          a licensed veterinarian for any medical symptoms, emergency triage, medication dosages, or health concerns.
        </Text>

        <Text style={styles.sectionHeader}>3. User Accounts & Security</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials. You may permanently delete
          your account and all associated pet data at any time from the app Settings.
        </Text>

        <Text style={styles.sectionHeader}>4. Acceptable Use</Text>
        <Text style={styles.paragraph}>
          You agree to use Bisco only for lawful pet-care purposes. Any attempt to abuse, reverse engineer, or compromise
          the integrity of the app or its services is strictly prohibited.
        </Text>

        <Text style={styles.sectionHeader}>5. Contact</Text>
        <Text style={styles.paragraph}>
          For inquiries regarding these Terms, contact us at support@bisco.app.
        </Text>
      </>
    )
  ) : (
    isTr ? (
      <>
        <Text style={styles.sectionHeader}>1. Toplanan Bilgiler</Text>
        <Text style={styles.paragraph}>
          Bisco, evcil hayvan bakım deneyiminizi sağlamak amacıyla aşağıdaki bilgileri toplar:
        </Text>
        <Text style={styles.bullet}>• Hesap bilgileri: E-posta adresi, kullanıcı adı ve ad-soyad.</Text>
        <Text style={styles.bullet}>• Evcil hayvan profilleri: İsim, tür, ırk, doğum tarihi, kilo ve fotoğraflar.</Text>
        <Text style={styles.bullet}>• Bakım kayıtları: Beslenme, su, yürüyüş, aşılar, ruh hali ve sağlık takipleri.</Text>
        <Text style={styles.bullet}>• Yakın veteriner araması için konum verisi (yalnızca siz izin verdiğinizde).</Text>

        <Text style={styles.sectionHeader}>2. Verilerin Kullanımı</Text>
        <Text style={styles.paragraph}>
          Verileriniz yalnızca evcil hayvanınızın bakım geçmişini tutmak, hatırlatmalar oluşturmak ve kişiselleştirilmiş
          içerik sunmak için kullanılır. Verileriniz asla üçüncü taraflara satılmaz veya pazarlama amacıyla paylaşılmaz.
        </Text>

        <Text style={styles.sectionHeader}>3. Veri Güvenliği ve Saklama</Text>
        <Text style={styles.paragraph}>
          Tüm kullanıcı verileri şifrelenmiş güvenli sunucularda (Supabase / PostgreSQL) saklanmaktadır. Satır Düzeyinde
          Güvenlik (RLS) politikaları ile verilerinize yalnızca siz erişebilirsiniz.
        </Text>

        <Text style={styles.sectionHeader}>4. Haklarınız ve Veri Silme</Text>
        <Text style={styles.paragraph}>
          Tüm verilerinizi inceleme, güncelleme ve silme hakkına sahipsiniz. Ayarlar menüsünden "Hesabı Sil" seçeneğini
          kullanarak hesabınızı ve tüm evcil hayvan kayıtlarınızı kalıcı olarak anında silebilirsiniz.
        </Text>

        <Text style={styles.sectionHeader}>5. İletişim</Text>
        <Text style={styles.paragraph}>
          Gizlilik uygulamalarımızla ilgili her türlü soru için support@bisco.app adresinden bize ulaşabilirsiniz.
        </Text>
      </>
    ) : (
      <>
        <Text style={styles.sectionHeader}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          To provide your pet care tracking experience, Bisco collects:
        </Text>
        <Text style={styles.bullet}>• Account Information: Email, username, and full name.</Text>
        <Text style={styles.bullet}>• Pet Profiles: Name, species, breed, birth date, weight, and photos.</Text>
        <Text style={styles.bullet}>• Care Logs: Feeding, hydration, walks, vaccines, mood, and health symptom logs.</Text>
        <Text style={styles.bullet}>• Location Data: Optional, used solely to discover nearby veterinary clinics when you tap search.</Text>

        <Text style={styles.sectionHeader}>2. How We Use Your Data</Text>
        <Text style={styles.paragraph}>
          Your data is used exclusively to deliver personalized pet care tracking, reminders, and health summaries.
          We never sell, rent, or monetize your personal data with third parties.
        </Text>

        <Text style={styles.sectionHeader}>3. Data Storage & Security</Text>
        <Text style={styles.paragraph}>
          Your records are stored securely with encrypted database authentication and Row Level Security (RLS) policies,
          ensuring only your authenticated account can access your pet's data.
        </Text>

        <Text style={styles.sectionHeader}>4. Your Rights & Account Deletion</Text>
        <Text style={styles.paragraph}>
          You retain full control over your data. You may edit, export, or permanently delete your account and all associated
          pet records at any time directly through the in-app Settings menu.
        </Text>

        <Text style={styles.sectionHeader}>5. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about our Privacy Policy, contact us at support@bisco.app.
        </Text>
      </>
    )
  );

  return (
    <SwipeBackWrapper onBack={onBack}>
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack} style={styles.backRow}>
          <Text style={styles.backText}>‹ {t('common.back')}</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.updatedDate}>{lastUpdated}</Text>
          <View style={styles.card}>{content}</View>
        </ScrollView>
      </View>
    </SwipeBackWrapper>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    backRow: {
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 8,
    },
    backText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
    content: {
      padding: 16,
      paddingBottom: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.textDark,
      marginBottom: 4,
    },
    updatedDate: {
      fontSize: 13,
      color: theme.textMuted,
      marginBottom: 16,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: theme.radiiCard,
      borderWidth: 0.5,
      borderColor: theme.border,
      padding: 20,
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textDark,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 14,
      color: theme.textDark,
      lineHeight: 22,
      marginBottom: 8,
    },
    bullet: {
      fontSize: 14,
      color: theme.textDark,
      lineHeight: 22,
      paddingLeft: 8,
      marginBottom: 4,
    },
  });
}
