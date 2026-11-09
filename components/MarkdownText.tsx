import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { ThemeTokens } from '../lib/themes';

type Props = {
  children: string;
};

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string };

function parseInlineMarkdown(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: line.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', value: raw });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'text', value: line.slice(lastIndex) });
  }

  return tokens;
}

export default function MarkdownText({ children }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const blocks = useMemo(() => {
    const rawLines = (children || '').replace(/\r\n/g, '\n').split('\n');
    return rawLines;
  }, [children]);

  const renderInline = (text: string, isHeader = false) => {
    const tokens = parseInlineMarkdown(text);
    return tokens.map((tok, idx) => {
      if (tok.type === 'bold') {
        return (
          <Text key={idx} style={styles.boldText}>
            {tok.value}
          </Text>
        );
      }
      if (tok.type === 'italic') {
        return (
          <Text key={idx} style={styles.italicText}>
            {tok.value}
          </Text>
        );
      }
      if (tok.type === 'code') {
        return (
          <Text key={idx} style={styles.codeText}>
            {tok.value}
          </Text>
        );
      }
      return (
        <Text key={idx} style={isHeader ? styles.headerText : undefined}>
          {tok.value}
        </Text>
      );
    });
  };

  return (
    <View style={styles.container}>
      {blocks.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) {
          return <View key={index} style={styles.spacer} />;
        }

        // Heading (#, ##, ###)
        const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
        if (headingMatch) {
          return (
            <Text key={index} style={styles.headerText}>
              {renderInline(headingMatch[2], true)}
            </Text>
          );
        }

        // Bullet list (-, *, •)
        const bulletMatch = line.match(/^([-*•])\s+(.*)$/);
        if (bulletMatch) {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bodyText}>{renderInline(bulletMatch[2])}</Text>
            </View>
          );
        }

        // Numbered list (1., 2., etc.)
        const numberedMatch = line.match(/^(\d+\.)\s+(.*)$/);
        if (numberedMatch) {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletNumber}>{numberedMatch[1]}</Text>
              <Text style={styles.bodyText}>{renderInline(numberedMatch[2])}</Text>
            </View>
          );
        }

        // Standard paragraph line
        return (
          <Text key={index} style={styles.bodyText}>
            {renderInline(line)}
          </Text>
        );
      })}
    </View>
  );
}

function makeStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    container: {
      gap: 4,
    },
    spacer: {
      height: 4,
    },
    headerText: {
      fontSize: 15.5,
      fontWeight: '800',
      color: theme.textDark,
      lineHeight: 22,
      marginTop: 4,
      marginBottom: 2,
    },
    bodyText: {
      flex: 1,
      fontSize: 14.5,
      lineHeight: 21,
      color: theme.textDark,
    },
    boldText: {
      fontWeight: '700',
      color: theme.textDark,
    },
    italicText: {
      fontStyle: 'italic',
    },
    codeText: {
      fontFamily: 'monospace',
      backgroundColor: theme.surfaceAlt,
      color: theme.primary,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingLeft: 4,
      gap: 8,
    },
    bulletDot: {
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '800',
      color: theme.primary,
    },
    bulletNumber: {
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '700',
      color: theme.primary,
      minWidth: 18,
    },
  });
}
