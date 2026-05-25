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
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../shared/theme';
import { NeonButton, Input } from '../../shared/ui';
import { useRegister } from '../../features/auth/model/useAuth';
import type { AuthStackParamList } from '../../app/navigation/types';
import type { UserRole } from '../../entities/user/model/types';

type Nav = StackNavigationProp<AuthStackParamList, 'Register'>;

interface RoleOption {
    role: UserRole;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
    {
        role: 'employee',
        label: 'Сотрудник',
        icon: 'person-outline',
        color: Colors.neonBlue,
        description: 'Трекинг времени,\nличные отчёты',
    },
    {
        role: 'manager',
        label: 'Менеджер',
        icon: 'people-outline',
        color: Colors.neonOrange,
        description: 'Управление проектами\nи командой',
    },
    {
        role: 'admin',
        label: 'Администратор',
        icon: 'shield-checkmark-outline',
        color: Colors.neonPink,
        description: 'Полный доступ\nко всем функциям',
    },
];

const RoleCard = memo<{
    option: RoleOption;
    selected: boolean;
    onSelect: (role: UserRole) => void;
}>(({ option, selected, onSelect }) => (
    <TouchableOpacity
        onPress={() => onSelect(option.role)}
        style={[
            styles.roleCard,
            selected && { borderColor: option.color, backgroundColor: option.color + '18' },
        ]}
        activeOpacity={0.8}
    >
        <View style={[styles.roleIconCircle, { backgroundColor: option.color + (selected ? '30' : '15') }]}>
            <Ionicons name={option.icon} size={22} color={option.color} />
        </View>
        <Text style={[styles.roleLabel, selected && { color: option.color }]}>{option.label}</Text>
        <Text style={styles.roleDesc}>{option.description}</Text>
        {selected && (
            <View style={[styles.roleTick, { backgroundColor: option.color }]}>
                <Ionicons name="checkmark" size={10} color="#000" />
            </View>
        )}
    </TouchableOpacity>
));

export const RegisterScreen = memo(() => {
    const navigation = useNavigation<Nav>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [role, setRole] = useState<UserRole>('employee');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const { mutate: register, isPending } = useRegister();

    const validate = useCallback((): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Введите имя';
        if (!email.trim()) errs.email = 'Введите email';
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Введите корректный email';
        if (password.length < 6) errs.password = 'Минимум 6 символов';
        if (password !== confirm) errs.confirm = 'Пароли не совпадают';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [name, email, password, confirm]);

    const handleRegister = useCallback(() => {
        if (!validate()) return;
        register(
            { name: name.trim(), email: email.trim().toLowerCase(), password, role },
            {
                onError: (err) => Alert.alert('Ошибка регистрации', err.message),
            }
        );
    }, [name, email, password, role, validate, register]);

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
                    <View style={styles.header}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.back}
                            hitSlop={12}
                        >
                            <Text style={{ color: Colors.neonBlue, fontSize: 16 }}>← Назад</Text>
                        </TouchableOpacity>
                        <Text style={Typography.h2}>Создать аккаунт</Text>
                        <Text style={[Typography.bodySmall, styles.subtitle]}>
                            Начните работать в TimeTrack Pro
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <Input
                            label="Имя"
                            value={name}
                            onChangeText={setName}
                            placeholder="Иван Иванов"
                            autoCapitalize="words"
                            error={errors.name}
                        />
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
                            placeholder="Минимум 6 символов"
                            secureTextEntry
                            error={errors.password}
                        />
                        <Input
                            label="Подтвердите пароль"
                            value={confirm}
                            onChangeText={setConfirm}
                            placeholder="Повторите пароль"
                            secureTextEntry
                            error={errors.confirm}
                        />

                        {/* Role selector */}
                        <View style={styles.roleSection}>
                            <Text style={styles.roleTitle}>Выберите роль</Text>
                            <View style={styles.roleGrid}>
                                {ROLE_OPTIONS.map((opt) => (
                                    <RoleCard
                                        key={opt.role}
                                        option={opt}
                                        selected={role === opt.role}
                                        onSelect={setRole}
                                    />
                                ))}
                            </View>
                        </View>

                        <NeonButton
                            onPress={handleRegister}
                            label="Зарегистрироваться"
                            loading={isPending}
                            fullWidth
                            style={styles.btn}
                        />
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Login')}
                            style={styles.link}
                        >
                            <Text style={Typography.label}>
                                Уже есть аккаунт?{' '}
                                <Text style={{ color: Colors.neonBlue, fontWeight: '700' }}>
                                    Войти
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
        padding: Spacing.xl,
        paddingTop: Spacing.xl,
    },
    header: {
        marginBottom: Spacing.xxl,
    },
    back: { marginBottom: Spacing.xl },
    subtitle: { marginTop: Spacing.xs },
    form: {},
    roleSection: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    roleTitle: {
        ...Typography.label,
        marginBottom: Spacing.sm,
    },
    roleGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    roleCard: {
        flex: 1,
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.card,
        position: 'relative',
    },
    roleIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    roleLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },
    roleDesc: {
        fontSize: 10,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 14,
    },
    roleTick: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btn: { marginTop: Spacing.sm },
    link: { alignItems: 'center', marginTop: Spacing.xl },
});
