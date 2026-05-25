import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Spacing, Typography } from '../../shared/theme';
import { NeonButton, Input } from '../../shared/ui';
import { useLogin } from '../../features/auth/model/useAuth';
import type { AuthStackParamList } from '../../app/navigation/types';
import { DEMO_USERS } from '../../entities/user/model/demoUsers';

type Nav = StackNavigationProp<AuthStackParamList, 'Login'>;

const ROLE_LABELS = {
    admin: 'Админ',
    manager: 'Менеджер',
    employee: 'Сотрудник',
} as const;

export const LoginScreen = memo(() => {
    const navigation = useNavigation<Nav>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { mutate: login, isPending } = useLogin();

    const titleY = useSharedValue(-30);
    const titleOpacity = useSharedValue(0);

    React.useEffect(() => {
        titleY.value = withSpring(0, { damping: 12 });
        titleOpacity.value = withDelay(100, withSpring(1));
    }, [titleY, titleOpacity]);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: titleY.value }],
        opacity: titleOpacity.value,
    }));

    const validate = useCallback((): boolean => {
        const errs: Record<string, string> = {};
        if (!email.trim()) errs.email = 'Введите email';
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Введите корректный email';
        if (!password) errs.password = 'Введите пароль';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [email, password]);

    const handleLogin = useCallback(() => {
        if (!validate()) return;
        login(
            { email: email.trim().toLowerCase(), password },
            {
                onError: (err) => {
                    Alert.alert('Ошибка входа', err.message);
                },
            }
        );
    }, [email, password, validate, login]);

    return (
        <SafeAreaView style={styles.safe}>
            <LinearGradient
                colors={['#05050f', '#0a0a1e', '#05050f']}
                style={StyleSheet.absoluteFill}
            />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.kav}
            >
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.header, titleStyle]}>
                        <View style={styles.logoContainer}>
                            <LinearGradient
                                colors={['#00d4ff', '#0066cc']}
                                style={styles.logoBg}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            />
                            <Text style={styles.logoText}>TT</Text>
                        </View>
                        <Text style={Typography.h1}>TimeTrack Pro</Text>
                        <Text style={[Typography.bodySmall, styles.subtitle]}>
                            Контроль времени и продуктивности
                        </Text>
                    </Animated.View>

                    <View style={styles.form}>
                        <Input
                            label="Email"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="you@example.com"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            error={errors.email}
                        />
                        <Input
                            label="Пароль"
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            secureTextEntry
                            error={errors.password}
                        />
                        <NeonButton
                            onPress={handleLogin}
                            label="Войти"
                            loading={isPending}
                            fullWidth
                            style={styles.btn}
                        />
                        <View style={styles.demoBox}>
                            <Text style={[Typography.caption, styles.demoTitle]}>Демо пользователи</Text>
                            {DEMO_USERS.map((u) => (
                                <Text key={u.id} style={[Typography.bodySmall, styles.demoLine]}>
                                    {ROLE_LABELS[u.role]}: {u.email} / {u.password}
                                </Text>
                            ))}
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            style={styles.link}
                        >
                            <Text style={Typography.label}>
                                Нет аккаунта?{' '}
                                <Text style={{ color: Colors.neonBlue, fontWeight: '700' }}>
                                    Регистрация
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
});

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    kav: { flex: 1 },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxxl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        marginBottom: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: Colors.neonBlue,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    },
    logoBg: {
        ...StyleSheet.absoluteFillObject,
    },
    logoText: {
        color: '#000',
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2,
    },
    subtitle: {
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    form: {},
    btn: { marginTop: Spacing.sm },
    demoBox: {
        marginTop: Spacing.lg,
        padding: Spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.card,
    },
    demoTitle: {
        marginBottom: Spacing.xs,
        color: Colors.textMuted,
    },
    demoLine: {
        color: Colors.textSecondary,
        marginTop: 2,
    },
    link: { alignItems: 'center', marginTop: Spacing.xl },
});
