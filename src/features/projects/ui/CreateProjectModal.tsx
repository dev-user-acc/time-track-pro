import React, { memo, useState, useCallback } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, BorderRadius, Typography } from '../../../shared/theme';
import { NeonButton, Input } from '../../../shared/ui';
import { useCreateProject } from '../model/useProjects';

const COLOR_OPTIONS = Colors.projectColors as unknown as string[];

interface CreateProjectModalProps {
    visible: boolean;
    onClose: () => void;
}

export const CreateProjectModal = memo<CreateProjectModalProps>(
    ({ visible, onClose }) => {
        const [name, setName] = useState('');
        const [description, setDescription] = useState('');
        const [color, setColor] = useState(COLOR_OPTIONS[0]);
        const [error, setError] = useState('');

        const { mutate: createProject, isPending } = useCreateProject();

        const handleCreate = useCallback(() => {
            if (!name.trim()) {
                setError('Введите название проекта');
                return;
            }
            setError('');
            createProject(
                { name: name.trim(), description: description.trim(), color },
                {
                    onSuccess: () => {
                        setName('');
                        setDescription('');
                        setColor(COLOR_OPTIONS[0]);
                        onClose();
                    },
                }
            );
        }, [name, description, color, createProject, onClose]);

        return (
            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={onClose}
            >
                <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.overlay}
                >
                    <View style={styles.modal}>
                        <View style={styles.header}>
                            <Text style={Typography.h3}>Новый проект</Text>
                            <TouchableOpacity onPress={onClose} hitSlop={12}>
                                <Text style={styles.close}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Input
                                label="Название проекта"
                                value={name}
                                onChangeText={setName}
                                placeholder="Например: Мобильное приложение"
                                error={error}
                                autoFocus
                            />
                            <Input
                                label="Описание (необязательно)"
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Кратко о проекте"
                                multiline
                                numberOfLines={3}
                            />
                            <Text style={[Typography.label, styles.colorLabel]}>Цвет</Text>
                            <View style={styles.colorRow}>
                                {COLOR_OPTIONS.map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => setColor(c)}
                                        style={[
                                            styles.colorDot,
                                            { backgroundColor: c },
                                            color === c && styles.colorSelected,
                                        ]}
                                    />
                                ))}
                            </View>
                            <NeonButton
                                onPress={handleCreate}
                                label="Создать проект"
                                loading={isPending}
                                fullWidth
                                style={styles.btn}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        );
    }
);

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        borderTopWidth: 1,
        borderColor: Colors.cardBorder,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    close: {
        color: Colors.textMuted,
        fontSize: 18,
    },
    colorLabel: {
        marginBottom: Spacing.sm,
    },
    colorRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    colorDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    colorSelected: {
        borderWidth: 3,
        borderColor: Colors.white,
    },
    btn: {
        marginTop: Spacing.sm,
    },
});
